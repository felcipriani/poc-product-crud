import { z } from "zod";

export const DimensionsSchema = z.object({
  height: z.number().positive("Height must be a positive number"),
  width: z.number().positive("Width must be a positive number"),
  depth: z.number().positive("Depth must be a positive number"),
});

export type Dimensions = z.infer<typeof DimensionsSchema>;

export class DimensionsValue {
  constructor(
    public readonly height: number,
    public readonly width: number,
    public readonly depth: number
  ) {
    DimensionsSchema.parse({ height, width, depth });
  }

  static create(dimensions: Dimensions): DimensionsValue {
    return new DimensionsValue(
      dimensions.height,
      dimensions.width,
      dimensions.depth
    );
  }

  equals(other: DimensionsValue): boolean {
    return (
      this.height === other.height &&
      this.width === other.width &&
      this.depth === other.depth
    );
  }

  getVolume(): number {
    return this.height * this.width * this.depth;
  }

  toString(): string {
    return `${this.height}×${this.width}×${this.depth}cm`;
  }

  toJSON(): Dimensions {
    return {
      height: this.height,
      width: this.width,
      depth: this.depth,
    };
  }
}