# Examples: DOM Selector Patterns

> How DrumrTestKit selects elements internally. **Spec files never use these selectors directly.**

---

## Field input by ID

The framework guarantees that every form field's `id` attribute equals the field's name as declared in the data model.

```typescript
// Inside drumr-test-kit.ts — never in spec files
const container = this._formContainer ?? this.page;
const input = container.locator(`#${fieldId}`);
await input.fill(value);
```

---

## Ant Design Select

Select fields in Drumr use Ant Design's `<Select>` component, NOT a native `<select>` element. The trigger and option list are separate DOM nodes.

```typescript
// Inside drumr-test-kit.ts — never in spec files
const selectTrigger = this.page
  .locator(`.ant-form-item-label:has-text("${label}")`)
  .locator('..')
  .locator('.ant-select-selector');
await selectTrigger.click();
await this.page.locator('.ant-select-item-option').first().click();
```

---

## Drawer scoping

When multiple drawers are open (stacked), field IDs can appear in both the outer and inner drawers. The kit scopes to the last (topmost) open drawer.

```typescript
// Inside drumr-test-kit.ts — never in spec files
const drawers = this.page.locator('.ant-drawer-open .ant-drawer-body');
const count = await drawers.count();
if (count > 0) {
  this._formContainer = drawers.nth(count - 1);
}
```

---

## Delete confirmation

The delete confirmation uses `Modal.confirm` from Ant Design. The confirm button text is either `"Delete"` or `"Execute"` depending on the action context.

```typescript
// Inside drumr-test-kit.ts — never in spec files
const confirmModal = this.page.locator('.ant-modal-confirm');
await confirmModal.waitFor({ state: 'visible' });
const confirmBtn = confirmModal.getByRole('button', { name: /delete|execute/i });
await confirmBtn.click();
```

---

## Async toolbar loading

Drawer toolbar buttons (Manage, Actions) load asynchronously. Always wait before clicking.

```typescript
// Inside drumr-test-kit.ts — never in spec files
const dropdown = this.page.getByRole('button', { name: /manage/i });
await dropdown.waitFor({ state: 'visible', timeout: 10_000 });
await dropdown.click();
```

---

## Textarea by placeholder

Textareas in Drumr forms are identified by their placeholder text, not by field ID.

```typescript
// Inside drumr-test-kit.ts — never in spec files
const container = this._formContainer ?? this.page;
const textarea = container.getByPlaceholder(placeholderPattern);
await textarea.fill(value);
```
