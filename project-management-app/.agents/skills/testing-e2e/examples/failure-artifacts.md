# Example: Failure Artifacts

When a test fails, Playwright saves in `test-results/`:

- **Screenshot:** Visual state at failure
- **Video:** Full interaction replay
- **Trace:** Network, DOM, and console timeline
- **Error context:** YAML accessibility snapshot

## Example error-context.md

```yaml
- role: dialog
  name: "Delete Confirmation"
  children:
    - role: button
      name: "Execute"
    - role: button
      name: "Cancel"
```

Check if the target element is present, visible, and correctly named.