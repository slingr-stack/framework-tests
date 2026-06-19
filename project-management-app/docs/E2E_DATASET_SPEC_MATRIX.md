# E2E Spec to Dataset Matrix

This matrix maps each E2E spec to a dataset profile.

Current default policy: all specs use `default` unless explicitly overridden.

| Spec | Profile |
|---|---|
| action-view-context.spec.ts | default |
| assign-task.spec.ts | default |
| auth-token-expiration.spec.ts | default |
| auth.spec.ts | default |
| boolean-read-view.spec.ts | default |
| bulk-actions.spec.ts | default |
| bulk-assign-to-me.spec.ts | default |
| composition-accordion-title-regression.spec.ts | default |
| composition-boolean-fields.spec.ts | default |
| composition-value-field.spec.ts | default |
| dashboard-summary-actions.spec.ts | default |
| dynamic-label-badge.spec.ts | default |
| dynamic-menu-label-query-params.spec.ts | default |
| evaluate-task-priority.spec.ts | default |
| generate-report.spec.ts | default |
| left-menu-open-in-new-tab.spec.ts | default |
| nested-composition-boolean-fields.spec.ts | default |
| nested-modal-navigation.spec.ts | default |
| pending-tasks-void-return-regression.spec.ts | default |
| project-breadcrumbs.spec.ts | default |
| projects-crud.spec.ts | default |
| projects-filters.spec.ts | default |
| reference-interaction.spec.ts | default |
| related-field-in-tableview.spec.ts | default |
| required-array-initialization.spec.ts | default |
| summary-view.spec.ts | default |
| table-selection.spec.ts | default |
| table-view-reference-filter.spec.ts | default |
| task-assignee-details.spec.ts | default |
| task-attachments.spec.ts | default |
| task-project-details.spec.ts | default |
| tasks-crud.spec.ts | default |
| toolbar-view-guard.spec.ts | default |
| users-email-copy-button.spec.ts | default |
| view-container-navigation.spec.ts | default |

## Special-Case Seed-Dependent Specs

These specs use known seeded records and should remain mapped to stable baseline datasets:

- summary-view.spec.ts
- task-assignee-details.spec.ts
- bulk-actions.spec.ts
- bulk-assign-to-me.spec.ts
- table-selection.spec.ts
