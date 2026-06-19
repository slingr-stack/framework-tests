---
name: frontend-tech-stack
description: Use when implementing or reviewing Drumr frontend code that depends on the framework tech stack (React, Apollo Client, and Ant Design Pro), including component selection priorities and framework-aligned UI architecture decisions.
metadata:
  applies-to:
    - core/frontend/src/api/
    - core/frontend/src/components/
    - core/frontend/src/context/
    - core/frontend/src/di/
    - core/frontend/src/navigation/
    - core/frontend/src/pages/
    - core/frontend/src/decorators/
    - core/frontend/src/queryBuilder/
---

# Frontend tech stack

## Purpose

This document maps the frontend technologies used under the hood by the Drumr framework. The framework abstracts and encapsulates initialization concerns, so app developers focus on implementing views and services using internal framework conventions instead of wiring React DOM, Apollo providers, or root layout bootstrapping.

## Stack overview (under the hood)

- Language: TypeScript for strongly typed frontend development.
- UI: React as the rendering model, with a strict preference for Ant Design Pro components over base Ant Design components whenever a Pro equivalent exists.
- Data Fetching: Apollo Client with GraphQL for queries, mutations, cache coordination, and client-side data flow.

## UI preferences

- First choice: use components from `@drumr/framework-frontend` whenever an internal framework component exists.
- Second choice: use `@ant-design/pro-components` for layouts and complex UI parts when no framework component is available.
- Last choice: use `antd` only for primitive UI elements that are not available in framework or Pro components.

## Recent update note

- In frontend write-mode probes (for example, My Profile), prefer strongly typed Apollo query results (`ApolloQueryResult<Record<string, unknown>>`) instead of `any` to keep lint strictness and safer data access.

## AI assistant troubleshooting guide

- Always check `@drumr/framework-frontend` first and use an internal framework component whenever one exists for the requirement.
- If no framework component exists, prefer Ant Design Pro components (`ProForm`, `ProTable`) over standard Ant Design components.
- Treat `antd` as the last option, used only for primitive UI elements when there is no suitable framework or Ant Design Pro component.
- If there is a data fetching issue, remember we use Apollo Client.
- Verify GraphQL operation shape, variables, error handling, and data mapping before proposing UI-level workarounds.
- Do not attempt to generate bootstrapping code (like `createRoot` or `<ApolloProvider>`).
- Assume the framework handles dependency injection and routing internally.
- Keep component code focused on rendering and interaction; move frontend business logic into framework-aligned service layers when behavior grows in complexity.

### Navigation paths to associated skills

| Associated Skill | When to invoke/navigate to this skill | Why the current info is NOT enough |
| --- | --- | --- |
| [frontend-views](../frontend-views/SKILL.md) | If you need concrete view properties, routing, and implementation guidance. | This skill is a high-level stack map and not a detailed view implementation guide. |
| [frontend-api](../frontend-api/SKILL.md) | If data fetching and mutation flows must be implemented with operation builders. | This skill names libraries, but API usage patterns are documented in dedicated depth elsewhere. |
| [frontend-layout](../frontend-layout/SKILL.md) | If app shell, navigation, and menu behaviors need concrete layout code patterns. | This skill does not describe layout APIs or menu composition mechanics. |
| [frontend-notifications](../frontend-notifications/SKILL.md) | If the request is about canonical user feedback primitives (`getApp()`, message/modal/notification) rather than stack selection. | This skill explains the stack and library choices, not the detailed notification workflow and guardrails. |
