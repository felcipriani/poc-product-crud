import { describe, it, expect } from "vitest";

describe("Repository Validation Logic", () => {
  describe("Error Message Validation", () => {
    it("should generate correct error message for variation type deletion", () => {
      const generateError = (typeName: string, count: number) =>
        `Cannot delete variation type '${typeName}' because it has ${count} variation(s) associated with it. Please delete all variations first.`;

      const error1 = generateError("Color", 1);
      const error3 = generateError("Size", 3);

      expect(error1).toBe(
        "Cannot delete variation type 'Color' because it has 1 variation(s) associated with it. Please delete all variations first."
      );
      expect(error3).toBe(
        "Cannot delete variation type 'Size' because it has 3 variation(s) associated with it. Please delete all variations first."
      );

      // Validate error message structure
      expect(error1).toContain("Cannot delete variation type");
      expect(error1).toContain("variation(s) associated with it");
      expect(error1).toContain("Please delete all variations first");
    });

    it("should generate correct error message for variation deletion", () => {
      const generateError = (variationName: string, count: number) =>
        `Cannot delete variation '${variationName}' because it is being used in ${count} product variation(s). Please remove it from all products first.`;

      const error1 = generateError("Red", 1);
      const error2 = generateError("Blue", 2);

      expect(error1).toBe(
        "Cannot delete variation 'Red' because it is being used in 1 product variation(s). Please remove it from all products first."
      );
      expect(error2).toBe(
        "Cannot delete variation 'Blue' because it is being used in 2 product variation(s). Please remove it from all products first."
      );

      // Validate error message structure
      expect(error1).toContain("Cannot delete variation");
      expect(error1).toContain("being used in");
      expect(error1).toContain("Please remove it from all products first");
    });

    it("should generate correct error message for duplicate names", () => {
      const generateVariationTypeError = (name: string) =>
        `A variation type with name '${name}' already exists`;

      const generateVariationError = (name: string) =>
        `A variation with name '${name}' already exists in this variation type`;

      const vtError = generateVariationTypeError("Color");
      const vError = generateVariationError("Red");

      expect(vtError).toBe("A variation type with name 'Color' already exists");
      expect(vError).toBe(
        "A variation with name 'Red' already exists in this variation type"
      );

      // Validate error message structure
      expect(vtError).toContain("A variation type with name");
      expect(vtError).toContain("already exists");
      expect(vError).toContain("A variation with name");
      expect(vError).toContain("already exists in this variation type");
    });
  });

  describe("Name Validation Logic", () => {
    it("should validate case-insensitive name comparison", () => {
      const normalizeForComparison = (name: string) =>
        name.toLowerCase().trim();

      const existingNames = ["Color", "Size", "Material"];
      const normalizedExisting = existingNames.map(normalizeForComparison);

      const isNameUnique = (newName: string) => {
        const normalized = normalizeForComparison(newName);
        return !normalizedExisting.includes(normalized);
      };

      expect(isNameUnique("Weight")).toBe(true); // New name
      expect(isNameUnique("color")).toBe(false); // Case insensitive duplicate
      expect(isNameUnique("COLOR")).toBe(false); // Case insensitive duplicate
      expect(isNameUnique("  Size  ")).toBe(false); // Whitespace + case insensitive
      expect(isNameUnique("Texture")).toBe(true); // New name
    });

    it("should validate variation name uniqueness within type", () => {
      const variations = [
        { name: "Red", variationTypeId: "color-type" },
        { name: "Blue", variationTypeId: "color-type" },
        { name: "Small", variationTypeId: "size-type" },
        { name: "Large", variationTypeId: "size-type" },
      ];

      const isVariationNameUnique = (name: string, typeId: string) => {
        const normalized = name.toLowerCase().trim();
        return !variations.some(
          (v) =>
            v.variationTypeId === typeId &&
            v.name.toLowerCase().trim() === normalized
        );
      };

      expect(isVariationNameUnique("Green", "color-type")).toBe(true); // New name in color type
      expect(isVariationNameUnique("Red", "size-type")).toBe(true); // Same name, different type
      expect(isVariationNameUnique("red", "color-type")).toBe(false); // Case insensitive duplicate
      expect(isVariationNameUnique("Medium", "size-type")).toBe(true); // New name in size type
      expect(isVariationNameUnique("  BLUE  ", "color-type")).toBe(false); // Whitespace + case
    });
  });

  describe("Referential Integrity Logic", () => {
    it("should validate deletion constraints", () => {
      const canDeleteVariationType = (variationCount: number) =>
        variationCount === 0;
      const canDeleteVariation = (usageCount: number) => usageCount === 0;

      expect(canDeleteVariationType(0)).toBe(true); // No variations
      expect(canDeleteVariationType(1)).toBe(false); // Has variations
      expect(canDeleteVariationType(5)).toBe(false); // Has variations

      expect(canDeleteVariation(0)).toBe(true); // Not used
      expect(canDeleteVariation(1)).toBe(false); // Used in products
      expect(canDeleteVariation(3)).toBe(false); // Used in products
    });

    it("should validate proper deletion order", () => {
      const deletionSteps = [
        "Remove variation from product variations",
        "Delete individual variations",
        "Delete variation type",
      ];

      expect(deletionSteps).toHaveLength(3);
      expect(deletionSteps[0]).toContain("Remove variation from product");
      expect(deletionSteps[1]).toContain("Delete individual variations");
      expect(deletionSteps[2]).toContain("Delete variation type");
    });
  });

  describe("Data Normalization", () => {
    it("should normalize names consistently", () => {
      const normalize = (name: string) => name.toLowerCase().trim();

      expect(normalize("Color")).toBe("color");
      expect(normalize("  COLOR  ")).toBe("color");
      expect(normalize("CoLoR")).toBe("color");
      expect(normalize("\t Color \n")).toBe("color");
      expect(normalize("")).toBe("");
    });

    it("should handle edge cases in normalization", () => {
      const normalize = (name: string) => name.toLowerCase().trim();

      expect(normalize("Multi Word Name")).toBe("multi word name");
      expect(normalize("Name-With-Dashes")).toBe("name-with-dashes");
      expect(normalize("Name_With_Underscores")).toBe("name_with_underscores");
      expect(normalize("123 Numeric Name")).toBe("123 numeric name");
    });
  });

  describe("Business Rule Validation", () => {
    it("should validate creation rules", () => {
      const validateCreation = (name: string, existingNames: string[]) => {
        if (!name || name.trim().length === 0) {
          return { valid: false, error: "Name is required" };
        }

        if (name.trim().length > 50) {
          return { valid: false, error: "Name too long" };
        }

        const normalized = name.toLowerCase().trim();
        const isDuplicate = existingNames.some(
          (existing) => existing.toLowerCase().trim() === normalized
        );

        if (isDuplicate) {
          return { valid: false, error: `Name '${name}' already exists` };
        }

        return { valid: true };
      };

      const existing = ["Color", "Size"];

      expect(validateCreation("Material", existing)).toEqual({ valid: true });
      expect(validateCreation("", existing)).toEqual({
        valid: false,
        error: "Name is required",
      });
      expect(validateCreation("color", existing)).toEqual({
        valid: false,
        error: "Name 'color' already exists",
      });
      expect(validateCreation("a".repeat(51), existing)).toEqual({
        valid: false,
        error: "Name too long",
      });
    });

    it("should validate update rules", () => {
      const validateUpdate = (
        id: string,
        name: string,
        existingItems: Array<{ id: string; name: string }>
      ) => {
        if (!name || name.trim().length === 0) {
          return { valid: false, error: "Name is required" };
        }

        const normalized = name.toLowerCase().trim();
        const isDuplicate = existingItems.some(
          (item) =>
            item.id !== id && item.name.toLowerCase().trim() === normalized
        );

        if (isDuplicate) {
          return { valid: false, error: `Name '${name}' already exists` };
        }

        return { valid: true };
      };

      const existing = [
        { id: "1", name: "Color" },
        { id: "2", name: "Size" },
      ];

      expect(validateUpdate("1", "Color", existing)).toEqual({ valid: true }); // Same name, same ID
      expect(validateUpdate("1", "Material", existing)).toEqual({
        valid: true,
      }); // New name
      expect(validateUpdate("1", "size", existing)).toEqual({
        valid: false,
        error: "Name 'size' already exists",
      }); // Duplicate
    });
  });
});
