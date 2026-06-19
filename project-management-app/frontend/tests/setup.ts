// @ts-nocheck
import 'reflect-metadata';
import { jest } from '@jest/globals';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type TestGlobal = typeof globalThis & {
  matchMedia?: (query: string) => {
    matches: boolean;
    media: string;
    onchange: null;
    addListener: jest.Mock;
    removeListener: jest.Mock;
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
    dispatchEvent: jest.Mock;
  };
  ResizeObserver?: new () => {
    observe(): void;
    unobserve(): void;
    disconnect(): void;
  };
  HTMLElement?: {
    prototype: {
      scrollIntoView?: jest.Mock;
    };
  };
};

const testGlobal = globalThis as TestGlobal;

if (!testGlobal.matchMedia) {
  Object.defineProperty(testGlobal, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }),
  });
}

if (typeof window !== 'undefined') {
  window.getComputedStyle = ((_: Element, __?: string) => {
    return {
      getPropertyValue: () => '',
    } as CSSStyleDeclaration;
  }) as typeof window.getComputedStyle;
}

if (typeof testGlobal.ResizeObserver === 'undefined') {
  class ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  testGlobal.ResizeObserver = ResizeObserver;
}

if (
  testGlobal.HTMLElement &&
  !testGlobal.HTMLElement.prototype.scrollIntoView
) {
  testGlobal.HTMLElement.prototype.scrollIntoView = jest.fn();
}
