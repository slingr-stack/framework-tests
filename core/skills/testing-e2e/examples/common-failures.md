# Example: Common Failure Patterns & Fixes

1. **Element intercepted**
   - Cause: Overlay, loader, or drawer mask
   - Fix: Use `waitForForm()` with correct scoping

2. **Timeout waiting for locator**
   - Cause: Element does not exist or is not visible
   - Fix: Check `error-context.md`, verify drawer/modal is open

3. **Strict mode violation**
   - Cause: Selector matches multiple elements
   - Fix: Correct drawer scoping

4. **Edit does not persist**
   - Cause: `fill()` does not update React state
   - Fix: Use `clearAndFillField()`

5. **Delete confirmation fails**
   - Cause: Incorrect button text
   - Fix: Use matcher `/delete|execute/i` in `.ant-modal-confirm`
