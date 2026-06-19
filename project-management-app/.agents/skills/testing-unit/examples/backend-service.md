# Example: Backend Unit Test — Service with Isolated Dependencies

> Example of a backend unit test using direct `DrumrUnitTestKit` composition (no subclass required).

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DrumrUnitTestKit } from '@drumr/framework-qa/drumr-unit-test-kit';
import { TaskService } from '../../src/services/task-service';

type Context = {
  tenantId: string;
  user: { id: string; role: string };
};

const taskRepository = {
  updatePriority: vi.fn(),
};

const permissionService = {
  canEditTask: vi.fn(),
};

describe('TaskService.updatePriority', () => {
  const kit = new DrumrUnitTestKit<Context>({
    context: { tenantId: 'acme', user: { id: 'u1', role: 'manager' } },
    backend: {
      mockDatabase: async factory => factory(),
      isolateService: (token, implementation) => {
        // app DI override strategy
      },
      setContext: () => {},
      reset: () => {
        vi.clearAllMocks();
      },
    },
    frontend: {
      renderWithProviders: () => null,
      fireEvent: () => {},
      cleanup: () => {},
    },
    runtime: {
      expect,
      mockFactory: factory => factory(),
      autoReset: 'teardown',
      naming: { suitePrefix: '[unit][backend]', casePrefix: '[task-service]' },
      contextHelpers: {
        asAdmin: () => ({ user: { id: 'u-admin', role: 'admin' } }),
      },
    },
  });

  beforeEach(async () => {
    await kit.setup();
    kit.backend.isolateService(Symbol.for('TaskRepository'), taskRepository);
    kit.backend.isolateService(Symbol.for('PermissionService'), permissionService);
  });

  afterEach(async () => {
    await kit.teardown();
  });

  describe(kit.suiteName('TaskService.updatePriority'), () => {
    it(kit.caseName('updates task priority when user is authorized'), async () => {
      permissionService.canEditTask.mockReturnValue(true);
      taskRepository.updatePriority.mockResolvedValue({ id: 't-1', priority: 'high' });

      const service = new TaskService(taskRepository as any, permissionService as any);
      const result = await kit.backend.mockDatabase(() => service.updatePriority('t-1', 'high'));

      expect(permissionService.canEditTask).toHaveBeenCalledWith('t-1', 'manager');
      expect(taskRepository.updatePriority).toHaveBeenCalledWith('t-1', 'high');
      expect(result.priority).toBe('high');
    });

    it(kit.caseName('throws when user is not authorized'), async () => {
      kit.useContext('asAdmin');
      permissionService.canEditTask.mockReturnValue(false);

      const service = new TaskService(taskRepository as any, permissionService as any);

      await expect(kit.backend.mockDatabase(() => service.updatePriority('t-1', 'high'))).rejects.toThrow(
        /not authorized/i
      );
      expect(taskRepository.updatePriority).not.toHaveBeenCalled();
    });
  });
});
```

### Key Patterns

1. `kit.setup()` / `kit.teardown()` per test lifecycle
2. Dependency isolation via `kit.backend.isolateService(...)`
3. DB/ORM boundary wrapped in `kit.backend.mockDatabase(...)`
4. Runtime hooks (`naming`, `contextHelpers`, `mockFactory`, `expect`) stay optional
5. Same pattern works with subclassing if your app needs shared helpers
