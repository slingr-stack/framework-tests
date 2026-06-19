# Concepts: E2E Testing

> The foundational philosophy and rules that govern every E2E test in a Drumr application.

---

## The DOM-Agnostic Contract

E2E spec files in Drumr apps must be **100% DOM-agnostic**. This is a strict, non-negotiable rule.

### What "DOM-agnostic" means

Spec files never contain:

- `page.locator(...)` or any Playwright locator
- CSS class names (e.g., `.ant-drawer`, `.ant-table-row`)
- Ant Design component names used as selectors
- `page.getByRole(...)`, `page.getByText(...)`, or any raw Playwright selector API
- Aria attributes or DOM structure knowledge

### Why

The Drumr framework is built on Ant Design Pro, whose DOM structure changes between versions. If specs contain DOM knowledge, every framework upgrade breaks every test. By keeping specs DOM-agnostic, a single update to `drumr-test-kit.ts` repairs all tests simultaneously.

**When the framework changes how it renders → only `drumr-test-kit.ts` needs updating — zero spec rewrites.**

---

## DrumrTestKit: The Single Abstraction Layer

`DrumrTestKit` (imported from `@drumr/framework-qa/drumr-test-kit`; source: `qa/drumr-test-kit.ts`) is the **only** layer that knows how the Drumr framework renders UI components.

| Concern | What it encapsulates |
|---------|---------------------|
| Authentication | Login URL, field IDs, submit button |
| Tables | `slingr-data-table` wrapper, ProTable, search filters |
| Forms | Field IDs = field names, Ant Select, textarea placeholders |
| Containers | Drawer vs Modal vs Page, stacked drawer scoping |
| Toolbars | Manage/Actions dropdowns, async button loading |
| Confirmations | Delete confirmation modal, confirm button text |
| Feedback | Success/error messages via Ant notification |

### Extending the kit

If a needed interaction is not covered by an existing kit method, **add the method to `drumr-test-kit.ts`** before writing the spec. Never work around a missing method with raw selectors in the spec file.

New kit methods must:
- Use a business-intent name (e.g., `fillDateField`, not `clickDatePickerInput`)
- Include proper async waits
- Follow selector priority: ARIA roles > field IDs > placeholder text > CSS classes (see `../testing-dom/SKILL.md`)

---

## Spec Files Read Like Business Scenarios

Every test should be readable by a non-technical stakeholder:

```typescript
// Good — reads like a scenario description
await app.loginAsAdmin();
await app.navigateTo('/tasks');
await app.clickCreateInTable();
await app.fillField('title', 'E2E Task');
await app.submitCreate();
await app.expectTableContains('E2E Task');

// Bad — leaks DOM knowledge
await page.locator('#title').fill('E2E Task');
await page.locator('.ant-btn-primary').click();
await expect(page.locator('.ant-table')).toContainText('E2E Task');
```

---

## Strict Import Rule

Spec files may **only** import:

```typescript
import { test } from '@playwright/test';
import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';
```

No raw Playwright locators, no Ant Design types.
