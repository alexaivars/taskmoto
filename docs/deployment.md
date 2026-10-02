# Manual Linode deployment

Taskmoto runs on one Ubuntu 24.04 x86_64 Linode using Docker Compose. The local deploy command builds Linux AMD64 images from a committed revision, tests that revision in Linux, and transfers the images over SSH. It does not require a registry, a GitHub push, or GitHub Actions. Initial Redis storage is empty; local data is not imported.

## Local prerequisites

Use Node 24.12 or compatible, Yarn classic, Git, Docker with Buildx and Linux AMD64 emulation, SSH, tar, and gzip. Install workspace dependencies with `yarn install`. If `LINODE_INSTANCE_ID` is configured, install and authenticate the Linode CLI as well.

Copy `.env.deploy.example` to `.env.deploy` and set the public hostname and SSH address. Use the existing root SSH login for automatic setup. The optional instance ID lets the command reconfirm the server address/status. The deployment root is `/srv/taskmoto`; no blank path setting is required. Do not commit `.env.deploy`.

Point the public domain's A record to the configured server address. Keep unrelated DNS records intact; omit AAAA unless the machine's IPv6 is reachable. Verify the SSH host key independently and establish a known-hosts entry before deployment. The command requires key-based, noninteractive SSH and does not bypass host-key checking.

## Deploy a committed revision

```sh
yarn deploy HEAD
# Or use another committed revision that contains the same deploy tooling:
yarn deploy <commit-sha>
```

Commit application changes first. The command archives the selected Git tree to a temporary directory; uncommitted and untracked application files are excluded without being reset or deleted. Tests, GraphQL generation, and images use that same tree. Run the command from a revision with matching deployment tooling; it rejects mismatched deploy scripts.

It verifies DNS and the server architecture, runs type checks and all automated tests inside a disposable local Linux container, and builds commit-tagged web/API images for `linux/amd64`. Cross-architecture builds on ARM Macs may take longer. Dependencies and compiler tooling are prepared locally; Remix browser assets remain compiled on demand by its production asset server.

The SSH phase acquires a nonblocking server lock. A second deployment exits unsuccessfully rather than waiting. Setup installs Docker/Compose from Ubuntu's repositories only when needed, then loads the images, validates configuration, creates signing keys and storage once, and checks internal readiness. It does not resize the machine or provision paid services.

For the first deployment, the existing host Caddy and Python health service are stopped and disabled only after the new web/API are ready. Their configuration and a certificate inventory are saved in `host-state`; existing Caddy certificate storage is copied to its Docker volume when available. Container Caddy serves the configured domain on ports 80/443. No API or Redis ports are published.

Deployment succeeds only after `https://${DEPLOY_DOMAIN}/health` returns HTTP 200 with `{"ok":true}`. API or Redis failure returns HTTP 503 without internal details. Internal requests and public checks have deadlines; a failed stage exits nonzero and prints diagnostics. Server state remains available for roll-forward recovery.

## Persistent state and resource limits

Compose's fixed project name is `taskmoto`, with fixed volumes `taskmoto_redis_data`, `taskmoto_caddy_data`, and `taskmoto_caddy_config`. Redis uses append-only persistence with `appendfsync everysec` and `noeviction`; it can lose roughly the most recent second of writes on a crash. A storage-ownership marker prevents silently recreating a missing owned Redis volume. Unexpected preexisting Redis data on first setup causes a failure instead of being cleared.

Signing keys live under `/srv/taskmoto/keys`, outside images and releases, with access granted only to root and the API container's group. Existing key pairs are checked and reused. Caddy certificates stay in the fixed volume. Changing domains requires updating `.env.deploy` and DNS, then deploying again; existing passkeys remain tied to the former hostname.

Each container has a memory limit and the Node processes have bounded heaps. Redis's configured memory budget is 64 MiB; reaching it rejects writes instead of evicting account records. The command records memory/disk observations and requires disk reserve before loading images. Only the current and previous application image/release versions are retained. No generic image/volume pruning is performed. Separate backups and snapshot restoration are deferred.

Never run `docker compose down -v`, `docker volume prune`, or remove the persistent volumes during deployment or cleanup.

## Operate or recover

On the server, use the successful release's stored environment:

```sh
cd /srv/taskmoto/current
docker compose --env-file .env -f compose.yml ps
docker compose --env-file .env -f compose.yml logs --tail 100 web api caddy
docker compose --env-file .env -f compose.yml restart web api
docker stats --no-stream
free -m
df -h /
cat /srv/taskmoto/deployed-revision
```

If activation failed, `/srv/taskmoto/candidate` identifies the attempted configuration; use it to inspect that release's logs. `current` and `deployed-revision` change only after readiness passes. The previous version is retained for diagnosis, not automatic rollback. Fix the issue, commit the correction, and rerun `yarn deploy <revision>`. Partial setup is inspected and reused, including volumes and signing keys.

An interrupted SSH session releases the lock when the remote process exits. If a deployment is still active, investigate it instead of deleting its lock file. SSH transfer, package installation, image loading, and readiness checks have bounded durations. Temporary local/remote transfer files are removed on ordinary success or failure; after a machine crash, stale `/srv/taskmoto/incoming.*` directories can be inspected and removed once no deployment is running.

## Initial acceptance

Verify the public UI in a real browser: create a password account, log work, delete an entry, log out/in, enroll a passkey, and log in with it. Also verify passkey signup with a new account. Record a persistent test entry and prove that it survives another manual deployment, web/API replacement, Redis recreation using the original volume, and a server reboot. Stop API and Redis separately to confirm the public health endpoint returns 503 promptly, then recover services and confirm the original records remain.

Exercise a failed app startup and a corrected deployment, the concurrency lock, and retry after interrupted/partial preparation. Record deployed revisions and measured resource use in `docs/verification/linode-deployment.md`. Full browser testing is required initially and for relevant behavior changes; automated tests and HTTPS readiness run on every deploy.
