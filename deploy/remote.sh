set -Eeuo pipefail
umask 077
revision=$1
domain=$2
archive_bytes=$3
root=/srv/taskmoto
stage=preflight
incoming=''
release=''
compose() { docker compose --env-file "$release/.env" -f "$release/compose.yml" "$@"; }
failed() {
  result=$?
  if [ "$result" -ne 0 ]; then
    echo "Deployment failed at stage: $stage. Persistent storage and keys have been retained." >&2
    if [ -n "$release" ] && command -v docker >/dev/null && [ -f "$release/.env" ]; then
      compose ps >&2 || true
      compose logs --tail 25 api web caddy >&2 || true
    fi
  fi
  if [ -n "$incoming" ]; then rm -rf -- "$incoming"; fi
  exit "$result"
}
trap failed EXIT
trap 'exit 130' INT TERM HUP
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] && [[ "$domain" =~ ^[a-z0-9.-]+$ ]] && [[ "$archive_bytes" =~ ^[0-9]+$ ]]
[ "$(id -u)" = 0 ] || { echo 'Initial setup requires the configured root SSH login.' >&2; exit 1; }
[ "$(uname -m)" = x86_64 ]
. /etc/os-release
[ "$ID" = ubuntu ] && [ "$VERSION_ID" = 24.04 ] || { echo 'Expected Ubuntu 24.04; refusing incompatible automatic setup.' >&2; exit 1; }
available=$(df -B1 --output=avail / | tail -1 | tr -d ' ')
[ "$available" -gt "$((archive_bytes * 4 + 2147483648))" ] || { echo 'Insufficient disk for transfer, image extraction, and reserve.' >&2; exit 1; }
echo 'Preflight resources:'
free -m
df -h /
mkdir -p "$root/releases"
incoming=$(mktemp -d "$root/incoming.XXXXXX")
stage=transfer
timeout 600 tar -xf - -C "$incoming"
for file in images.tar.gz compose.yml Caddyfile; do [ -s "$incoming/$file" ]; done
stage=setup
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  echo 'Installing Docker and Compose from the Ubuntu repositories.'
  export DEBIAN_FRONTEND=noninteractive
  timeout 300 apt-get update </dev/null
  timeout 300 apt-get install -y --no-install-recommends docker.io docker-compose-v2 openssl curl </dev/null
fi
systemctl enable --now docker
docker info >/dev/null
docker compose version

stage=load-images
timeout 300 bash -o pipefail -c 'gzip -dc "$1" | docker load' -- "$incoming/images.tar.gz"
for service in api web; do
  [ "$(docker image inspect "taskmoto-$service:$revision" --format '{{.Os}}/{{.Architecture}}')" = linux/amd64 ]
  [ "$(docker image inspect "taskmoto-$service:$revision" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')" = "$revision" ]
done
release="$root/releases/$revision"
mkdir -p "$release"
cp "$incoming/compose.yml" "$incoming/Caddyfile" "$release/"
printf 'REVISION=%s\nDEPLOY_DOMAIN=%s\n' "$revision" "$domain" > "$release/.env"
ln -sfn "$release" "$root/candidate"
compose config --quiet
stage=persistent-state
if [ -d "$root/keys" ]; then
  [ -s "$root/keys/private.pem" ] && [ -s "$root/keys/public.pem" ] || { echo 'Incomplete signing keys; refusing to rotate existing keys.' >&2; exit 1; }
  openssl pkey -in "$root/keys/private.pem" -pubout | cmp -s - "$root/keys/public.pem"
else
  keys=$(mktemp -d "$root/new-keys.XXXXXX")
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$keys/private.pem" 2>/dev/null
  openssl pkey -in "$keys/private.pem" -pubout -out "$keys/public.pem"
  chown -R root:1000 "$keys"
  chmod 750 "$keys"
  chmod 640 "$keys/private.pem" "$keys/public.pem"
  mv "$keys" "$root/keys"
fi
timeout 300 docker compose --env-file "$release/.env" -f "$release/compose.yml" pull redis caddy
if [ -f "$root/storage-provisioned" ]; then
  docker volume inspect taskmoto_redis_data >/dev/null || { echo 'Redis volume is missing; refusing an empty replacement.' >&2; exit 1; }
else
  if docker volume inspect taskmoto_redis_data >/dev/null 2>&1; then
    docker run --rm --network none -v taskmoto_redis_data:/data redis:7.4.7-alpine sh -c 'test -z "$(ls -A /data)"' || { echo 'Existing Redis data without deployment ownership; refusing to clear it.' >&2; exit 1; }
  else
    docker volume create taskmoto_redis_data >/dev/null
  fi
  touch "$root/storage-provisioned"
fi
docker volume create taskmoto_caddy_data >/dev/null
docker volume create taskmoto_caddy_config >/dev/null
if [ ! -d "$root/host-state" ]; then
  mkdir "$root/host-state"
  if [ -f /etc/caddy/Caddyfile ]; then cp /etc/caddy/Caddyfile "$root/host-state/Caddyfile"; fi
  systemctl cat caddy health-endpoint > "$root/host-state/services.txt" 2>/dev/null || true
  if [ -d /var/lib/caddy ]; then find /var/lib/caddy -type f > "$root/host-state/certificate-inventory.txt"; fi
fi
mountpoint=$(docker volume inspect taskmoto_caddy_data --format '{{.Mountpoint}}')
if [ ! -e "$mountpoint/caddy" ] && [ -d /var/lib/caddy/.local/share/caddy ]; then
  cp -a /var/lib/caddy/.local/share/caddy "$mountpoint/caddy"
fi
stage=internal-readiness
compose run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile
compose up -d --wait --wait-timeout 150 redis api web
stage=https-transition
for service in caddy.service health-endpoint.service; do
  if systemctl cat "$service" >/dev/null 2>&1; then systemctl disable --now "$service"; fi
done
compose up -d caddy
stage=public-readiness
healthy=false
for attempt in $(seq 1 30); do
  response=$(curl --fail --silent --show-error --connect-timeout 3 --max-time 5 "https://$domain/health") && [ "$response" = '{"ok":true}' ] && { healthy=true; break; }
  sleep 2
done
[ "$healthy" = true ] || { echo 'Public HTTPS readiness did not pass within the deadline.' >&2; exit 1; }
previous=''
if [ -L "$root/current" ]; then previous=$(basename "$(readlink "$root/current")"); fi
if [ -n "$previous" ] && [ "$previous" != "$revision" ]; then ln -sfn "$root/releases/$previous" "$root/previous"; fi
ln -sfn "$release" "$root/current"
printf '%s\n' "$revision" > "$root/deployed-revision"
touch "$root/host-transition-complete"
stage=cleanup
# Remove only this application's obsolete image tags/releases. Never prune volumes.
keep_previous=''
if [ -L "$root/previous" ]; then keep_previous=$(basename "$(readlink "$root/previous")"); fi
for service in api web; do
  while read -r tag; do
    [[ "$tag" =~ ^[a-f0-9]{40}$ ]] || continue
    if [ "$tag" != "$revision" ] && [ "$tag" != "$keep_previous" ]; then docker image rm "taskmoto-$service:$tag" || true; fi
  done < <(docker image ls "taskmoto-$service" --format '{{.Tag}}')
done
for directory in "$root/releases/"*; do
  tag=$(basename "$directory")
  [[ "$tag" =~ ^[a-f0-9]{40}$ ]] || continue
  if [ "$tag" != "$revision" ] && [ "$tag" != "$keep_previous" ]; then rm -rf -- "$directory"; fi
done
echo "Deployment verified: $revision"
compose ps
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}'
free -m
df -h /
