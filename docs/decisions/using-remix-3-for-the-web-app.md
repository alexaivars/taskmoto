# Using Remix 3 for the web app

**Status:** Accepted  
**Date:** 2026-10-02

## Context

We want AI coding agents to build and maintain the web UI with clear framework guidance. Remix 3 advertises documentation and conventions designed for agent development, and we want to evaluate that promise through actual UI work. The backend must remain independent of the frontend framework and usable by other authorized clients.

## Decision

Use Remix 3 for Taskmoto's web app, replacing the current Next.js/React web package. Keep work-log rules and authorization in the separate Fastify, Mercurius, and Pothos GraphQL API. The web app uses the same API available to other authorized clients.

## Why

The primary motivation is to learn how well Remix 3's agent-oriented documentation helps an AI coding agent build and change the UI. We will look for the agent using documented patterns, preserving the API boundary, and explaining its choices without repeated corrections about the framework.

Learning Remix 3's application and UI model is a second benefit. Keeping domain rules and authorization in the API lets us explore that model while preserving a backend that serves multiple clients.

Here, agent-oriented development refers to coding agents working on the UI. Product capabilities for agents are covered by the [product decision](defining-taskmoto-as-worklog-and-time-reporting-app.md).

## Costs we accept

The team will learn a new UI and application model and rebuild the web interface around its conventions. We accept initial friction and additional framework corrections while learning. The documentation's benefit for our development workflow remains something to evaluate.

## Revisit when

Reconsider this choice if repeated UI changes still require substantial framework guidance from us, if the framework makes it difficult to preserve the API boundary, or if its model gets in the way of the product's quick and unobtrusive experience. Initial learning friction alone is not a reason to abandon the experiment, but the learning value must continue to justify the cost.
