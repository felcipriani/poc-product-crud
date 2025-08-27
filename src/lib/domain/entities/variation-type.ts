import { z } from "zod";

export const VariationTypeSchema = z.object({
  id: z.string().uuid("Invalid variation type ID"),
  name: z
    .string()
    .min(1, "Variation type name is required")
    .max(50, "Variation type name must be 50 characters or less"),
  modifiesWeight: z.boolean(),
  modifiesDimensions: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type VariationType = z.infer<typeof VariationTypeSchema>;

export interface CreateVariationTypeData {
  name: string;
  modifiesWeight: boolean;
  modifiesDimensions: boolean;
}

export interface UpdateVariationTypeData {
  name?: string;
  modifiesWeight?: boolean;
  modifiesDimensions?: boolean;
}

export class VariationTypeEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly modifiesWeight: boolean,
    public readonly modifiesDimensions: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    VariationTypeSchema.parse({
      id,
      name,
      modifiesWeight,
      modifiesDimensions,
      createdAt,
      updatedAt,
    });
  }

  static create(id: string, data: CreateVariationTypeData): VariationTypeEntity {
    const now = new Date();
    return new VariationTypeEntity(
      id,
      data.name,
      data.modifiesWeight,
      data.modifiesDimensions,
      now,
      now
    );
  }

  static fromJSON(data: VariationType): VariationTypeEntity {
    return new VariationTypeEntity(
      data.id,
      data.name,
      data.modifiesWeight,
      data.modifiesDimensions,
      data.createdAt,
      data.updatedAt
    );
  }

  update(data: UpdateVariationTypeData): VariationTypeEntity {
    return new VariationTypeEntity(
      this.id,
      data.name ?? this.name,
      data.modifiesWeight ?? this.modifiesWeight,
      data.modifiesDimensions ?? this.modifiesDimensions,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Normalizes name for case-insensitive comparison
   */
  getNormalizedName(): string {
    return this.name.toLowerCase().trim();
  }

  /**
   * Checks if this variation type affects product calculations
   */
  affectsCalculations(): boolean {
    return this.modifiesWeight || this.modifiesDimensions;
  }

  toJSON(): VariationType {
    return {
      id: this.id,
      name: this.name,
      modifiesWeight: this.modifiesWeight,
      modifiesDimensions: this.modifiesDimensions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}