import { z } from "zod";

export const VariationSchema = z.object({
  id: z.string().uuid("Invalid variation ID"),
  variationTypeId: z.string().uuid("Invalid variation type ID"),
  name: z
    .string()
    .min(1, "Variation name is required")
    .max(50, "Variation name must be 50 characters or less"),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Variation = z.infer<typeof VariationSchema>;

export interface CreateVariationData {
  variationTypeId: string;
  name: string;
}

export interface UpdateVariationData {
  name?: string;
  variationTypeId?: string;
}

export class VariationEntity {
  constructor(
    public readonly id: string,
    public readonly variationTypeId: string,
    public readonly name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    VariationSchema.parse({
      id,
      variationTypeId,
      name,
      createdAt,
      updatedAt,
    });
  }

  static create(id: string, data: CreateVariationData): VariationEntity {
    const now = new Date();
    return new VariationEntity(
      id,
      data.variationTypeId,
      data.name,
      now,
      now
    );
  }

  static fromJSON(data: Variation): VariationEntity {
    return new VariationEntity(
      data.id,
      data.variationTypeId,
      data.name,
      data.createdAt,
      data.updatedAt
    );
  }

  update(data: UpdateVariationData): VariationEntity {
    return new VariationEntity(
      this.id,
      data.variationTypeId ?? this.variationTypeId,
      data.name ?? this.name,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Normalizes name for case-insensitive comparison within the same type
   */
  getNormalizedName(): string {
    return this.name.toLowerCase().trim();
  }

  /**
   * Creates a unique key for this variation within its type
   */
  getTypeUniqueKey(): string {
    return `${this.variationTypeId}:${this.getNormalizedName()}`;
  }

  toJSON(): Variation {
    return {
      id: this.id,
      variationTypeId: this.variationTypeId,
      name: this.name,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}