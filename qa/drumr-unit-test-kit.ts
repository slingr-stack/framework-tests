/**
 * Base utilities contract for backend unit tests.
 */
export interface UnitBackendTestUtils<AppContext extends object = Record<string, unknown>> {
  /**
   * Replaces ORM/DB collaborators with deterministic mocks.
   */
  mockDatabase<T>(factory: () => T | Promise<T>): Promise<T>;

  /**
   * Registers a service mock in the test DI container.
   */
  isolateService<T>(token: string | symbol, implementation: T): void;

  /**
   * Injects framework/app context into test execution.
   */
  setContext(context: AppContext): void;

  /**
   * Resets spies, mocks and container state.
   */
  reset(): Promise<void> | void;
}

/**
 * Base utilities contract for frontend unit tests.
 */
export interface UnitFrontendTestUtils<AppContext extends object = Record<string, unknown>> {
  /**
   * Generic UI render wrapper with app providers.
   */
  renderWithProviders(component: unknown, options?: { context?: AppContext; props?: Record<string, unknown> }): unknown;

  /**
   * Generic event simulator wrapper.
   */
  fireEvent(target: unknown, eventName: string, payload?: unknown): Promise<void> | void;

  /**
   * Cleans mounted trees and frontend mocks.
   */
  cleanup(): Promise<void> | void;
}

export interface DrumrUnitTestKitOptions<AppContext extends object = Record<string, unknown>> {
  context?: AppContext;
  backend: UnitBackendTestUtils<AppContext>;
  frontend: UnitFrontendTestUtils<AppContext>;
  runtime?: DrumrUnitTestKitRuntimeOptions<AppContext>;
}

export type UnitAutoResetPolicy = 'teardown' | 'manual';

export interface DrumrUnitTestKitRuntimeOptions<AppContext extends object = Record<string, unknown>> {
  /**
   * Assertion API injected by the test runtime (for example Jest/Vitest expect).
   */
  expect?: unknown;

  /**
   * Optional generic mock factory injected by the test runtime.
   */
  mockFactory?: <T>(factory: () => T) => T;

  /**
   * Controls whether backend.reset() runs automatically on teardown.
   * Defaults to `teardown` to preserve backward compatibility.
   */
  autoReset?: UnitAutoResetPolicy;

  /**
   * Optional prefixes for test naming helpers.
   */
  naming?: {
    suitePrefix?: string;
    casePrefix?: string;
  };

  /**
   * Optional named context helpers that produce context patches.
   */
  contextHelpers?: Record<string, (context: Readonly<AppContext>) => Partial<AppContext>>;
}

/**
 * DrumrUnitTestKit
 *
 * Framework-level, app-agnostic base class for unit tests.
 *
 * ## How app repositories should use this class
 *
 * 1) Extend this class in the app test package.
 * 2) Provide concrete backend/frontend adapters (Jest/Vitest, RTL, DI/ORM strategy).
 * 3) Add app-specific helpers in the subclass (for example model fixtures or role presets).
 *
 * This base class must remain generic and MUST NOT include business entities
 * or app-specific flows.
 */
export class DrumrUnitTestKit<AppContext extends object = Record<string, unknown>> {
  protected contextValue: AppContext;
  protected readonly runtime: Required<
    Pick<DrumrUnitTestKitRuntimeOptions<AppContext>, 'autoReset' | 'contextHelpers' | 'naming'>
  > &
    Pick<DrumrUnitTestKitRuntimeOptions<AppContext>, 'expect' | 'mockFactory'>;

  constructor(protected readonly options: DrumrUnitTestKitOptions<AppContext>) {
    this.contextValue = options.context ?? ({} as AppContext);
    this.runtime = {
      autoReset: options.runtime?.autoReset ?? 'teardown',
      contextHelpers: options.runtime?.contextHelpers ?? {},
      naming: options.runtime?.naming ?? {},
      expect: options.runtime?.expect,
      mockFactory: options.runtime?.mockFactory,
    };
  }

  /**
   * Shared lifecycle setup.
   */
  async setup(): Promise<this> {
    this.options.backend.setContext(this.contextValue);
    return this;
  }

  /**
   * Shared lifecycle teardown.
   */
  async teardown(): Promise<void> {
    await this.options.frontend.cleanup();
    if (this.runtime.autoReset === 'teardown') {
      await this.options.backend.reset();
    }
  }

  /**
   * Readonly context accessor.
   */
  get context(): Readonly<AppContext> {
    return this.contextValue;
  }

  /**
   * Merges and re-injects context.
   */
  withContext(patch: Partial<AppContext>): this {
    this.contextValue = { ...this.contextValue, ...patch };
    this.options.backend.setContext(this.contextValue);
    return this;
  }

  /**
   * Applies a named context helper patch and re-injects context.
   */
  useContext(name: string): this {
    const helper = this.runtime.contextHelpers[name];
    if (!helper) {
      throw new Error(`Context helper '${name}' is not configured.`);
    }
    return this.withContext(helper(this.contextValue));
  }

  /**
   * Returns suite name with optional runtime prefix.
   */
  suiteName(name: string): string {
    return this.withPrefix(name, this.runtime.naming.suitePrefix);
  }

  /**
   * Returns test case name with optional runtime prefix.
   */
  caseName(name: string): string {
    return this.withPrefix(name, this.runtime.naming.casePrefix);
  }

  /**
   * Creates a mock via injected mock factory when available.
   */
  makeMock<T>(factory: () => T): T {
    return this.runtime.mockFactory ? this.runtime.mockFactory(factory) : factory();
  }

  /**
   * Returns injected assertion API.
   */
  get assertion(): unknown {
    return this.runtime.expect;
  }

  private withPrefix(name: string, prefix?: string): string {
    return prefix ? `${prefix} ${name}` : name;
  }

  /**
   * Ordered backend unit-testing API.
   */
  readonly backend = {
    mockDatabase: async <T>(factory: () => T | Promise<T>): Promise<T> => {
      return this.options.backend.mockDatabase(factory);
    },
    isolateService: <T>(token: string | symbol, implementation: T): void => {
      this.options.backend.isolateService(token, implementation);
    },
    reset: async (): Promise<void> => {
      await this.options.backend.reset();
    },
  };

  /**
   * Ordered frontend unit-testing API.
   */
  readonly frontend = {
    renderWithProviders: (
      component: unknown,
      options?: { context?: AppContext; props?: Record<string, unknown> },
    ): unknown => {
      return this.options.frontend.renderWithProviders(component, {
        ...options,
        context: options?.context ?? this.contextValue,
      });
    },
    fireEvent: async (target: unknown, eventName: string, payload?: unknown): Promise<void> => {
      await this.options.frontend.fireEvent(target, eventName, payload);
    },
    cleanup: async (): Promise<void> => {
      await this.options.frontend.cleanup();
    },
  };
}
