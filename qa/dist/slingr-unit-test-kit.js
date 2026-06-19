"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlingrUnitTestKit = void 0;
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
class SlingrUnitTestKit {
    options;
    contextValue;
    runtime;
    constructor(options) {
        this.options = options;
        this.contextValue = options.context ?? {};
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
    async setup() {
        this.options.backend.setContext(this.contextValue);
        return this;
    }
    /**
     * Shared lifecycle teardown.
     */
    async teardown() {
        await this.options.frontend.cleanup();
        if (this.runtime.autoReset === 'teardown') {
            await this.options.backend.reset();
        }
    }
    /**
     * Readonly context accessor.
     */
    get context() {
        return this.contextValue;
    }
    /**
     * Merges and re-injects context.
     */
    withContext(patch) {
        this.contextValue = { ...this.contextValue, ...patch };
        this.options.backend.setContext(this.contextValue);
        return this;
    }
    /**
     * Applies a named context helper patch and re-injects context.
     */
    useContext(name) {
        const helper = this.runtime.contextHelpers[name];
        if (!helper) {
            throw new Error(`Context helper '${name}' is not configured.`);
        }
        return this.withContext(helper(this.contextValue));
    }
    /**
     * Returns suite name with optional runtime prefix.
     */
    suiteName(name) {
        return this.withPrefix(name, this.runtime.naming.suitePrefix);
    }
    /**
     * Returns test case name with optional runtime prefix.
     */
    caseName(name) {
        return this.withPrefix(name, this.runtime.naming.casePrefix);
    }
    /**
     * Creates a mock via injected mock factory when available.
     */
    makeMock(factory) {
        return this.runtime.mockFactory ? this.runtime.mockFactory(factory) : factory();
    }
    /**
     * Returns injected assertion API.
     */
    get assertion() {
        return this.runtime.expect;
    }
    withPrefix(name, prefix) {
        return prefix ? `${prefix} ${name}` : name;
    }
    /**
     * Ordered backend unit-testing API.
     */
    backend = {
        mockDatabase: async (factory) => {
            return this.options.backend.mockDatabase(factory);
        },
        isolateService: (token, implementation) => {
            this.options.backend.isolateService(token, implementation);
        },
        reset: async () => {
            await this.options.backend.reset();
        },
    };
    /**
     * Ordered frontend unit-testing API.
     */
    frontend = {
        renderWithProviders: (component, options) => {
            return this.options.frontend.renderWithProviders(component, {
                ...options,
                context: options?.context ?? this.contextValue,
            });
        },
        fireEvent: async (target, eventName, payload) => {
            await this.options.frontend.fireEvent(target, eventName, payload);
        },
        cleanup: async () => {
            await this.options.frontend.cleanup();
        },
    };
}
exports.SlingrUnitTestKit = SlingrUnitTestKit;
//# sourceMappingURL=slingr-unit-test-kit.js.map