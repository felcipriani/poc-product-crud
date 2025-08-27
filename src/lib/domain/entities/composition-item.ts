import { z } from "zod";

export const CompositionItemSchema = z.object({
  id: z.string().uuid("Invalid composition item ID"),
  parentSku: z.string().min(1, "Parent SKU is required"),
  childSku: z.string().min(1, "Child SKU is required"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CompositionItem = z.infer<typeof CompositionItemSchema>;

export interface CreateCompositionItemData {
  parentSku: string;
  childSku: string;
  quantity: number;
}

export interface UpdateCompositionItemData {
  childSku?: string;
  quantity?: number;
}

export class CompositionItemEntity {
  constructor(
    public readonly id: string,
    public readonly parentSku: string,
    public readonly childSku: string,
    public readonly quantity: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    CompositionItemSchema.parse({
      id,
      parentSku,
      childSku,
      quantity,
      createdAt,
      updatedAt,
    });
  }

  static create(id: string, data: CreateCompositionItemData): CompositionItemEntity {
    const now = new Date();
    return new CompositionItemEntity(
      id,
      data.parentSku,
      data.childSku,
      data.quantity,
      now,
      now
    );
  }

  static fromJSON(data: CompositionItem): CompositionItemEntity {
    return new CompositionItemEntity(
      data.id,
      data.parentSku,
      data.childSku,
      data.quantity,
      data.createdAt,
      data.updatedAt
    );
  }

  update(data: UpdateCompositionItemData): CompositionItemEntity {
    return new CompositionItemEntity(
      this.id,
      this.parentSku,
      data.childSku ?? this.childSku,
      data.quantity ?? this.quantity,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Validates business rules for composition items
   */
  validateBusinessRules(): string[] {
    const errors: string[] = [];

    // Cannot compose a product with itself
    if (this.parentSku === this.childSku) {
      errors.push("A product cannot be composed of itself");
    }

    // Quantity must be positive
    if (this.quantity <= 0) {
      errors.push("Quantity must be greater than zero");
    }

    return errors;
  }

  /**
   * Checks if this is a variation SKU (contains variation identifier)
   */
  isChildVariation(): boolean {
    return this.childSku.includes("-VAR-") || this.childSku.includes(":");
  }

  /**
   * Gets the base product SKU from a variation SKU
   */
  getChildBaseSku(): string {
    if (this.isChildVariation()) {
      // Handle both formats: "PRODUCT-VAR-hash" and "PRODUCT:variation"
      const varIndex = this.childSku.indexOf("-VAR-");
      if (varIndex !== -1) {
        return this.childSku.substring(0, varIndex);
      }
      
      const colonIndex = this.childSku.indexOf(":");
      if (colonIndex !== -1) {
        return this.childSku.substring(0, colonIndex);
      }
    }
    
    return this.childSku;
  }

  /**
   * Creates a unique key for this composition relationship
   */
  getCompositionKey(): string {
    return `${this.parentSku}:${this.childSku}`;
  }

  toJSON(): CompositionItem {
    return {
      id: this.id,
      parentSku: this.parentSku,
      childSku: this.childSku,
      quantity: this.quantity,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}