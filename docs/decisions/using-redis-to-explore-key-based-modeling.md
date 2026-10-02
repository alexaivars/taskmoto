# Using Redis to explore key-based data modeling

**Status:** Accepted  
**Date:** 2026-10-02

## Context

We want to explore key-based data modeling: identifying data through keys and lookups, and making relationships between pieces of data explicit. The data store is part of that exercise because its model shapes how we design access and relationships.

## Decision

Use Redis as the primary data store, modeling data through keys, lookups, and explicit relationships.

## Why

Redis gives us a fast key-value model and makes us decide how data is identified, retrieved, and related. We want to experience those design consequences directly; the constraints are part of what we are exploring.

## Costs we accept

This choice asks us to handle relationships and consistency in application logic. We give up some guarantees and query flexibility available from relational databases, and take responsibility for understanding and operating Redis's durability characteristics.

## Revisit when

Reconsider this decision if we no longer want to explore key-based modeling, if that model makes important data needs difficult to support, or if Redis's operational and consistency costs outweigh the value of the exploration.
