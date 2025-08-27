import "@testing-library/jest-dom";
import { beforeAll, afterEach, afterAll, vi } from "vitest";
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

// Cleanup after each test case
afterEach(() => {
  cleanup();
  localStorageMock.clear();
  vi.clearAllMocks();
});

// Setup MSW
beforeAll(() => {
  // MSW setup will go here when needed
});

afterAll(() => {
  // MSW cleanup will go here when needed
});