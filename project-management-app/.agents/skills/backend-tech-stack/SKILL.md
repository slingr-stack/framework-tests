---
name: backend-tech-stack
description: Use when implementing or troubleshooting Drumr backend code that depends on framework tech stack conventions, including API, datasource, validation, authorization, workflows, logging, and test tooling guidance.
user-invocable: true
metadata:
  applies-to:
    - core/backend/src/app/
    - core/backend/src/config/
    - core/backend/src/logging/
---

# Backend tech stack

## Purpose

This document maps the backend technologies running under the hood of the framework so AI assistants can provide more accurate troubleshooting guidance, error interpretation, and app-level code suggestions.

The framework encapsulates initialization and runtime wiring for these tools. App developers should use framework abstractions and wrappers (for example, injected logger and framework data access/action patterns) instead of importing and configuring these libraries directly.

## Stack overview (under the hood)

- Language:
  - TypeScript: Primary language for backend app and framework code, enabling strong typing and safer refactoring.
  - Node.js: Runtime that executes backend services, actions, GraphQL resolvers, and workflow operations.
- API Layer:
  - Express: HTTP transport layer used internally by the framework to host backend endpoints.
  - GraphQL: Core API contract exposed to clients for queries, mutations, and typed responses.
  - Apollo Server: GraphQL execution engine used under the hood for request handling and error formatting.
  - Pothos GraphQL: Primary schema-construction library used by the framework to compose GraphQL types and operations.
- Data Layer:
  - PostgreSQL: Primary relational database target for robust transactional workloads.
  - MySQL: Alternative relational database target supported by framework datasource abstractions.
  - TypeORM: ORM and query abstraction used by framework datasources, repositories, and transactions.
- Utilities:
  - class-validator: Declarative validation engine used for model/parameter constraints and validation errors.
  - class-transformer: Serialization/deserialization utility used to convert plain payloads to typed instances.
  - financial-number: Precision-safe arithmetic utility for monetary calculations.
  - CASL: Authorization engine used to evaluate role, field, and conditional permissions.
  - DBOS: Durable workflow engine used for resilient, step-based, recoverable backend workflows.
  - Winston: Structured logging engine used internally by the framework logging subsystem.
- Testing:
  - Jest: Primary backend test runner for unit and integration tests.
  - Faker: Test data generation utility for realistic fixtures and seeded sample datasets.

## AI assistant troubleshooting guide

- If you see validation failures in action params or model payloads, inspect class-validator rules and custom validation hooks first.
- If data appears malformed or fields are missing after conversion, inspect class-transformer usage and serialization boundaries.
- If GraphQL behavior looks schema-related (missing fields, type mismatches, union resolution issues), trace the issue through Pothos schema generation paths.
- If access is denied unexpectedly or field visibility differs by user, inspect CASL permissions, role rules, and condition filters.
- If money totals are off or rounding looks inconsistent, recommend financial-number (or the framework Money abstraction) instead of raw floating-point math.
- If workflow execution is stuck, duplicated, or resumed after failures, inspect DBOS workflow state, step idempotency, and retry semantics.
- If persistence errors occur, map them to TypeORM query/entity behavior and verify compatibility with PostgreSQL/MySQL expectations.
- If logging output is missing or inconsistent, use the framework logger abstraction and dependency injection patterns instead of importing Winston directly.
- If framework startup/runtime internals are involved, avoid suggesting direct Express/Apollo/TypeORM/Winston initialization in app code; keep recommendations at the framework abstraction layer.

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| [backend-config](../backend-config/SKILL.md) | If you need to structure `config/config.json`, use env-var interpolation, read custom config properties, or override config in tests. | This skill names the tech stack but does not document ConfigService patterns or config file structure. |
| [backend-app](../backend-app/SKILL.md) | If you need concrete backend app bootstrap, `@App()` lifecycle hooks, `ConfigService`, `App.resolve`, service overrides, or `app.run` configuration patterns. | This skill is a stack overview and does not provide full app entry-point implementation guidance. |
| [backend-api](../backend-api/SKILL.md) | If you need concrete GraphQL exposure, CRUD API behavior, or endpoint contract implementation. | This skill lists technologies but does not provide API implementation workflows. |
| [backend-auth](../backend-auth/SKILL.md) | If you must implement practical authorization rules and permission definitions. | This skill references auth libraries, not full permission coding patterns. |
| [backend-logging](../backend-logging/SKILL.md) | If you need practical guidance on log levels, structured metadata, contextual identifiers, and sensitive-data-safe logging patterns. | This skill references Winston/framework logging at a stack level; the backend-logging skill provides the concrete implementation patterns, examples, and configuration guidance. |
| [backend-queues](../backend-queues/SKILL.md) | If you need concrete queue decorators, workflow actions, and durable execution configuration. | This skill names queue-related tech but omits queue implementation patterns. |
| [backend-datasources](../backend-datasources/SKILL.md) | If datasource code must be implemented with concrete decorators and query APIs. | This skill is stack-overview oriented and not a datasource coding guide. |
