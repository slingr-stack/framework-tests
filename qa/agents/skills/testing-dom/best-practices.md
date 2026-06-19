# Best Practices: DOM Abstraction

> Selector priority, scoping discipline, and kit extension rules for DrumrTestKit internals.

---

## Selector Priority (inside drumr-test-kit.ts only)

Use selectors in this priority order. Spec files never use these directly.

1. **ARIA roles** (`getByRole`) — most resilient to DOM changes
2. **Field IDs** (`#fieldName`) — framework guarantees field name → `id` attribute
3. **Placeholder text** (`getByPlaceholder`) — for textareas
4. **Visible text** (`getByText`) — only for static labels
5. **CSS classes** (`.ant-*`) — last resort, only for framework-specific containers

---

## Drawer Scoping Rule

When a drawer is open, `waitForForm()` must scope all subsequent field interactions to the **topmost** drawer body. This prevents field ID collisions between the table filter bar and the edit form.

```
Page DOM:
  slingr-data-table → filter inputs (id="title")
  .ant-drawer-open (depth 1 — ReadView)
    .ant-drawer-body
  .ant-drawer-open (depth 2 — EditView)
    .ant-drawer-body → form inputs (id="title")  ← must scope here
```

`_formContainer` tracks the topmost drawer body. `navigateTo()` resets it to `null`.

---

## Kit Extension Discipline

When a spec needs an interaction not covered by an existing kit method:

1. **Stop** — do not add a raw selector to the spec.
2. **Add the method** to `drumr-test-kit.ts` following these rules:
   - Name reflects business intent: `fillDateField`, not `clickDatePickerInput`
   - Includes proper `waitFor` before interaction
   - Follows selector priority above
   - Is reusable across tests and entities
3. **Use the new method** in the spec.

This keeps the kit as the single source of DOM truth and prevents selector drift across spec files.

---

## Async Toolbar Loading

Manage/Actions dropdown buttons in drawers load asynchronously after the drawer opens. Always wait before clicking:

```typescript
// Inside drumr-test-kit.ts — kit internals only
const dropdown = this.page.getByRole('button', { name: /manage/i });
await dropdown.waitFor({ state: 'visible', timeout: 10_000 });
await dropdown.click();
```

Never assume toolbar buttons are immediately clickable after `waitForDrawer()`.

---

## React Input Compatibility

Ant Design ProForm inputs do not always respond to a plain `fill()` call because React tracks input state internally. For edit flows, use `clearAndFillField()` which:
1. Clicks the input to focus
2. Uses `Meta+a` (or `Control+a`) to select all
3. Uses `pressSequentially()` to type character by character
4. Triggers React's `onChange` reliably

Use `fillField()` only for fresh (empty) inputs on create forms.

---

## Do Not Export DOM Knowledge

Kit methods that use CSS selectors or Ant Design class names must be `private` or `protected`. Public API methods must use framework-semantic names. This ensures spec authors cannot accidentally bypass the abstraction.
