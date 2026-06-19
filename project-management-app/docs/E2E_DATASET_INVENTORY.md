# E2E Dataset Inventory (Full Suite)

Generated from all 35 specs in frontend/tests/e2e.

| Spec | Entities | Routes | Fields and Filters | References and Composition | Create | Update | Delete | Seed Dependent | Dynamic Names | Raw Playwright |
|---|---|---|---|---|---|---|---|---|---|---|
| action-view-context.spec.ts | Task | /tasks | title<br>Title | Project | yes | no | no | no | yes | yes |
| assign-task.spec.ts | Task, Note | /tasks/new<br>/tasks | title<br>#title | Project<br>Status | yes | no | yes | no | yes | yes |
| auth-token-expiration.spec.ts | Task | /tasks | - | - | no | no | no | no | no | no |
| auth.spec.ts | - | - | - | - | no | no | no | no | no | no |
| boolean-read-view.spec.ts | Task, Project, Note | /tasks<br>/projects | title<br>name<br>code | Project<br>Manager<br>Notes:Created By | yes | no | yes | no | yes | yes |
| bulk-actions.spec.ts | Task | /tasks | Title<br>Status<br>#reason, [name= | - | yes | no | yes | yes | yes | yes |
| bulk-assign-to-me.spec.ts | Task | /tasks | Title | - | no | no | no | yes | no | yes |
| composition-accordion-title-regression.spec.ts | User, Address | /users/new | firstName<br>lastName<br>email<br>ph:Enter street address<br>ph:Enter city or locality<br>ph:Enter postal or ZIP code<br>ph:Enter country | Roles | no | no | no | no | yes | yes |
| composition-boolean-fields.spec.ts | Task, Note | /tasks | title | Project | yes | yes | yes | no | yes | yes |
| composition-value-field.spec.ts | Task, Note, TaskMetadata | /tasks | title<br>Title | Project<br>Notes:Created By<br>Task Metadata:Enter key<br>Task Metadata:Enter value<br>Task Metadata | yes | no | yes | no | yes | yes |
| dashboard-summary-actions.spec.ts | Project | /projects | - | - | no | no | no | no | no | yes |
| dynamic-label-badge.spec.ts | - | - | - | - | no | no | no | no | no | yes |
| dynamic-menu-label-query-params.spec.ts | User, Project, Task, Note | /users/new<br>/users<br>/projects<br>/tasks | firstName<br>lastName<br>email<br>name<br>code<br>title | Roles<br>Manager<br>Project<br>Assignee<br>Notes:Created By | yes | no | yes | no | yes | no |
| evaluate-task-priority.spec.ts | Task | /tasks | #taskTitle | - | yes | no | no | no | no | yes |
| generate-report.spec.ts | Project | /projects | #title | - | yes | no | no | no | no | yes |
| left-menu-open-in-new-tab.spec.ts | - | - | - | - | no | no | no | no | no | no |
| nested-composition-boolean-fields.spec.ts | Task, Note | /tasks | title | Project | yes | yes | yes | no | yes | yes |
| nested-modal-navigation.spec.ts | Task | /tasks | title<br>Title<br>#firstName | Project<br>Assignee | yes | yes | yes | no | yes | yes |
| pending-tasks-void-return-regression.spec.ts | Task | /tasks | - | - | no | no | no | no | no | yes |
| project-breadcrumbs.spec.ts | Project | /projects<br>/projects/${testProjectId}/view<br>/projects/new | name<br>code<br>Project Name | Manager | yes | yes | yes | no | yes | yes |
| projects-crud.spec.ts | Project | /projects | name<br>code<br>Project Name | Manager | yes | yes | yes | no | yes | no |
| projects-filters.spec.ts | Project | /projects | - | - | no | no | no | no | no | yes |
| reference-interaction.spec.ts | User, Task | /users/new<br>/tasks<br>/users | firstName<br>lastName<br>email<br>title | Roles<br>Assignee<br>Reporter | yes | no | yes | no | yes | yes |
| related-field-in-tableview.spec.ts | Project, Task | /projects<br>/tasks | name<br>code<br>title<br>Title<br>Project Code<br>Project Name | Manager<br>Project | yes | no | yes | no | yes | yes |
| required-array-initialization.spec.ts | ProjectReport, Project | /project-reports/new<br>/projects | #title | - | yes | no | no | no | no | yes |
| summary-view.spec.ts | SummaryView, Project, Task, Note | /summary<br>/projects<br>/tasks/new<br>/tasks | name<br>title<br>Project Name<br>#title | Status<br>Project | yes | yes | yes | yes | yes | yes |
| table-selection.spec.ts | Task | /tasks | - | - | no | no | no | yes | no | no |
| table-view-reference-filter.spec.ts | Project, Task, Note | /projects<br>/tasks | name<br>code<br>title | Manager<br>Project<br>Notes:Created By | yes | no | yes | no | yes | yes |
| task-assignee-details.spec.ts | Task, Note | /tasks | title<br>Title<br>ta:/enter task description/ | Project<br>Notes:Created By | yes | no | yes | yes | yes | yes |
| task-attachments.spec.ts | Task, File | /tasks/new | #title | - | yes | no | yes | no | no | yes |
| task-project-details.spec.ts | Project, Task, Note | /projects<br>/tasks | name<br>code<br>title | Manager<br>Project<br>Notes:Created By | yes | no | yes | no | yes | yes |
| tasks-crud.spec.ts | Task, Note | /tasks | title<br>dueDate<br>ta:/enter task description/ | Project<br>Notes:Created By | yes | yes | yes | no | yes | no |
| toolbar-view-guard.spec.ts | User | /users | - | - | no | no | no | no | no | yes |
| users-email-copy-button.spec.ts | User, Task | /users<br>/tasks | - | - | no | no | no | no | no | yes |
| view-container-navigation.spec.ts | Project | /projects | - | - | no | no | no | no | no | yes |

## Suite Totals

- total specs: 35
- create mutations: 22
- update mutations: 7
- delete mutations: 18
- seed-dependent specs: 5
- specs with dynamic names: 19
- specs using raw Playwright selectors: 28

## Seed-Dependent Specs
- bulk-actions.spec.ts
- bulk-assign-to-me.spec.ts
- summary-view.spec.ts
- table-selection.spec.ts
- task-assignee-details.spec.ts