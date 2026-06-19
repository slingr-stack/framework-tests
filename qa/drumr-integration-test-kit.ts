/**
 * DrumrIntegrationTestKit — framework-level integration testing helpers.
 *
 * This file is the shared, agnostic base for Drumr integration tests across
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

export interface DrumrIntegrationTestKitRuntimeOptions {
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

function getGlobalExpect(): IntegrationExpect {
  const expectFn = (globalThis as { expect?: unknown }).expect;

  if (typeof expectFn !== 'function') {
    throw new Error('DrumrIntegrationTestKit requires a global Jest expect function.');
  }

  return expectFn as IntegrationExpect;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describeValueType(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  return typeof value;
}

function formatValue(value: unknown): string {
  try {
    const serialized = JSON.stringify(value, null, 2);
    return serialized ?? String(value);
  } catch {
    return String(value);
  }
}

function findFirstMismatch(actual: unknown, expected: unknown, path: string = 'body'): string | null {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      return `${path} expected an array but received ${describeValueType(actual)}.`;
    }

    if (actual.length < expected.length) {
      return `${path} expected at least ${expected.length} item(s) but received ${actual.length}.`;
    }

    for (let index = 0; index < expected.length; index += 1) {
      const mismatch = findFirstMismatch(actual[index], expected[index], `${path}[${index}]`);
      if (mismatch !== null) {
        return mismatch;
      }
    }

    return null;
  }

  if (isObject(expected)) {
    if (!isObject(actual)) {
      return `${path} expected an object but received ${describeValueType(actual)}.`;
    }

    for (const [key, value] of Object.entries(expected)) {
      if (!(key in actual)) {
        return `${path}.${key} is missing.`;
      }

      const mismatch = findFirstMismatch(actual[key], value, `${path}.${key}`);
      if (mismatch !== null) {
        return mismatch;
      }
    }

    return null;
  }

  return Object.is(actual, expected)
    ? null
    : `${path} expected ${formatValue(expected)} but received ${formatValue(actual)}.`;
}

function readErrorMessage(body: unknown): string | null {
  if (typeof body === 'string') {
    return body;
  }

  if (!isObject(body)) {
    return null;
  }

  const directMessage = body.message;
  if (typeof directMessage === 'string') {
    return directMessage;
  }

  const error = body.error;
  if (typeof error === 'string') {
    return error;
  }

  if (isObject(error) && typeof error.message === 'string') {
    return error.message;
  }

  return null;
}

export class DrumrIntegrationTestKit {
  constructor(private readonly runtime: DrumrIntegrationTestKitRuntimeOptions = {}) {}

  private expect(actual: unknown): IntegrationMatcher {
    return (this.runtime.expect ?? getGlobalExpect())(actual);
  }

  expectStatus(response: IntegrationResponse, status: number): void {
    this.expect(response.status).toBe(status);
  }

  expectOk(response: IntegrationResponse): void {
    this.expect(response.status).toBeGreaterThanOrEqual(200);
    this.expect(response.status).toBeLessThan(300);
  }

  expectCreated(response: IntegrationResponse): void {
    this.expectStatus(response, 201);
  }

  expectNoContent(response: IntegrationResponse): void {
    this.expectStatus(response, 204);
  }

  expectClientError(response: IntegrationResponse): void {
    this.expect(response.status).toBeGreaterThanOrEqual(400);
    this.expect(response.status).toBeLessThan(500);
  }

  expectServerError(response: IntegrationResponse): void {
    this.expect(response.status).toBeGreaterThanOrEqual(500);
    this.expect(response.status).toBeLessThan(600);
  }

  expectBodyDefined<TBody>(
    response: IntegrationResponse<TBody>
  ): asserts response is IntegrationResponse<NonNullable<TBody>> & { body: NonNullable<TBody> } {
    this.expect(response.body).toBeDefined();
  }

  expectBodyContains<TBody>(response: IntegrationResponse<TBody>, expected: unknown): void {
    this.expectBodyDefined(response);

    const mismatch = findFirstMismatch(response.body, expected);
    if (mismatch !== null) {
      throw new Error(
        [
          'Expected response body to contain the expected partial structure.',
          `Mismatch: ${mismatch}`,
          `Expected: ${formatValue(expected)}`,
          `Actual: ${formatValue(response.body)}`,
        ].join('\n')
      );
    }
  }

  expectBodyArray<TItem = unknown>(
    response: IntegrationResponse<TItem[]>
  ): asserts response is IntegrationResponse<TItem[]> & { body: TItem[] } {
    this.expectBodyDefined(response);
    this.expect(Array.isArray(response.body)).toBe(true);
  }

  expectErrorMessage(response: IntegrationResponse, pattern: string | RegExp): void {
    const message = readErrorMessage(response.body);

    if (typeof message !== 'string') {
      throw new Error(
        `Expected response body to contain an error message, but received ${formatValue(response.body)}.`
      );
    }

    if (typeof pattern === 'string') {
      this.expect(message).toContain(pattern);
      return;
    }

    this.expect(message).toMatch(pattern);
  }

  expectRequiredKeys<TBody extends Record<string, unknown>>(body: TBody, keys: Array<Extract<keyof TBody, string>>): void;
  expectRequiredKeys(body: unknown, keys: string[]): void;
  expectRequiredKeys(body: unknown, keys: string[]): void {
    if (!isObject(body)) {
      throw new Error(
        `Expected target to be an object when checking required keys, but received ${describeValueType(body)}.`
      );
    }

    const missingKeys = keys.filter((key) => !(key in body));
    if (missingKeys.length > 0) {
      throw new Error(
        [
          `Expected object to contain required key(s): ${keys.join(', ')}.`,
          `Missing key(s): ${missingKeys.join(', ')}.`,
          `Available key(s): ${Object.keys(body).join(', ') || '(none)'}.`,
        ].join(' ')
      );
    }
  }

  async runWithCleanup(testBody: () => Promise<void> | void, cleanup: IntegrationCleanup): Promise<void> {
    try {
      await testBody();
    } finally {
      await cleanup();
    }
  }

  async withSetupAndCleanup<TSetup>(
    setup: IntegrationSetup<TSetup>,
    testBody: IntegrationScopedTask<TSetup>,
    cleanup: IntegrationScopedTask<TSetup>
  ): Promise<void> {
    const context = await setup();

    try {
      await testBody(context);
    } finally {
      await cleanup(context);
    }
  }
}