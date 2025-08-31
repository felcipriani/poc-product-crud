import { vi, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Mock browser APIs not implemented in jsdom
Object.defineProperty(window, "alert", {
  value: vi.fn(),
});

Object.defineProperty(window, "location", {
  value: {
    ...window.location,
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(HTMLFormElement.prototype, "requestSubmit", {
  value: function () {
    this.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
  },
});

// Mock crypto for UUID generation
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => {
      // Generate a valid UUID v4 format
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c == "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }
      );
    },
  },
});

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  localStorageMock.clear();
  vi.clearAllMocks();
});

// Setup MSW placeholders
beforeAll(() => {
  // MSW setup will go here when needed
});

afterAll(() => {
  // MSW cleanup will go here when needed
});
