# Defining Taskmoto as a work log and time-reporting app

**Status:** Accepted  
**Date:** 2026-10-02

## Context

Taskmoto needs a clear product purpose to guide product and technical decisions. “Work log and time reporting” leaves open who the app serves, how people use it, and what kind of work it should support.

## Decision

Taskmoto is a work log and time-reporting app for individuals. It gives each user a private record of time spent on work and lets them review or communicate that recorded time.

The app should be quick and unobtrusive. The UI and API are both first-class ways to use it, including by agents acting with a user's authorization. Users' work logs and reports are private to their account.

This defines the product direction without committing to a particular way of capturing time or a specific reporting format. Taskmoto is focused on logging and reporting work time, rather than broader work management or employee monitoring.

## Why

This gives the product a clear job: help individuals keep and use a record of their work time without getting in their way. Supporting both direct UI use and authorized API use lets people work in the way that suits them, including with agents, while keeping their records private.

## Costs we accept

Privacy and authorized agent access are part of the product promise. The product must protect account-specific work records and ensure an agent can act only with the user's authorization. Keeping the app focused also means that broader work-management and monitoring needs may not be served by Taskmoto.

## Revisit when

Reconsider this decision if Taskmoto's primary audience changes from individuals, if its central purpose moves beyond work-time logging and reporting, or if the UI/API and account privacy expectations change substantially.
