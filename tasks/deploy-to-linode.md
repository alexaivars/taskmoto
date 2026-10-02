# Deploy Taskmoto to Linode

Status: complete — verified on 2026-10-02. See [verification results](../docs/verification/linode-deployment.md).

## Objective

Deploy the current Taskmoto app to one Linode Linux machine using Docker Compose and the public domain configured in `.env.deploy`. The canonical production URL is `https://${DEPLOY_DOMAIN}`. Deployment is initiated manually from the developer's local machine over SSH. Keep recurring costs low and accept brief downtime during deployment.

The app is still in progress. This task does not require high availability, zero-downtime deployment, a backup/snapshot workflow, GitHub Actions, a rollback mechanism, or a custom Remix prebuild pipeline. Recover from a failed release by fixing the problem and manually deploying a corrected release (roll forward). GitHub Actions can be added later around the same deployment procedure.

## Deployment target and access

SSH access from the developer's local machine is authorized. Use the SSH username configured in `.env.deploy`, existing local SSH credentials, and verify the server identity.

Keep deployment-specific values in the root `.env.deploy`, which is ignored by Git. The committed `.env.deploy.example` documents the required variables with placeholders:

- `DEPLOY_DOMAIN`: public hostname, without a scheme or path.
- `DEPLOY_SSH_HOST`, `DEPLOY_SSH_USER`, and `DEPLOY_SSH_PORT`: SSH connection settings.
- `LINODE_INSTANCE_ID`: optional instance identity used to confirm the target through the Linode CLI.

Use `/srv/taskmoto` as the default persistent deployment path; an environment override is not required for the initial deployment. The actual configuration should contain no empty placeholder assignments.

Reconfirm the target address with `linode-cli linodes list --json` before implementation. Point the configured domain to the selected instance's public IP. CLI discovery confirms the instance address, not successful SSH authentication or current DNS configuration. Do not put actual domain, IP, account, or server-specific values in committed deployment files or verification reports.

## Required result

- Docker Compose runs the Remix web app, Fastify GraphQL API, Redis, and Caddy on one machine.
- Caddy serves `https://${DEPLOY_DOMAIN}` and proxies to the web app. The web app reaches the API, and the API reaches Redis, over the internal Docker network.
- Only HTTP/HTTPS and the required SSH access are exposed publicly. API and Redis ports are not published to the internet.
- Expose the deployment health check at `https://${DEPLOY_DOMAIN}/health`. It must return HTTP 200 only when the web app can reach the API and the API can reach Redis, and return HTTP 503 when those dependencies are unavailable. Return a minimal response without secrets or internal connection details.
- A documented command or script deploys a selected committed Git revision from the local machine; pushing it to GitHub is not required. Uncommitted IDE changes must not enter the release. No push, webhook, schedule, or CI event deploys automatically.
- Redis data lives on persistent disk outside the container lifecycle and survives app deployment, container replacement, and server reboot.

## Flow from local development to success

1. Commit the intended changes and invoke `deploy <revision>` locally. Resolve the revision to a full SHA and create an isolated source tree for that commit. Keep local deployment configuration separate from the source tree.
2. Validate configuration and local tooling, run build/type checks and automated tests for the selected revision, and build Linux AMD64 web/API images. Failures stop before changing the server.
3. Connect through SSH with server identity verification. Inspect resources, public DNS, current services, and persistent state. Reject the wrong target, incompatible setup, or insufficient disk before activation; do not resize the machine automatically.
4. Acquire the server deployment lock before remote mutations. Run missing setup safely, upload/load the commit-tagged images, and prepare validated configuration. Leave the current endpoint running during preparation.
5. For a fresh installation, create empty Redis storage and signing keys once. Start Redis and verify the new web/API containers internally. On the first transition, stop and disable the host Caddy/health services only after those checks pass, then start container Caddy. For later deployments, preserve Redis storage, keys, and certificate state and update the app containers.
6. Verify HTTPS and `/health` with bounded retries/timeouts. Record the deployed SHA only after readiness passes. On failure, exit unsuccessfully with the failed stage and relevant logs; retain state so the same command can safely resume or deploy a corrected commit. No automatic rollback occurs.
7. For initial acceptance, run the full browser and persistence checks below. Routine deploys finish after automated checks and readiness; repeat browser checks when changes affect authentication, passkeys, forms, or other tested behavior.

The implementation must resolve temporary transfer-file cleanup, image retention, command timeouts, and configuration defaults without introducing new required blank environment entries. Ensure tests and image builds consume the same generated GraphQL contract and committed source revision.

## Implementation work

### Package and run the app

- Add Dockerfiles and a Compose configuration suited to this Yarn workspace. Use a compatible, pinned Node version and the committed lockfile.
- Build/install dependencies in Linux, rather than copying macOS `node_modules`. Preserve workspace dependencies and generate the GraphQL contract during image preparation.
- Build web/API images on the local machine with an explicit `linux/amd64` target for the existing x86_64 Linode, even when local Docker runs ARM64. The resulting containers run natively on the server. Verify target-platform compatibility before deployment.
- Exclude local environments, development certificates, credentials, and unrelated artifacts from the build context.
- Use production start commands, `NODE_ENV=production`, and container bindings to `0.0.0.0`. Configure internal ports and service URLs explicitly.
- Retain Remix's supported asset server with development watching disabled and production minification enabled. A separate browser prebuild/exporter is outside this task.
- Set restart policies and service readiness checks, including Redis readiness before API startup. Verify web-to-API connectivity and graceful shutdown. Implement the public `/health` route through the web app and an internal API readiness check that verifies Redis connectivity.

### Configure the machine and domain

- Install Docker Engine and Compose on the Linode and document the required host setup and SSH deployment access.
- Transition the existing host Caddy and Python `health-endpoint.service` to Compose-managed Caddy and the application's `/health` route. Save their configuration and inventory existing certificate state before changing services. Prepare and validate the containers before stopping and disabling the two host services, then start container Caddy on ports 80/443. Preserve or deliberately reprovision certificate state without deleting existing certificates. Brief downtime is acceptable. Confirm the old services stay disabled after reboot and the health response comes from the app's readiness checks.
- Point `DEPLOY_DOMAIN` to the Linode's public IP and configure Caddy's HTTPS proxy using that value. Only add an IPv6 DNS record if IPv6 is configured and reachable on the machine. Persist Caddy's certificate state across container replacement.
- Inspect current DNS before making changes; the current domain's apex A record already points to the intended server. Verify public resolution during preflight and preserve unrelated mail, TXT, and subdomain records. Future domain changes must be validated before replacing the running configuration.
- Provision production environment values and JWT signing keys outside Git and images. Reuse the keys across deployments.
- Derive `WEB_ORIGIN` as `https://${DEPLOY_DOMAIN}`. Use that origin for passkeys and secure session cookies; the passkey relying-party ID is the configured hostname. Do not reuse local development TLS certificates. Changing the domain requires updating DNS, Caddy, and the API origin together; existing passkeys remain tied to the previous hostname and must be registered again on the new domain.
- Stay within the existing Linode's resource allocation and cost; do not resize it or provision additional paid services. Record memory use during startup, normal requests, and deployment, and check existing swap and available disk. Keep builds local and bound retained image/release storage so repeated deployments do not fill the disk. If the app cannot operate within these limits, report the blocker and investigate configuration or application improvements within the same machine. Do not promise that 1 GB is sufficient without measurement.

### Preserve Redis data on disk

- Mount Redis's `/data` directory on a named volume or host directory with a stable identity across releases. Explicitly configure that identity so changing release directories cannot create a new, empty Redis store.
- Enable Redis append-only persistence with `appendfsync everysec`. Document that this provides persistence with a small crash-loss window, rather than a guarantee of zero data loss.
- Keep Redis running during routine web/API updates where possible. App deployment must not remove or recreate its persistent storage.
- Separate backups, predeployment snapshots, retention, and restore testing are deferred. Persistent storage protects data through container replacement and reboot; it does not protect against loss of the server disk or application deletion of records.
- Never run `docker compose down -v`, volume pruning, or equivalent storage deletion as part of deployment or cleanup. Document this explicitly.

### Make deployment repeatable

- Provide a local script or a short, exact command sequence that selects a commit, prepares the release, connects over SSH, and updates the app containers while retaining Redis storage.
- Expose one entry point, `deploy <revision>`, that detects whether setup is needed and performs it automatically. Inspect installed Docker/Compose, persistent directories/volumes, signing keys, and service state rather than relying only on a setup marker. Repeated setup must not regenerate keys, clear data, or undo valid existing configuration. Report incompatible or unexpected state clearly instead of overwriting it.
- Acquire a server-side deployment lock before changing any host or release state and hold it through setup, activation, and health verification. If another deployment holds the lock, exit immediately with a clear message. Release the lock when the process exits, including failures, so an interrupted run does not leave a permanent stale lock.
- On the first deployment, prepare and validate images, configuration, Redis readiness, and web/API connectivity before stopping the existing host Caddy and health services. Track the transition so a later run can resume a partial setup and roll forward without deleting persistent state.
- Resolve the selected revision to a full commit SHA and prepare an isolated build context from that committed tree. Include no untracked or modified working-tree files. Use the same revision for tests, image builds, and release identification, and do not reset or discard the developer's working changes.
- Load and validate `.env.deploy` before deployment. Fail clearly on missing required values. Derive the public origin and health-check URL from `DEPLOY_DOMAIN` rather than duplicating them in configuration. The local deployment file must not be baked into images or served publicly.
- Tag locally built Linux AMD64 web/API images with the selected Git commit. Transfer them directly over SSH using `docker save` and remote `docker load`, with transfer/load failures stopping deployment. No container registry is required. Keep the existing app running until the images are loaded successfully. Pull pinned Redis and Caddy images on the server as needed.
- Treat first deployment separately: provision new persistent storage and signing keys once and start with an empty Redis database. Do not import local accounts, entries, or passkeys. Verify with a newly created test account. If storage already contains data, stop and report it rather than clearing it. Subsequent deployments must use the original storage and keys.
- Keep secrets, Redis data, and Caddy state outside disposable release artifacts.
- Run build/type checks and existing automated tests for the selected revision before every deployment. Check `https://${DEPLOY_DOMAIN}/health` after restart with bounded retries and timeouts. Require full browser testing for initial acceptance and later changes affecting those user flows, rather than blocking every routine deployment on browser interaction. Report failures clearly; a failed health check must make the deployment command exit unsuccessfully.
- Document how to restart services, inspect logs, and deploy a corrected release after a failure. Recovery uses roll forward; deployment must preserve Redis storage even when the app release fails. Data-format changes may need a separate data recovery procedure.

## When this task is complete

Completion requires a deployment on the actual Linode, not only configuration files or a local Compose run.

- [x] Dockerfiles, Compose configuration, manual deployment procedure, environment example, and operating instructions are in the repository, with no secrets committed.
- [x] Deployment reads the target and domain from the ignored `.env.deploy`; committed configuration uses variables or placeholders, with no hardcoded deployment-specific values.
- [x] The single deploy command safely detects/runs missing setup, handles the first host-service transition, rejects overlapping deployments, and can resume after an interrupted attempt without replacing keys or storage.
- [x] Tests and deployed images come from the exact selected committed revision. Uncommitted local changes are excluded and preserved. Failures in checks, builds, transfer, setup, or readiness produce a nonzero exit and a clear diagnostic.
- [x] The selected release runs on Linode and is reachable at `https://${DEPLOY_DOMAIN}` with valid HTTPS.
- [x] `https://${DEPLOY_DOMAIN}/health` returns HTTP 200 with healthy web/API/Redis services. API or Redis unavailability produces HTTP 503 within a bounded timeout, and the deployment command reports failure when the health check does not pass.
- [x] Account creation, password login, work-entry creation/deletion, and logout work through the deployed UI. Passkey registration/login is verified on the production domain with a compatible browser.
- [x] API and Redis are reachable internally and are not exposed through public container ports.
- [x] A test account and work entry survive a second manual deployment and replacement of the web/API containers.
- [x] The same records survive Redis container recreation with the original persistent mount and a Linode reboot.
- [x] The manual procedure can deploy a corrected release after a failed app startup, with the original Redis test records intact. Reverting to an earlier image is not required.
- [x] Startup/deployment memory and disk observations are recorded, alongside any known limitations. The app runs within the existing Linode allocation without a resize or additional paid services.
- [x] Deployment is manual only. GitHub Actions and automatic deployment remain deferred.

Record the deployed commit, verification date, and results in the deployment documentation. Stop short of claiming completion if server access, DNS, or required production configuration prevents actual verification.
