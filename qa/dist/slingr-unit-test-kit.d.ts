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
    renderWithProviders(component: unknown, options?: {
        context?: AppContext;
        props?: Record<string, unknown>;
    }): unknown;
    /**
     * Generic event simulator wrapper.
     */
    fireEvent(target: unknown, eventName: string, payload?: unknown): Promise<void> | void;
    /**
     * Cleans mounted trees and frontend mocks.
     */
    cleanup(): Promise<void> | void;
}
export interface SlingrUnitTestKitOptions<AppContext extends object = Record<string, unknown>> {
    context?: AppContext;
    backend: UnitBackendTestUtils<AppContext>;
    frontend: UnitFrontendTestUtils<AppContext>;
    runtime?: SlingrUnitTestKitRuntimeOptions<AppContext>;
}
export type UnitAutoResetPolicy = 'teardown' | 'manual';
export interface SlingrUnitTestKitRuntimeOptions<AppContext extends object = Record<string, unknown>> {
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
 * SlingrUnitTestKit
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
export declare class SlingrUnitTestKit<AppContext extends object = Record<string, unknown>> {
    protected readonly options: SlingrUnitTestKitOptions<AppContext>;
    protected contextValue: AppContext;
    protected readonly runtime: Required<Pick<SlingrUnitTestKitRuntimeOptions<AppContext>, 'autoReset' | 'contextHelpers' | 'naming'>> & Pick<SlingrUnitTestKitRuntimeOptions<AppContext>, 'expect' | 'mockFactory'>;
    constructor(options: SlingrUnitTestKitOptions<AppContext>);
    /**
     * Shared lifecycle setup.
     */
    setup(): Promise<this>;
    /**
     * Shared lifecycle teardown.
     */
    teardown(): Promise<void>;
    /**
     * Readonly context accessor.
     */
    get context(): Readonly<AppContext>;
    /**
     * Merges and re-injects context.
     */
    withContext(patch: Partial<AppContext>): this;
    /**
     * Applies a named context helper patch and re-injects context.
     */
    useContext(name: string): this;
    /**
     * Returns suite name with optional runtime prefix.
     */
    suiteName(name: string): string;
    /**
     * Returns test case name with optional runtime prefix.
     */
    caseName(name: string): string;
    /**
     * Creates a mock via injected mock factory when available.
     */
    makeMock<T>(factory: () => T): T;
    /**
     * Returns injected assertion API.
     */
    get assertion(): unknown;
    private withPrefix;
    /**
     * Ordered backend unit-testing API.
     */
    readonly backend: {
        mockDatabase: <T>(factory: () => T | Promise<T>) => Promise<T>;
        isolateService: <T>(token: string | symbol, implementation: T) => void;
        reset: () => Promise<void>;
    };
    /**
     * Ordered frontend unit-testing API.
     */
    readonly frontend: {
        renderWithProviders: (component: unknown, options?: {
            context?: AppContext;
            props?: Record<string, unknown>;
        }) => unknown;
        fireEvent: (target: unknown, eventName: string, payload?: unknown) => Promise<void>;
        cleanup: () => Promise<void>;
    };
}
