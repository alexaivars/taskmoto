# Linode deployment verification

Verification began on 2026-10-02 against the target configured in the ignored
`.env.deploy`. No target addresses or credentials are recorded here.

The corrected deployed application revision is
`db07af96ddfef870d277420f62c5c98927640d48`. Both application images were built
locally for Linux AMD64 from an isolated committed tree. Type checks and all
21 automated tests passed before deployment.

## Verified so far

- Automatic first setup installed Docker and Compose, preserved existing Caddy
  certificates, and disabled the old host Caddy and health endpoint services.
- Public HTTPS readiness passed after two successful manual deployments.
- Password signup/login, passwordless passkey signup, passkey enrollment/login,
  logout, and work-entry creation/deletion passed in Chrome. Passkeys were tested
  with a browser virtual authenticator; physical device UX was not tested.
- A password account and its 30-minute work entry survived app replacement and
  the second deployment.
- An isolated failure fixture, commit
  `263e8d0936ddb6d3c00acd35a2b726e73e03bf6b`, made the API exit with status 42.
  Deployment returned nonzero, retained Redis and signing keys, and kept the
  successful revision marker unchanged. Deploying the corrected revision then
  succeeded; the original entry and passkey login still worked.
- The active deployment held its server lock. A second lock acquisition returned
  status 75. The lock was available again after process exit.
- Stopping the API caused public `/health` to return 503 with `{"ok":false}` in
  0.16 seconds. Stopping Redis produced the same response in 0.04 seconds.
  Starting each service restored readiness.
- Redis container recreation retained 23 keys and the original account/entry.
  The signing-key fingerprint remained unchanged.
- A full Linode reboot retained the same records and signing keys. All four
  containers started automatically, the old host services stayed disabled, and
  public HTTPS readiness returned 200. Password and passwordless passkey login
  both passed afterward.
- An intentionally truncated transfer returned status 2 with a `transfer` stage
  diagnostic, removed its temporary directory, and left the running release
  unchanged. The server lock remained usable. A subsequent `yarn deploy HEAD`
  completed successfully, reusing the same containers, volume and keys.
- The final retry deployed the selected committed revision while this report
  remained uncommitted and intact locally. Source isolation uses `git archive`;
  `.env.deploy` is ignored and excluded from the image context.
- API and Redis containers have no published ports. The provider firewall allows
  TCP 22/80/443 and ICMP, with other inbound traffic dropped. Redis reports AOF
  enabled, `appendfsync everysec`, and `noeviction`.

## Resource observations

The existing allocation has 961 MiB usable RAM, 495 MiB swap, and a 25 GB disk.
No resize or additional paid service was used. After corrected deployment,
container memory was approximately 89 MiB API, 81 MiB web, 14 MiB Caddy, and
3.4 MiB Redis. Host available memory was 438 MiB; swap use was 36 MiB. Disk use
was 4.8 GB with 18 GB available. An earlier startup API observation reached
approximately 145 MiB. These observations cover acceptance traffic, not a load
or capacity test.

## Result

All task acceptance checks passed. Deployment remains manual, with no GitHub
Actions workflow. The deployed application revision above is unchanged by the
documentation-only completion commit.

The initial guest reboot was slow enough that a provider reboot was requested
before SSH became available again. Both boots appear in the journal. Provider
recovery completed without disk or application changes. Allow several minutes
for boot; inspect provider status/events before assuming failed recovery.

An additional second-passkey enrollment/navigation check was not performed:
automatic approval review rejected creation of another persistent credential.
The required enrollment and login checks had already passed; no physical
authenticator UX claim is made.

Redis uses AOF with `appendfsync everysec`; a crash can lose recent writes.
Backups, restore testing, automatic deployment, and rollback remain deferred.
