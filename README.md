# Taskmoto

A private work-log and time-reporting app with a separate, client-agnostic GraphQL API.

## Stack

- **API:** Fastify, Mercurius and a TypeScript-authored Pothos schema.
- **Web:** Remix 3's own component runtime and native forms. Web controllers call the same GraphQL API available to other clients; domain rules and authorization stay in the API.
- **Storage:** Redis, intentionally exploring key-based modeling. Existing account and entry keys remain compatible.
- **Contract:** `@taskmoto/graphql` shares operation definitions and inferred result/variable types through gql.tada. Pothos introspection is synchronized automatically on installation, before development/build/test, and when schema imports change during development. No GraphQL Code Generator or running API is needed to derive the contract.

The reasoning lives in [architecture decisions](docs/decisions/README.md).

## Prerequisites

Node.js **24.3 or later**, Yarn classic, and Redis. The web framework is pinned to Remix **3.0.0-rc.5**; this is the new Remix 3 runtime, not React-based Remix 2.

## Local setup

```sh
yarn install
yarn setup
# macOS may ask to allow trust installation in your login keychain
```

Setup generates a development CA, localhost HTTPS certificate, and JWT signing keys under the ignored `scripts/certs/` directory. It configures only the API and web `.env` files using file references, retains unrelated settings, and reuses existing keys. Certificates nearing expiry are renewed with the same CA and TLS key. An expired CA certificate or legacy CA missing the required CA extensions is reissued using its existing key, with the previous certificate saved as `scripts/certs/RootCA.previous.pem`. Setup trusts the current CA in your macOS login keychain by default. Repeated runs do not duplicate environment assignments. Use `yarn setup --no-trust` for CI or to manage trust manually; `--trust` remains supported. Setup does not delete existing keychain certificates.

OpenSSL is required. On other platforms, import `scripts/certs/RootCA.crt` into your browser or operating system trust store manually.

Start Redis using your local service, then:

```sh
yarn dev
```

Open `https://localhost:3000`, create an account and log work. The API listens on `https://localhost:8443/graphql`. Setup respects `API_PORT` in the API `.env` and `WEB_PORT` in the web `.env` when writing `API_URL` and `WEB_ORIGIN`; rerun setup after changing these ports. Existing `REDIS_URL` settings are retained, with `redis://127.0.0.1:6379` as the default.

The API and web support `SSL_PRIVATE_KEY_FILE` and `SSL_CERTIFICATE_FILE`, as well as existing inline PEM values. JWT signing keys can also be supplied through `JWT_ACCESS_TOKEN_SECRET_FILE` and `JWT_ACCESS_TOKEN_PUBLIC_FILE` or their inline equivalents. The dev launcher loads `NODE_EXTRA_CA_CERTS` before starting each server so Node trusts the local CA; TLS verification stays enabled. The web package accepts `API_URL` or the existing `API_HOST` setting.

For plain HTTP development, remove the TLS settings from both package environments, use `http://localhost:3000` for `WEB_ORIGIN`, and set the web `API_URL` to `http://localhost:8443/graphql`.

In production, set `NODE_ENV=production`, `WEB_ORIGIN` to the public HTTPS origin, persistent Redis storage, and provision the JWT keys. Cookies are secure, HTTP-only and same-site; use HTTPS directly or terminate TLS at a trusted reverse proxy. No signing key is needed in the web process.

## Verification

```sh
yarn build
yarn test
yarn workspace @taskmoto/doc build-storybook
```

`build` synchronizes the schema, validates all shared client operations and checks API/web TypeScript. Remix compiles browser assets on demand; its production server does not require a Next.js-style bundle. Run the API and web production scripts in their respective workspaces with the corresponding environment configured.

`yarn test:setup` covers fresh setup, repeat-run preservation, legacy CA repair and HTTPS certificate renewal in temporary directories. These checks are included in `yarn test` and never modify your keychain.

API tests start a disposable Redis instance on a temporary socket, use temporary signing keys, and exercise account creation, login, entry persistence, private account isolation, validation, refresh rotation and logout revocation. They never clear or connect to your application's Redis data.

The documentation workspace retains the original React component stories as reference material, using Storybook's React/Vite integration. Those components are not used by the Remix application.

## Passkeys

On the signup page, enter a username and choose **Create account with a passkey** to create an account without a password. On the login page, **Log in with a passkey** lets your device select a saved credential. Existing password accounts can choose **Add a passkey** after logging in; password login remains available.

Passkeys require a browser with WebAuthn support and a secure origin. Local development uses `https://localhost:3000`. In production, set `WEB_ORIGIN` to the exact public HTTPS origin; its hostname is the WebAuthn relying-party ID. Credentials are tied to that hostname, so localhost passkeys do not work on a production domain. Your device or password manager stores the private key; Redis stores the credential ID, public key, and signature counter. Keep Redis persistent. A passwordless account requires access to its saved passkey; account recovery is not implemented.

The API owns the WebAuthn exchange through JSON POST endpoints `/passkeys/registration/options`, `/passkeys/registration/verify`, `/passkeys/authentication/options`, and `/passkeys/authentication/verify`. Options set a secure, HTTP-only challenge cookie with a five-minute lifetime; verification consumes it once. Registration options accept `{ "username": "your-name" }` for signup, or `{ "enroll": true }` with an authenticated session to add a credential. Verification accepts the browser's WebAuthn response. Clients preserve the challenge/session cookies and send the configured `WEB_ORIGIN` as their `Origin` header. The web app proxies these endpoints on its own origin. Successful verification issues the same access/refresh session cookies as password login.

## Session migration

Accounts, password hashes and work entries keep their existing Redis representation. Existing browser sessions should log in again: sessions now validate stored refresh tokens, pin signing algorithms and revoke access on logout. Successful login also clears cookies on the old `/graphql` path.

## Agent/API clients

Send GraphQL JSON requests directly to the API. `signup` and `login` return the user and set session cookies; clients can maintain a cookie jar. A signed access token from login may also be sent as `Authorization: Bearer ...`. Access expires after five minutes; cookie-based clients can refresh using their seven-day refresh session. Authorization and account scoping are enforced by the API for every client.
