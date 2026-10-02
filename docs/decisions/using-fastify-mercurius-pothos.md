# Using a TypeScript-first GraphQL server stack

**Status:** Accepted  
**Date:** 2026-10-02

## Context

We want a strongly typed GraphQL system where the schema, server resolvers, and client operations stay connected, so changes expose mismatches during development. The current Apollo Server approach feels heavier than we need, and we do not want development or operation to depend on Apollo-hosted services.

## Decision

- Use **Fastify** as the HTTP server.
- Use **Mercurius** to serve GraphQL within Fastify.
- Use **Pothos** to author the GraphQL schema in TypeScript.

The Pothos schema is the source of truth for the GraphQL API. Keep client operations type-checked against that schema, with any schema or type synchronization handled automatically as part of the monorepo development/build workflow. Developers should not need to remember a separate manual generation step.

## Why

Pothos lets us author the schema in TypeScript and keep its definitions connected to server resolver types. This is the main reason for the direction: we want schema and resolver changes to reveal related type mismatches during development.

Fastify gives us a structured HTTP server whose validation and plugin model we want to explore. Mercurius is its direct GraphQL integration, keeping the HTTP server and GraphQL layer within one plugin model.

Reducing reliance on a large vendor's hosted services is a secondary goal. This decision avoids requiring Apollo-hosted services as part of the application or its development workflow; it is not a claim that Apollo's open-source packages require those services.

## Costs we accept

The team will learn and maintain Fastify, Mercurius, and Pothos. Each should have a clear role and make the system's type relationships easier to understand, rather than adding tools for their own sake.

Pothos means authoring the schema through a TypeScript API instead of SDL. Client operation types still need to be checked against the server schema; Pothos does not by itself provide that cross-package operation check. We accept keeping the necessary schema/type synchronization automated in the monorepo, even if that means an artifact or generation mechanism remains behind the normal workflow.

Fastify's HTTP validation and plugin conventions are benefits we want to explore, not requirements established by the product purpose.

## Revisit when

Reconsider this direction if the schema and resolver types are not meaningfully easier to keep aligned, if automatic client type synchronization becomes burdensome, or if the tools' boundaries add more complexity than clarity. Evaluate it against the product purpose in [the Taskmoto product decision](defining-taskmoto-as-worklog-and-time-reporting-app.md), and do not retain the stack solely because it has already been adopted.
