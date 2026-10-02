# Stack migration verification

Verified October 2, 2026 using Node 24.12, Remix 3.0.0-rc.5, Fastify, Mercurius and Pothos.

## Automated checks

- `yarn install --offline --non-interactive`: installed workspace dependencies and synchronized the schema automatically.
- `yarn build`: synchronized Pothos introspection, validated shared GraphQL operations, and checked API/web TypeScript.
- `yarn test`: all four API integration tests passed using a disposable Redis instance and temporary RSA keys.
- `yarn workspace @taskmoto/doc build-storybook`: built the preserved React component stories with the React/Vite integration.
- `tsc --noEmit --project packages/doc/tsconfig.json`: documentation components passed TypeScript checks.
- ESLint on the changed application and tooling sources, and `git diff --check`: passed.

The API tests exercise anonymous access rejection, account creation, password login, secure cookie attributes, entry persistence across API restarts, account isolation, deletion, bearer access, refresh rotation, replay rejection, logout revocation, duplicate usernames, invalid credentials and invalid minutes/origins.

## Browser use

Chrome was driven through the actual UI against an isolated Redis instance:

1. Create an account through the signup form.
2. Log a named 30-minute work entry.
3. Confirm the entry and the 30-minute total are visible and the input form resets.
4. Log out, log back in, and confirm the entry persists.
5. Delete the entry and confirm the total returns to zero.
6. Check the browser console: no errors or warnings.

A separate Chrome context with JavaScript disabled created another account and logged a named 15-minute entry through native forms. The new record and the 15-minute total were visible. HTML responses were also checked to finish streaming normally.

Verification accounts and records were disposable. Existing application Redis data was not used or cleared. A local screenshot of the saved work log is available in `output/playwright/verified-worklog.png`; browser artifacts are ignored by Git.

## Workspace startup and web boundary

The root development launcher was also exercised against temporary keys, ports and Redis data. It synchronized the schema and started both servers successfully. HTTP checks verified signup, an invalid-minutes response with the submitted description retained, rejection of foreign origins and oversized bodies, and rejection of access to a private server source module through the asset route.

## Framework diagnostic

`remix doctor` was run. The pinned CLI checks for `node_modules/remix` inside the web package and reports a missing-install warning under Yarn workspace hoisting. The framework resolves and runs from the root installation; runtime, asset serving, type checks and browser flows passed. The diagnostic limitation is documented in the web README.
