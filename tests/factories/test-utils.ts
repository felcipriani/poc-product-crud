import { v4 as uuidv4 } from "uuid";
import { Product } from "@/lib/domain/entities/product";

export function createTestUuid(): string {
  return uuidv4();
}

export function createTestDate(offsetMs = 0): Date {
  return new Date(Date.now() + offsetMs);
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  const now = new Date();
  return {
    sku: "TEST-001",
    name: "Test Product",
    dimensions: undefined,
    weight: undefined,
    isComposite: false,
    hasVariation: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}