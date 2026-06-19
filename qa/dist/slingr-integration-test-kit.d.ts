/**
 * SlingrIntegrationTestKit — framework-level integration testing helpers.
 *
 * This file is the shared, agnostic base for Slingr integration tests across
 * backend and frontend packages. Every helper in this file is intentionally
 * generic, so:
 *
 *   • Specs can reuse the same response assertions in different runtimes.
 *   • The kit stays independent from Playwright, DOM APIs, and app-specific setup.
 *   • Integration suites get a small lifecycle helper surface without unit or E2E concerns.
 *
 * The API surface is organised by generic testing concerns:
 *   - Status assertions
 *   - Body assertions
 *   - Error message assertions
 *   - Setup / cleanup lifecycle helpers
 */
type IntegrationMatcher = {
    toBe(expected: unknown): void;
    toBeDefined(): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThan(expected: number): void;
    toContain(expected: unknown): void;
    toMatch(expected: RegExp | string): void;
};
export type IntegrationExpect = (actual: unknown) => IntegrationMatcher;
type IntegrationScopedTask<TContext> = (context: TContext) => Promise<void> | void;
export interface SlingrIntegrationTestKitRuntimeOptions {
    /**
     * Assertion API injected by the test runtime, for example Jest/Vitest expect.
     */
    expect?: IntegrationExpect;
}
export type IntegrationResponse<TBody = unknown> = {
    status: number;
    body?: TBody;
};
export type IntegrationCleanup = () => Promise<void> | void;
export type IntegrationSetup<TContext> = () => Promise<TContext> | TContext;
export declare class SlingrIntegrationTestKit {
    private readonly runtime;
    constructor(runtime?: SlingrIntegrationTestKitRuntimeOptions);
    private expect;
    expectStatus(response: IntegrationResponse, status: number): void;
    expectOk(response: IntegrationResponse): void;
    expectCreated(response: IntegrationResponse): void;
    expectNoContent(response: IntegrationResponse): void;
    expectClientError(response: IntegrationResponse): void;
    expectServerError(response: IntegrationResponse): void;
    expectBodyDefined<TBody>(response: IntegrationResponse<TBody>): asserts response is IntegrationResponse<NonNullable<TBody>> & {
        body: NonNullable<TBody>;
    };
    expectBodyContains<TBody>(response: IntegrationResponse<TBody>, expected: unknown): void;
    expectBodyArray<TItem = unknown>(response: IntegrationResponse<TItem[]>): asserts response is IntegrationResponse<TItem[]> & {
        body: TItem[];
    };
    expectErrorMessage(response: IntegrationResponse, pattern: string | RegExp): void;
    expectRequiredKeys<TBody extends Record<string, unknown>>(body: TBody, keys: Array<Extract<keyof TBody, string>>): void;
    expectRequiredKeys(body: unknown, keys: string[]): void;
    runWithCleanup(testBody: () => Promise<void> | void, cleanup: IntegrationCleanup): Promise<void>;
    withSetupAndCleanup<TSetup>(setup: IntegrationSetup<TSetup>, testBody: IntegrationScopedTask<TSetup>, cleanup: IntegrationScopedTask<TSetup>): Promise<void>;
}
export {};
