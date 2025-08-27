import { z } from "zod";
import { DimensionsSchema, type Dimensions } from "../value-objects/dimensions";

export const ProductSchema = z.object({
  sku: z
    .string()
    .min(1, "SKU is required")
    .max(50, "SKU must be 50 characters or less")
    .regex(/^[A-Z0-9-]+$/, "SKU must contain only uppercase letters, numbers, and hyphens"),
  name: z
    .string()
    .min(1, "Product name is required")
    .max(100, "Product name must be 100 characters or less"),
  dimensions: DimensionsSchema.optional(),
  weight: z
    .number()
    .positive("Weight must be a positive number")
    .optional(),
  isComposite: z.boolean(),
  hasVariation: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Product = z.infer<typeof ProductSchema>;

export interface CreateProductData {
  sku: string;
  name: string;
  dimensions?: Dimensions;
  weight?: number;
  isComposite: boolean;
  hasVariation: boolean;
}

export interface UpdateProductData {
  name?: string;
  dimensions?: Dimensions;
  weight?: number;
  isComposite?: boolean;
  hasVariation?: boolean;
}

export class ProductEntity {
  constructor(
    public readonly sku: string,
    public readonly name: string,
    public readonly dimensions: Dimensions | undefined,
    public readonly weight: number | undefined,
    public readonly isComposite: boolean,
    public readonly hasVariation: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    ProductSchema.parse({
      sku,
      name,
      dimensions,
      weight,
      isComposite,
      hasVariation,
      createdAt,
      updatedAt,
    });
  }

  static create(data: CreateProductData): ProductEntity {
    const now = new Date();
    return new ProductEntity(
      data.sku,
      data.name,
      data.dimensions,
      data.weight,
      data.isComposite,
      data.hasVariation,
      now,
      now
    );
  }

  static fromJSON(data: Product): ProductEntity {
    return new ProductEntity(
      data.sku,
      data.name,
      data.dimensions,
      data.weight,
      data.isComposite,
      data.hasVariation,
      data.createdAt,
      data.updatedAt
    );
  }

  update(data: UpdateProductData): ProductEntity {
    return new ProductEntity(
      this.sku,
      data.name ?? this.name,
      data.dimensions ?? this.dimensions,
      data.weight ?? this.weight,
      data.isComposite ?? this.isComposite,
      data.hasVariation ?? this.hasVariation,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Validates business rules for the product
   */
  validateBusinessRules(): string[] {
    const errors: string[] = [];

    // If composite, weight should not be required (it's calculated)
    if (this.isComposite && this.weight !== undefined) {
      // This is allowed but weight will be ignored in favor of calculated weight
    }

    // Products can have both flags, but UI behavior changes
    if (this.isComposite && this.hasVariation) {
      // This is valid - composite products with variations use special interface
    }

    return errors;
  }

  /**
   * Checks if this product requires weight to be ignored (composite products)
   */
  shouldIgnoreWeight(): boolean {
    return this.isComposite;
  }

  /**
   * Checks if this product can be used directly in compositions
   * Variable products cannot be used directly - only their specific variations
   */
  canBeUsedInComposition(): boolean {
    return !this.hasVariation;
  }

  toJSON(): Product {
    return {
      sku: this.sku,
      name: this.name,
      dimensions: this.dimensions,
      weight: this.weight,
      isComposite: this.isComposite,
      hasVariation: this.hasVariation,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}