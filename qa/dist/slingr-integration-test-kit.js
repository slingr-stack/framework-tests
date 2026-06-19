"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlingrIntegrationTestKit = void 0;
function getGlobalExpect() {
    const expectFn = globalThis.expect;
    if (typeof expectFn !== 'function') {
        throw new Error('SlingrIntegrationTestKit requires a global Jest expect function.');
    }
    return expectFn;
}
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function describeValueType(value) {
    if (value === null) {
        return 'null';
    }
    if (Array.isArray(value)) {
        return 'array';
    }
    return typeof value;
}
function formatValue(value) {
    try {
        const serialized = JSON.stringify(value, null, 2);
        return serialized ?? String(value);
    }
    catch {
        return String(value);
    }
}
function findFirstMismatch(actual, expected, path = 'body') {
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
function readErrorMessage(body) {
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
class SlingrIntegrationTestKit {
    runtime;
    constructor(runtime = {}) {
        this.runtime = runtime;
    }
    expect(actual) {
        return (this.runtime.expect ?? getGlobalExpect())(actual);
    }
    expectStatus(response, status) {
        this.expect(response.status).toBe(status);
    }
    expectOk(response) {
        this.expect(response.status).toBeGreaterThanOrEqual(200);
        this.expect(response.status).toBeLessThan(300);
    }
    expectCreated(response) {
        this.expectStatus(response, 201);
    }
    expectNoContent(response) {
        this.expectStatus(response, 204);
    }
    expectClientError(response) {
        this.expect(response.status).toBeGreaterThanOrEqual(400);
        this.expect(response.status).toBeLessThan(500);
    }
    expectServerError(response) {
        this.expect(response.status).toBeGreaterThanOrEqual(500);
        this.expect(response.status).toBeLessThan(600);
    }
    expectBodyDefined(response) {
        this.expect(response.body).toBeDefined();
    }
    expectBodyContains(response, expected) {
        this.expectBodyDefined(response);
        const mismatch = findFirstMismatch(response.body, expected);
        if (mismatch !== null) {
            throw new Error([
                'Expected response body to contain the expected partial structure.',
                `Mismatch: ${mismatch}`,
                `Expected: ${formatValue(expected)}`,
                `Actual: ${formatValue(response.body)}`,
            ].join('\n'));
        }
    }
    expectBodyArray(response) {
        this.expectBodyDefined(response);
        this.expect(Array.isArray(response.body)).toBe(true);
    }
    expectErrorMessage(response, pattern) {
        const message = readErrorMessage(response.body);
        if (typeof message !== 'string') {
            throw new Error(`Expected response body to contain an error message, but received ${formatValue(response.body)}.`);
        }
        if (typeof pattern === 'string') {
            this.expect(message).toContain(pattern);
            return;
        }
        this.expect(message).toMatch(pattern);
    }
    expectRequiredKeys(body, keys) {
        if (!isObject(body)) {
            throw new Error(`Expected target to be an object when checking required keys, but received ${describeValueType(body)}.`);
        }
        const missingKeys = keys.filter((key) => !(key in body));
        if (missingKeys.length > 0) {
            throw new Error([
                `Expected object to contain required key(s): ${keys.join(', ')}.`,
                `Missing key(s): ${missingKeys.join(', ')}.`,
                `Available key(s): ${Object.keys(body).join(', ') || '(none)'}.`,
            ].join(' '));
        }
    }
    async runWithCleanup(testBody, cleanup) {
        try {
            await testBody();
        }
        finally {
            await cleanup();
        }
    }
    async withSetupAndCleanup(setup, testBody, cleanup) {
        const context = await setup();
        try {
            await testBody(context);
        }
        finally {
            await cleanup(context);
        }
    }
}
exports.SlingrIntegrationTestKit = SlingrIntegrationTestKit;
//# sourceMappingURL=slingr-integration-test-kit.js.map