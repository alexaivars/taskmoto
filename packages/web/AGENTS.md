# Taskmoto web

Use the bundled Remix 3 skill at `.agents/skills/remix/SKILL.md` and the installed `remix/INDEX.md` before using unfamiliar APIs. This is Remix 3's own component runtime, not React or Remix 2.

Keep domain rules, authentication and authorization in the separate GraphQL API. Web controllers adapt native forms and render results from that API. Browser modules belong in `app/**/public/`.

Run schema synchronization and type checks from the workspace root with `yarn build`. Run `yarn dev` from the root for automatic schema synchronization and both servers.
