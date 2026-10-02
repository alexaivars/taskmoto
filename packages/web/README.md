# Taskmoto web

Remix 3 renders the work-log UI and adapts native forms to the separate GraphQL API. It owns no password hashing, account authorization or Redis access.

Use the workspace root's `yarn dev` and `yarn build` to keep the schema contract synchronized. See the root README for environment configuration and verification.

- `app/routes.ts`: typed URL/method contract.
- `app/router.ts`: request boundary, form parsing and component rendering.
- `app/actions/controller.tsx`: GraphQL-backed web actions.
- `app/actions/pages.tsx`: account and work-log views.
- `app/actions/public/`: browser runtime and hydrated submit feedback.
- `app/assets.ts`: explicit public module allowlist and hoisted workspace package mount.

Native forms work without JavaScript. With the Remix runtime, links and forms use frame navigation; submit buttons show pending feedback. The UI uses shared gql.tada operations and inferred types through `@taskmoto/graphql`.

The bundled agent skill and the installed `remix/INDEX.md` describe the APIs for the pinned framework version. `remix doctor` in this release assumes a package-local `node_modules/remix`; Yarn's workspace hoisting causes a false missing-install warning. Do not rewrite the workspace layout just to silence that diagnostic.
