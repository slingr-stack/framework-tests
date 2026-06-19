# Footer component

> Part of the [frontend-components](./SKILL.md) skill.

---

## Purpose

The `Footer` component renders the application footer using Ant Design Pro's `DefaultFooter`. It is an internal framework component rendered by the layout system.

**You do NOT use this directly** — configure footer content via the `@Layout()` decorator.

---

## Configuration via `Layout`

```typescript
import { BaseLayout, Layout } from '@drumr/framework-frontend';

@Layout()
export default class MainLayout extends BaseLayout {
  override features = {
    footer: true,
  };

  override footer = {
    copyright: '© 2026 My Company',
  };
}
```

The framework renders the footer when `features.footer = true`.

---

## Best practices

1. **Configure footer in the layout class** — do not import the Footer component.
2. **Set `features.footer = false`** to hide the footer entirely.

---

## Related skills

- [frontend-layout](../frontend-layout/SKILL.md) — Layout footer configuration
