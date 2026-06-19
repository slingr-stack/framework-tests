# Concepts: Playwright Failure Patterns

> Common E2E failure root causes and the diagnostic path to fix them.

---

## Common Failure Patterns

### 1. "Element intercepted by another element"

**Root cause:** Drawer mask, skeleton loader, or overlay blocking clicks.
**Fix:** Check if `waitForForm()` is scoping to the topmost drawer via `_formContainer`. The overlay may still be animating.

---

### 2. "Timeout waiting for locator"

**Root cause:** Element doesn't exist or isn't visible.
**Diagnosis:** Check `error-context.md` in `test-results/` for the actual accessibility tree.
**Common fixes:**
- Add `waitForDrawer()` if view opens in a drawer
- Use `searchInTable()` if record is on a different page
- Check if view container type changed (drawer → page)

---

### 3. "Strict mode violation: matched N elements"

**Root cause:** Multiple elements match the selector (field ID collision between drawer layers).
**Fix:** `waitForForm()` should scope to the correct drawer. If it doesn't, check `_formContainer` state.

---

### 4. Edit doesn't persist / form value doesn't update

**Root cause:** `fill()` doesn't trigger React/ProForm internal state update.
**Fix:** Use `clearAndFillField()` with `Meta+a` + `pressSequentially()`. This forces React's `onChange` to fire.

---

### 5. Serial test fails because prerequisite was skipped

**Root cause:** Running with `-g "test name"` skips earlier tests in a serial suite.
**Fix:** Run the full `describe` block, or ensure each test can self-setup if dependencies cannot be removed.

---

### 6. Delete confirmation button not found

**Root cause:** The confirm button text is context-dependent — it may be `"Delete"` or `"Execute"`.
**Fix:** `DrumrTestKit.confirmDelete()` already matches `/delete|execute/i`. If it fails, check the actual button text in `error-context.md` and update the kit.

---

### 7. Data collision between parallel tests

**Root cause:** Two workers create records with the same name and one test finds the wrong record.
**Fix:** Use `Date.now()` + `testInfo.parallelIndex` for test data names. See `../testing-e2e/best-practices.md` §Parallel-Safe Data Pattern.

---

## Debug Workflow

```
1. Read error-context.md → identify the missing/unexpected element
2. Run in headed debug mode → step through actions
3. Check DrumrTestKit method → trace the failing selector
4. Cross-reference ../testing-dom/concepts.md → verify framework rendering for that element
5. Fix: kit method, drawer scoping, or test isolation
```
