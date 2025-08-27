import { z } from "zod";
import { DimensionsSchema, type Dimensions } from "../value-objects/dimensions";

export const ProductVariationItemSchema = z.object({
  id: z.string().uuid("Invalid product variation item ID"),
  productSku: z.string().min(1, "Product SKU is required"),
  selections: z.record(z.string().uuid(), z.string().uuid()),
  name: z.string().optional(),
  weightOverride: z.number().positive().optional(),
  dimensionsOverride: DimensionsSchema.optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ProductVariationItem = z.infer<typeof ProductVariationItemSchema>;

export interface CreateProductVariationItemData {
  productSku: string;
  selections: Record<string, string>; // variationTypeId -> variationId
  name?: string;
  weightOverride?: number;
  dimensionsOverride?: Dimensions;
}

export interface UpdateProductVariationItemData {
  selections?: Record<string, string>;
  name?: string;
  weightOverride?: number;
  dimensionsOverride?: Dimensions;
}

export class ProductVariationItemEntity {
  constructor(
    public readonly id: string,
    public readonly productSku: string,
    public readonly selections: Record<string, string>,
    public readonly name: string | undefined,
    public readonly weightOverride: number | undefined,
    public readonly dimensionsOverride: Dimensions | undefined,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    ProductVariationItemSchema.parse({
      id,
      productSku,
      selections,
      name,
      weightOverride,
      dimensionsOverride,
      createdAt,
      updatedAt,
    });
  }

  static create(id: string, data: CreateProductVariationItemData): ProductVariationItemEntity {
    const now = new Date();
    return new ProductVariationItemEntity(
      id,
      data.productSku,
      data.selections,
      data.name,
      data.weightOverride,
      data.dimensionsOverride,
      now,
      now
    );
  }

  static fromJSON(data: ProductVariationItem): ProductVariationItemEntity {
    return new ProductVariationItemEntity(
      data.id,
      data.productSku,
      data.selections,
      data.name,
      data.weightOverride,
      data.dimensionsOverride,
      data.createdAt,
      data.updatedAt
    );
  }

  update(data: UpdateProductVariationItemData): ProductVariationItemEntity {
    return new ProductVariationItemEntity(
      this.id,
      this.productSku,
      data.selections ?? this.selections,
      data.name ?? this.name,
      data.weightOverride ?? this.weightOverride,
      data.dimensionsOverride ?? this.dimensionsOverride,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Creates a canonical hash for uniqueness validation
   * Sorts variation type IDs to ensure consistent ordering
   */
  getSelectionHash(): string {
    const sortedEntries = Object.entries(this.selections)
      .sort(([a], [b]) => a.localeCompare(b));
    
    return sortedEntries
      .map(([typeId, variationId]) => `${typeId}:${variationId}`)
      .join("|");
  }

  /**
   * Checks if this combination has the same selections as another
   */
  hasSameSelections(other: ProductVariationItemEntity): boolean {
    return this.getSelectionHash() === other.getSelectionHash();
  }

  /**
   * Gets the variation type IDs that have selections
   */
  getVariationTypeIds(): string[] {
    return Object.keys(this.selections);
  }

  /**
   * Gets the variation ID for a specific variation type
   */
  getVariationId(variationTypeId: string): string | undefined {
    return this.selections[variationTypeId];
  }

  /**
   * Checks if this combination has a selection for the given variation type
   */
  hasSelectionForType(variationTypeId: string): boolean {
    return variationTypeId in this.selections;
  }

  /**
   * Creates a display-friendly SKU for this variation combination
   */
  getVariationSku(): string {
    const hash = this.getSelectionHash().substring(0, 8);
    return `${this.productSku}-VAR-${hash}`;
  }

  toJSON(): ProductVariationItem {
    return {
      id: this.id,
      productSku: this.productSku,
      selections: this.selections,
      name: this.name,
      weightOverride: this.weightOverride,
      dimensionsOverride: this.dimensionsOverride,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}