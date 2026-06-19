# Example: Frontend Unit Test — Component with Providers

> Example of a frontend unit test using direct `DrumrUnitTestKit` composition and optional runtime helpers.

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { DrumrUnitTestKit } from '@drumr/framework-qa/drumr-unit-test-kit';
import { TaskPrioritySelector } from '../../src/components/task-priority-selector';

type Context = {
  tenantId: string;
  user: { id: string; role: string };
};

describe('TaskPrioritySelector', () => {
  const kit = new DrumrUnitTestKit<Context>({
    context: { tenantId: 'acme', user: { id: 'u1', role: 'manager' } },
    backend: {
      mockDatabase: async factory => factory(),
      isolateService: () => {},
      setContext: () => {},
      reset: () => {},
    },
    frontend: {
      renderWithProviders: (component, options) => {
        // app render helper wraps Theme/Router/GraphQL providers
        return appRender(component as any, { context: options?.context });
      },
      fireEvent: (target, eventName, payload) => {
        if (eventName === 'change') {
          return appFireEvent.change(target as HTMLElement, payload as any);
        }
      },
      cleanup: () => {
        appCleanup();
      },
    },
    runtime: {
      expect,
      naming: { suitePrefix: '[unit][frontend]', casePrefix: '[priority-selector]' },
      contextHelpers: {
        asAdmin: () => ({ user: { id: 'u-admin', role: 'admin' } }),
      },
    },
  });

  beforeEach(async () => {
    await kit.setup();
  });

  afterEach(async () => {
    await kit.teardown();
  });

  describe(kit.suiteName('TaskPrioritySelector'), () => {
    it(kit.caseName('renders with current value and emits changes'), async () => {
      const onChange = vi.fn();

      kit.frontend.renderWithProviders(<TaskPrioritySelector value="medium" onChange={onChange} />);

      expect(screen.getByText(/priority/i)).toBeInTheDocument();

      const select = screen.getByRole('combobox', { name: /priority/i });
      await kit.frontend.fireEvent(select, 'change', { target: { value: 'high' } });

      expect(onChange).toHaveBeenCalledWith('high');
    });

    it(kit.caseName('can switch context with a named helper'), async () => {
      kit.useContext('asAdmin');
      expect(kit.context.user.role).toBe('admin');
    });
  });
});
```

### Key Patterns

1. UI render always via `kit.frontend.renderWithProviders(...)`
2. Interaction abstraction via `kit.frontend.fireEvent(...)`
3. Runtime naming/context helpers stay optional and non-invasive
4. Provider wiring stays in app-level adapter, not in framework kit
5. Subclassing remains optional for apps with repeated setup
