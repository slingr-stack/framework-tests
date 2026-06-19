<!-- AUTO-GENERATED — do not edit manually. Re-run the QA audit prompt in qa/docs/skills-audit.md to refresh. -->
# Drumr Framework Skills — QA Coverage Audit

---

## Skills Inventory

| skill | file | owner | purpose | dependencies | criticality | risk | business_impact | test_scope |
|---|---|---|---|---|---|---|---|---|
| backend-actions | `core/skills/backend-actions/SKILL.md` | backend | Teaches the EXACT structure of GlobalAction, ModelAction, and ObjectAction. Prevents hallucinating non-existent decorators like @ObjectAction or @DataModelAction. | backend-auth, backend-context, backend-datamodels, backend-datasources, backend-queues, backend-services | high | low | core-flow | e2e-testable |
| backend-api | `core/skills/backend-api/SKILL.md` | backend | Practical guide for implementing Drumr backend APIs with GraphQL CRUD exposure, typed actions, validation, and consistent expected error handling. | backend-actions, backend-auth, backend-datamodels, backend-tech-stack | high | low | core-flow | e2e-testable |
| backend-auth | `core/skills/backend-auth/SKILL.md` | backend | Teaches the EXACT structure of authentication and authorization in backend app code — AppUser, roles, permissions, and conditional rules. Prevents hallucinating generic auth libraries. | backend-actions, backend-datamodels, backend-datasources | high | low | core-flow | e2e-testable |
| backend-components | `core/skills/backend-components/SKILL.md` | backend | Teaches the EXACT UI component system — factory helpers, field-to-component mapping, context-based rendering (read/write), and configuration options. Prevents hallucinating raw Ant Design or React components. | backend-datamodels, backend-files, frontend-form-views, frontend-views | medium | low | supporting | e2e-testable |
| backend-context | `core/skills/backend-context/SKILL.md` | backend | Use when implementing backend actions, workflows, or request-scoped services that need Context. Covers Context injection, user/action/ui/workflow metadata, and stack utilities (some, none, find, parent, levels, push, pop). | backend-actions, backend-queues, backend-services | medium | medium | supporting | framework-internal |
| backend-datamodels | `core/skills/backend-datamodels/SKILL.md` | backend | Teaches the EXACT structure of data models — @DataModel, BaseDataModel, field decorators, lifecycle hooks, and validation rules. Prevents hallucinating generic ORM libraries. | backend-api, backend-components, backend-datasources, backend-files, backend-tech-stack | high | low | core-flow | e2e-testable |
| backend-datasources | `core/skills/backend-datasources/SKILL.md` | backend | Teaches the EXACT structure of data sources — @DataSource, BaseDataSource, datasource options, lifecycle hooks, and datasource injection into actions/services/workflows. Prevents hallucinating generic ORM or database connection libraries. | backend-datamodels, backend-tech-stack, cli-commands | high | high | core-flow | framework-internal |
| backend-files | `core/skills/backend-files/SKILL.md` | backend | Teaches the EXACT structure of file handling in backend app code — AppFile, file references, upload/download behavior, and storage configuration. Prevents hallucinating generic file libraries. | backend-auth, backend-components, backend-datamodels | low | medium | optional | e2e-testable |
| backend-queues | `core/skills/backend-queues/SKILL.md` | backend | Teaches the EXACT structure of workflow execution queues — @Queue, BaseQueue, QueueOptions, lifecycle hooks, and queue selection from workflow actions. Prevents hallucinating generic job-queue APIs like BullMQ, RabbitMQ, or SQS. | backend-actions, backend-context, backend-services, backend-tech-stack | low | high | optional | e2e-partial |
| backend-services | `core/skills/backend-services/SKILL.md` | backend | Teaches the EXACT structure of backend services — @Service, BaseService, service options, lifecycle hooks, and service injection into actions/workflows/other services. Prevents hallucinating generic DI libraries. | backend-actions, backend-context, backend-datasources, backend-tech-stack | medium | high | supporting | e2e-partial |
| backend-tech-stack | `core/skills/backend-tech-stack/SKILL.md` | backend | Use when implementing or troubleshooting Drumr backend code that depends on framework tech stack conventions — API, datasource, validation, authorization, workflows, logging, and test tooling. | backend-api, backend-auth, backend-datasources, backend-queues | medium | high | supporting | generation-testable |
| backend-workflows | `core/skills/backend-workflows/SKILL.md` | backend | Use when creating, refactoring, or troubleshooting backend workflows — long-running operations, background jobs, async execution, durable tasks, multi-step processes, retries, progress tracking, scheduled jobs. | backend-actions, backend-context, backend-datasources, backend-queues, backend-services | high | medium | core-flow | e2e-partial |
| cli-commands | `core/skills/cli-commands/SKILL.md` | cli | Authoritative Drumr CLI command reference. Covers all drumr CLI commands for project bootstrap, local execution, metadata/code generation, infrastructure operations, data loading, and user management. | backend-api, backend-datasources, frontend-views, vscode-extension | medium | high | supporting | generation-testable |
| frontend-action-views | `core/skills/frontend-action-views/SKILL.md` | frontend | Covers @ActionView for GlobalAction, ModelAction, and ObjectAction — param/confirmation forms, lifecycle hooks (onLoad, beforeExecute, onExecute, afterExecuted), initialData pre-fill, formLayout: custom, refreshMode: custom. | backend-actions, frontend-api, frontend-form-views, frontend-table-views, frontend-views | medium | low | supporting | e2e-testable |
| frontend-api | `core/skills/frontend-api/SKILL.md` | frontend | Guides generation of frontend API consumption code — fetching data, calling custom backend actions, CRUD operations, Operation Builder queries/mutations, type-safety with @gql imports, and error union handling. | backend-api, backend-datamodels, frontend-tech-stack, frontend-views | high | low | core-flow | e2e-testable |
| frontend-components | `core/skills/frontend-components/SKILL.md` | frontend | Covers the runtime UI component system — DataForm, DataTable, DataField, Toolbar, ActionButtons, WorkflowInlineProgress, WorkflowNotificationCenter, and layout shell components. Prevents importing raw Ant Design when a framework wrapper exists. | backend-components, frontend-action-views, frontend-api, frontend-custom-views, frontend-form-views, frontend-layout, frontend-services, frontend-table-views, frontend-tech-stack, frontend-views | high | low | core-flow | e2e-testable |
| frontend-context | `core/skills/frontend-context/SKILL.md` | frontend | Guide for the frontend UI Context singleton — user, path, history, previous, views; useContextValue reactive hook; view registration lifecycle; dynamic state mutation via put() and notifyChange(). | frontend-custom-views, frontend-layout, frontend-services, frontend-views | medium | medium | supporting | e2e-testable |
| frontend-custom-views | `core/skills/frontend-custom-views/SKILL.md` | frontend | Teaches the EXACT structure of custom view pages — @CustomView decorator, CustomViewComponent base class, lifecycle hooks (onLoad, onLeave, onRender, onParamsChange), and navigation patterns (openView, closeView, ViewContainer). | frontend-api, frontend-layout, frontend-services, frontend-views | medium | medium | supporting | e2e-testable |
| frontend-form-views | `core/skills/frontend-form-views/SKILL.md` | frontend | Covers @CreateView, @EditView, and @ReadView — form lifecycle hooks, formLayout options, refreshMode/refreshTriggers, nestedViews, custom form rendering, breadcrumbs, renderStatusToolbar, isUiField type guard. | backend-auth, backend-datamodels, frontend-action-views, frontend-api, frontend-table-views, frontend-views | high | low | core-flow | e2e-testable |
| frontend-helpers | `core/skills/frontend-helpers/SKILL.md` | frontend | Documents public helper APIs for navigation (openView, closeView), toolbar composition (toolbar/menu namespace DSL), UI-object extraction (extractData, merge, isUiField), context shaping, query-builder operations, and metadata field utilities. | frontend-api, frontend-context, frontend-layout, frontend-services, frontend-views | medium | low | supporting | e2e-testable |
| frontend-layout | `core/skills/frontend-layout/SKILL.md` | frontend | Use to create, configure, or extend Drumr application layouts — @Layout decorator, BaseLayout extension, navigation modes, menu system (menu namespace), header/footer configuration, per-view layout assignment, and lifecycle hooks. | frontend-api, frontend-services, frontend-tech-stack, frontend-views | medium | low | supporting | e2e-testable |
| frontend-services | `core/skills/frontend-services/SKILL.md` | frontend | Covers exact patterns for @Service(), DependencyContainer, constructor injection, @Inject(id), singleton behavior, and view integration without bypassing DI. | frontend-api, frontend-tech-stack, frontend-views | medium | high | supporting | e2e-partial |
| frontend-table-views | `core/skills/frontend-table-views/SKILL.md` | frontend | Covers @TableView — tableOptions (columns, pagination, sorting, selection, rowToolbar, tableToolbar, onRowClicked), toolbar DSL variants, column render functions, afterActionExecution, and tableToolbar vs rowToolbar placement rules. | backend-datamodels, frontend-action-views, frontend-api, frontend-form-views, frontend-views | high | low | core-flow | e2e-testable |
| frontend-tech-stack | `core/skills/frontend-tech-stack/SKILL.md` | frontend | Use when implementing or reviewing Drumr frontend code that depends on the framework tech stack (React, Apollo Client, Ant Design Pro), including component selection priorities and framework-aligned UI architecture decisions. | frontend-api, frontend-layout, frontend-views | medium | high | supporting | generation-testable |
| frontend-views | `core/skills/frontend-views/SKILL.md` | frontend | General guide for all Drumr Framework frontend views — shared rendering pipeline, decorator decision table, header/toolbar/UI-API concepts that apply to every view kind, and links to specialized skill files. | backend-actions, backend-auth, backend-datamodels, frontend-action-views, frontend-api, frontend-custom-views, frontend-form-views, frontend-layout, frontend-services, frontend-table-views | high | low | core-flow | e2e-testable |
| testing-e2e | `core/skills/testing-e2e/SKILL.md` | qa | Teaches how to write, debug, and maintain robust Playwright-driven browser tests for Drumr apps using DrumrTestKit and Playwright best practices. | none | medium | high | supporting | generation-testable |
| testing-integration | `core/skills/testing-integration/SKILL.md` | qa | Teaches how to write deterministic backend and frontend integration tests using DrumrIntegrationTestKit without coupling them to E2E-only abstractions. | testing-unit | medium | high | supporting | generation-testable |
| testing-unit | `core/skills/testing-unit/SKILL.md` | qa | Teaches how to write isolated, deterministic unit tests using DrumrUnitTestKit and shared testing conventions without mixing unit tests with integration or E2E flows. | testing-integration | low | high | optional | generation-testable |

---

## QA Coverage Matrix

| skill | test_scope | coverage_level | test_files | missing_scenarios |
|---|---|---|---|---|
| backend-actions | e2e-testable | fully-covered | `assign-task.spec.ts`, `evaluate-task-priority.spec.ts`, `generate-report.spec.ts`, `action-view-context.spec.ts`, `pending-tasks-void-return-regression.spec.ts`, `bulk-actions.spec.ts`, `bulk-assign-to-me.spec.ts`, `dashboard-summary-actions.spec.ts` | — |
| backend-api | e2e-testable | partially-covered | `projects-crud.spec.ts`, `tasks-crud.spec.ts`, `projects-filters.spec.ts`, `table-view-reference-filter.spec.ts` (indirect); `api.integration.spec.ts`, `projectValidation.integration.spec.ts` (integration); `validation-error-inline.spec.ts` | ExpectedError vs UnexpectedError discrimination at API boundary not tested |
| backend-auth | e2e-testable | fully-covered | `auth.spec.ts`, `auth-token-expiration.spec.ts`, `toolbar-view-guard.spec.ts` | — |
| backend-components | e2e-testable | partially-covered | `boolean-read-view.spec.ts`, `users-email-copy-button.spec.ts`, `dynamic-label-badge.spec.ts`, `composition-boolean-fields.spec.ts`, `nested-composition-boolean-fields.spec.ts`, `validation-error-inline.spec.ts` | choiceDropdown and moneyLabel not tested in isolation; write-context vs read-context component swap not systematically covered |
| backend-context | framework-internal | n/a | — | Not applicable — context stack utilities are explicitly classified as framework-internal by the audit criteria; no direct UI representation |
| backend-datamodels | e2e-testable | fully-covered | `projects-crud.spec.ts`, `tasks-crud.spec.ts`, `reference-interaction.spec.ts`, `composition-value-field.spec.ts`, `composition-boolean-fields.spec.ts`, `nested-composition-boolean-fields.spec.ts`, `required-array-initialization.spec.ts`, `related-field-in-tableview.spec.ts`, `boolean-read-view.spec.ts`; conformance: `backend-datamodels.skill-conformance.spec.ts`; integration: `projectValidation.integration.spec.ts` | — |
| backend-datasources | framework-internal | n/a | — | Not applicable — datasource lifecycle (connection, migration, transactions) has no direct UI representation |
| backend-files | e2e-testable | partially-covered | `task-attachments.spec.ts` | Invalid file type / oversized file rejection not tested; file download (Content-Type, binary content) not tested |
| backend-queues | e2e-partial | partially-covered | `generate-report.spec.ts` (indirectly — modal opens but queue completion not asserted) | No test confirms a queue-backed workflow produces an observable UI outcome (WorkflowInlineProgress / WorkflowNotificationCenter); queue failure state not surfaced as UI notification |
| backend-services | e2e-partial | partially-covered | `ActivityLogService.spec.ts`, `EmailService.spec.ts` (unit); `initializeProject.integration.spec.ts`, `assignTask.integration.spec.ts`, `completeTask.integration.spec.ts` (integration) | No E2E test where a service side-effect is observable in the browser UI; service error path not exercised at the UI layer |
| backend-tech-stack | generation-testable | n/a | — | Not applicable — tech stack reference skill; validated by whether generated code compiles, passes lint, and uses framework abstractions |
| backend-workflows | e2e-partial | partially-covered | `generate-report.spec.ts`, `pending-tasks-void-return-regression.spec.ts` | WorkflowInlineProgress not observed during execution; workflow completion state not asserted in UI; multi-step observable state transitions not tested |
| cli-commands | generation-testable | n/a | — | Not applicable — CLI command reference skill; validated by whether generated commands compile and conform to documented syntax |
| frontend-action-views | e2e-testable | fully-covered | `assign-task.spec.ts`, `evaluate-task-priority.spec.ts`, `generate-report.spec.ts`, `action-view-context.spec.ts`, `pending-tasks-void-return-regression.spec.ts`, `bulk-assign-to-me.spec.ts`, `dashboard-summary-actions.spec.ts` | — |
| frontend-api | e2e-testable | partially-covered | `projects-crud.spec.ts`, `tasks-crud.spec.ts`, `reference-interaction.spec.ts`, `table-view-reference-filter.spec.ts`, `projects-filters.spec.ts`, `validation-error-inline.spec.ts` | PermissionError union response path (access-denied notification) not tested |
| frontend-components | e2e-testable | partially-covered | `table-selection.spec.ts`, `boolean-read-view.spec.ts`, `summary-view.spec.ts`, `users-email-copy-button.spec.ts`, `dynamic-label-badge.spec.ts`, `task-attachments.spec.ts` | WorkflowInlineProgress running→completed state not observed; WorkflowNotificationCenter badge increment not tested; ActionButtons disabled state when canExecute returns false not covered |
| frontend-context | e2e-testable | partially-covered | `dynamic-menu-label-query-params.spec.ts`, `action-view-context.spec.ts` | Context mutation via put()/notifyChange() observable effect not tested; context.previous/history used for conditional back-navigation not covered |
| frontend-custom-views | e2e-testable | partially-covered | `summary-view.spec.ts`, `view-container-navigation.spec.ts`, `dashboard-summary-actions.spec.ts` | onParamsChange lifecycle (view re-renders on URL query param change) not tested; onLeave guard preventing navigation not tested |
| frontend-form-views | e2e-testable | fully-covered | `projects-crud.spec.ts`, `tasks-crud.spec.ts`, `project-breadcrumbs.spec.ts`, `reference-interaction.spec.ts`, `boolean-read-view.spec.ts`, `composition-value-field.spec.ts`, `task-assignee-details.spec.ts`, `required-array-initialization.spec.ts`, `task-project-details.spec.ts`, `composition-boolean-fields.spec.ts`, `nested-composition-boolean-fields.spec.ts`, `task-attachments.spec.ts` | — |
| frontend-helpers | e2e-testable | partially-covered | `toolbar-view-guard.spec.ts`, `view-container-navigation.spec.ts`, `nested-modal-navigation.spec.ts` | extractData/merge/isUiField helper behavior not explicitly tested; query-builder context helpers (getUiApiContext, sanitizeContextForGraphQL) not covered; openView with params not isolated in a dedicated test |
| frontend-layout | e2e-testable | partially-covered | `left-menu-open-in-new-tab.spec.ts`, `dynamic-menu-label-query-params.spec.ts`, `project-breadcrumbs.spec.ts` | Per-view layout assignment override not tested; top-navigation mode (menu in header bar) not tested; header/footer customization not covered |
| frontend-services | e2e-partial | partially-covered | `GraphQLClientService.spec.ts`, `DashboardDataService.spec.ts` (unit only) | No E2E test directly observes service-driven behavior (cache invalidation causing UI refresh, singleton reuse across views) |
| frontend-table-views | e2e-testable | fully-covered | `projects-crud.spec.ts`, `tasks-crud.spec.ts`, `table-selection.spec.ts`, `bulk-actions.spec.ts`, `projects-filters.spec.ts`, `table-view-reference-filter.spec.ts`, `related-field-in-tableview.spec.ts`, `task-project-details.spec.ts`, `bulk-assign-to-me.spec.ts`, `toolbar-view-guard.spec.ts` | — |
| frontend-tech-stack | generation-testable | n/a | — | Not applicable — tech stack reference skill; validated by whether generated code uses framework-preferred component selection order |
| frontend-views | e2e-testable | partially-covered | `view-container-navigation.spec.ts`, `toolbar-view-guard.spec.ts`, `nested-modal-navigation.spec.ts`, `summary-view.spec.ts` | Toolbar DSL disabled predicate observable rendering not explicitly tested; UI API binding failure surfacing a graceful error state not tested |
| testing-e2e | generation-testable | n/a | — | Not applicable — instructional skill; validated by whether generated tests compile, run, and conform to DrumrTestKit patterns |
| testing-integration | generation-testable | n/a | — | Not applicable — instructional skill; validated by whether generated tests compile and run with DrumrIntegrationTestKit |
| testing-unit | generation-testable | n/a | — | Not applicable — instructional skill; validated by whether generated tests compile and run with DrumrUnitTestKit |

---

## Gap Backlog — E2E Actionable

Only `e2e-testable` and `e2e-partial` skills with coverage level `not-covered` or `partially-covered` are listed.
`framework-internal` and `generation-testable` skills are excluded — see the section below.
Sorted by risk ↓ (`high` → `medium` → `low`) then `business_impact` ↓ (`core-flow` → `supporting` → `optional`).

---

### High risk

- **[backend-services]** (`e2e-partial` / `partially-covered`) — `core/skills/backend-services/SKILL.md`
  - Missing: an E2E scenario where a service-produced side-effect (e.g., an activity log entry created by ActivityLogService) is observable as a new row or notification in the browser UI
  - Suggested test: `"Backend service side-effect — activity log entry created by service appears in the UI activity list after action execution"`
  - Missing: service error path — an exception thrown inside a service surfaces as a user-visible error notification rather than a blank/500 page
  - Suggested test: `"Backend service error — unhandled service exception surfaces as a UI error notification without a 500 page"`

- **[backend-queues]** (`e2e-partial` / `partially-covered`) — `core/skills/backend-queues/SKILL.md`
  - Missing: end-to-end confirmation that a queue-backed workflow produces a visible outcome in WorkflowInlineProgress or WorkflowNotificationCenter
  - Suggested test: `"Queue-backed workflow — WorkflowNotificationCenter badge increments and shows completed status after background execution"`
  - Missing: queue failure state visible as a notification or error badge in the UI
  - Suggested test: `"Queue-backed workflow failure — error state is displayed in WorkflowNotificationCenter and can be dismissed"`

- **[frontend-services]** (`e2e-partial` / `partially-covered`) — `core/skills/frontend-services/SKILL.md`
  - Missing: cache invalidation triggered by a frontend service causes the UI table or form to refresh with updated data
  - Suggested test: `"Frontend service cache invalidation — table data refreshes in UI after service clears and refetches following a mutation"`
  - Missing: singleton service reuse — data fetched in one view is served from cache when navigating to a second view without re-fetching
  - Suggested test: `"Frontend service singleton — data fetched in one view is served from cache when the user navigates to a linked detail view"`

---

### Medium risk

- **[backend-files]** (`e2e-testable` / `partially-covered`) — `core/skills/backend-files/SKILL.md`
  - Missing: uploading a disallowed file type shows an inline validation error and does not persist the file
  - Suggested test: `"FileDropZone — uploading a disallowed file type shows a validation error message and does not add the file to the list"`
  - Missing: file download returns the correct content and Content-Type header
  - Suggested test: `"File download — clicking a file reference link downloads the file with the correct Content-Type and original binary content"`

- **[backend-workflows]** (`e2e-partial` / `partially-covered`) — `core/skills/backend-workflows/SKILL.md`
  - Missing: WorkflowInlineProgress visible in UI while the workflow is executing
  - Suggested test: `"Background workflow — WorkflowInlineProgress shows 'running' state while a long-running workflow executes"`
  - Missing: workflow completion updates a record's state observable in the table or read view
  - Suggested test: `"Background workflow completion — task status changes to 'Completed' in the table after the workflow finishes"`

- **[frontend-context]** (`e2e-testable` / `partially-covered`) — `core/skills/frontend-context/SKILL.md`
  - Missing: context mutation via put()/notifyChange() triggers a reactive UI update observable in the browser
  - Suggested test: `"Context put() mutation — calling context.put() with a new value causes a reactive label in the layout to update without page reload"`
  - Missing: context.previous reflects the prior navigation path and enables a conditional back-navigation scenario
  - Suggested test: `"Context previous — a layout component reads context.previous to show a conditional back label matching the previously visited view"`

- **[frontend-custom-views]** (`e2e-testable` / `partially-covered`) — `core/skills/frontend-custom-views/SKILL.md`
  - Missing: onParamsChange lifecycle — view re-renders with updated content when URL query params change
  - Suggested test: `"CustomView onParamsChange — view content updates when URL query params change (e.g., filter param added to URL)"`
  - Missing: onLeave guard — attempting to navigate away from a custom view with a dirty state triggers a confirmation dialog
  - Suggested test: `"CustomView onLeave guard — navigating away from a dirty custom view shows a confirmation dialog before leaving"`

---

### Low risk

- **[backend-api]** (`e2e-testable` / `partially-covered`) — `core/skills/backend-api/SKILL.md`
  - ~~Missing: mutation returning a ValidationError union surfaced as inline field errors in the form without a page reload~~ → **Closed by `validation-error-inline.spec.ts`**
  - Missing: action throwing an ExpectedError returns a structured error payload, not a 500
  - Suggested test: `"Backend API ExpectedError — action throwing an ExpectedError returns a structured JSON payload and does not produce a 500 status"`

- **[backend-components]** (`e2e-testable` / `partially-covered`) — `core/skills/backend-components/SKILL.md`
  - ~~Missing: field-level validation error rendering for text fields with constraint options (minLength, required)~~ → **Closed by `validation-error-inline.spec.ts`**
  - Missing: choiceDropdown and moneyLabel components tested in both read and write contexts
  - Suggested test: `"Backend components — choiceDropdown renders selectable options in write context and selected label in read context; moneyLabel renders formatted currency in read context"`

- **[frontend-api]** (`e2e-testable` / `partially-covered`) — `core/skills/frontend-api/SKILL.md`
  - ~~Missing: ValidationError union from a mutation renders as per-field inline errors in a form~~ → **Closed by `validation-error-inline.spec.ts`**
  - Missing: PermissionError union response triggers a user-visible access-denied notification
  - Suggested test: `"Frontend API PermissionError union — action returning PermissionError shows an access-denied notification to the user"`

- **[frontend-components]** (`e2e-testable` / `partially-covered`) — `core/skills/frontend-components/SKILL.md`
  - Missing: WorkflowInlineProgress transitions from running to completed observed in browser
  - Suggested test: `"WorkflowInlineProgress — component transitions from 'running' to 'completed' state after a background workflow finishes"`
  - Missing: WorkflowNotificationCenter badge increments when a background workflow action is triggered
  - Suggested test: `"WorkflowNotificationCenter — notification badge count increments when a queue-backed workflow action is submitted"`
  - Missing: ActionButtons disabled state when canExecute returns false for the current record
  - Suggested test: `"ActionButtons — execute button is disabled and non-interactive when canExecute returns false for the selected record"`

- **[frontend-helpers]** (`e2e-testable` / `partially-covered`) — `core/skills/frontend-helpers/SKILL.md`
  - Missing: openView/closeView helpers navigate to the correct route with expected URL params
  - Suggested test: `"openView helper — calling openView with params navigates to the correct route and query params appear in the URL"`
  - Missing: extractData correctly extracts field values from a UI object for action execution
  - Suggested test: `"extractData helper — extracted values from a ReadView UI object match the backend record's field values"`

- **[frontend-layout]** (`e2e-testable` / `partially-covered`) — `core/skills/frontend-layout/SKILL.md`
  - Missing: per-view layout override renders the correct layout shell (different from the app default)
  - Suggested test: `"Per-view layout override — a view assigned a non-default layout renders inside that layout's shell, not the default app layout"`
  - Missing: top-navigation mode renders menu items in the header bar, not in the left sidebar
  - Suggested test: `"Layout navigation mode top — all left-sidebar menu items appear in the header top bar instead"`

- **[frontend-views]** (`e2e-testable` / `partially-covered`) — `core/skills/frontend-views/SKILL.md`
  - Missing: toolbar DSL disabled predicate correctly disables a button when the predicate returns true
  - Suggested test: `"Frontend views — a toolbar button with a disabled predicate that evaluates to true is rendered as non-interactive"`
  - Missing: graceful error state surfaced in UI when view UI API metadata cannot be loaded
  - Suggested test: `"Frontend views — a graceful error state is displayed to the user when UI API metadata fails to load for a view"`

---

## Framework-internal and Generation-testable Skills (out of E2E scope)

| skill | file | test_scope | suggested_test_type | notes |
|---|---|---|---|---|
| backend-context | `core/skills/backend-context/SKILL.md` | framework-internal | unit test | Context injection, stack utilities (some/none/find/parent/levels/push/pop), and defensive patterns are pure TypeScript logic; test via Jest with mock action/service scaffolding |
| backend-datasources | `core/skills/backend-datasources/SKILL.md` | framework-internal | integration test | Datasource lifecycle (connect, migrate, transact) requires a live DB; test via Jest integration suite against a Docker test database |
| backend-tech-stack | `core/skills/backend-tech-stack/SKILL.md` | generation-testable | generation conformance | Validate that code generated from this skill compiles, passes lint, and uses framework abstractions rather than raw library imports |
| cli-commands | `core/skills/cli-commands/SKILL.md` | generation-testable | integration test (Mocha) | CLI commands launch child processes and modify the filesystem; test via Mocha integration suite under cli/test/integration/ |
| frontend-tech-stack | `core/skills/frontend-tech-stack/SKILL.md` | generation-testable | generation conformance | Validate that generated React/Apollo/Ant Design code uses framework-preferred component selection order (framework > Ant Design Pro > base Ant Design) |
| testing-e2e | `core/skills/testing-e2e/SKILL.md` | generation-testable | generation conformance | Validate that generated test files compile, import DrumrTestKit correctly, and follow test naming conventions |
| testing-integration | `core/skills/testing-integration/SKILL.md` | generation-testable | generation conformance | Validate that generated integration test files compile, import DrumrIntegrationTestKit correctly, and do not import E2E-only abstractions |
| testing-unit | `core/skills/testing-unit/SKILL.md` | generation-testable | generation conformance | Validate that generated unit test files compile, import DrumrUnitTestKit correctly, and do not reference DB or DI containers directly |

---

## Audit Metadata

| Field | Value |
|---|---|
| Audit date | 2026-05-14 |
| Skills read | 29 |
| Test files scanned | 52 (apps/project-management-app/ — 34 e2e, 7 backend integration, 7 backend unit, 1 frontend integration, 3 frontend unit) |
| E2E testable skills | 16 |
| E2E partial skills | 4 |
| Framework-internal skills | 2 |
| Generation-testable skills | 7 |
| Fully covered | 6 (30% of e2e-testable + e2e-partial) — backend-actions, backend-auth, backend-datamodels, frontend-action-views, frontend-form-views, frontend-table-views |
| Partially covered | 14 (70% of e2e-testable + e2e-partial) |
| Not covered | 0 (0%) |
| Criticality pending-devTeam | 29 (no criticality field declared in any skill frontmatter) |
