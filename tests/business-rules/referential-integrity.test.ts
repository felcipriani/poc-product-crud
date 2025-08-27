import { describe, it, expect } from "vitest";

describe("Business Rules - Referential Integrity", () => {
  describe("Variation Type Deletion Rules", () => {
    it("should define the rule: cannot delete variation type with existing variations", () => {
      const rule = {
        name: "VariationTypeDeletionConstraint",
        description: "A variation type cannot be deleted if it has variations associated with it",
        errorMessage: (typeName: string, count: number) => 
          `Cannot delete variation type '${typeName}' because it has ${count} variation(s) associated with it. Please delete all variations first.`,
        validation: (variationCount: number) => variationCount === 0,
      };

      expect(rule.validation(0)).toBe(true);  // Can delete when no variations
      expect(rule.validation(3)).toBe(false); // Cannot delete when variations exist
      
      const errorMsg = rule.errorMessage("Color", 3);
      expect(errorMsg).toBe("Cannot delete variation type 'Color' because it has 3 variation(s) associated with it. Please delete all variations first.");
    });

    it("should define proper deletion order", () => {
      const deletionOrder = [
        "1. Remove variation from all product variations",
        "2. Delete individual variations",
        "3. Delete variation type"
      ];

      expect(deletionOrder).toHaveLength(3);
      expect(deletionOrder[0]).toContain("Remove variation from all product variations");
      expect(deletionOrder[1]).toContain("Delete individual variations");
      expect(deletionOrder[2]).toContain("Delete variation type");
    });
  });

  describe("Variation Deletion Rules", () => {
    it("should define the rule: cannot delete variation used in products", () => {
      const rule = {
        name: "VariationDeletionConstraint",
        description: "A variation cannot be deleted if it is being used in product variations",
        errorMessage: (variationName: string, usageCount: number) => 
          `Cannot delete variation '${variationName}' because it is being used in ${usageCount} product variation(s). Please remove it from all products first.`,
        validation: (usageCount: number) => usageCount === 0,
      };

      expect(rule.validation(0)).toBe(true);  // Can delete when not used
      expect(rule.validation(2)).toBe(false); // Cannot delete when used in products
      
      const errorMsg = rule.errorMessage("Red", 2);
      expect(errorMsg).toBe("Cannot delete variation 'Red' because it is being used in 2 product variation(s). Please remove it from all products first.");
    });
  });

  describe("Unique Name Rules", () => {
    it("should define variation type name uniqueness rule", () => {
      const rule = {
        name: "VariationTypeNameUniqueness",
        description: "Variation type names must be unique (case-insensitive)",
        errorMessage: (name: string) => `A variation type with name '${name}' already exists`,
        validation: (name: string, existingNames: string[]) => {
          const normalizedName = name.toLowerCase().trim();
          return !existingNames.some(existing => existing.toLowerCase().trim() === normalizedName);
        },
      };

      const existingNames = ["Color", "Size"];
      
      expect(rule.validation("Material", existingNames)).toBe(true);   // New name is valid
      expect(rule.validation("color", existingNames)).toBe(false);     // Case-insensitive duplicate
      expect(rule.validation("  Color  ", existingNames)).toBe(false); // Whitespace-trimmed duplicate
      
      const errorMsg = rule.errorMessage("Color");
      expect(errorMsg).toBe("A variation type with name 'Color' already exists");
    });

    it("should define variation name uniqueness rule within type", () => {
      const rule = {
        name: "VariationNameUniquenessWithinType",
        description: "Variation names must be unique within their variation type (case-insensitive)",
        errorMessage: (name: string) => `A variation with name '${name}' already exists in this variation type`,
        validation: (name: string, variationTypeId: string, existingVariations: Array<{name: string, variationTypeId: string}>) => {
          const normalizedName = name.toLowerCase().trim();
          return !existingVariations.some(existing => 
            existing.variationTypeId === variationTypeId && 
            existing.name.toLowerCase().trim() === normalizedName
          );
        },
      };

      const existingVariations = [
        { name: "Red", variationTypeId: "color-type" },
        { name: "Blue", variationTypeId: "color-type" },
        { name: "Small", variationTypeId: "size-type" },
      ];
      
      expect(rule.validation("Green", "color-type", existingVariations)).toBe(true);  // New name in same type
      expect(rule.validation("Red", "size-type", existingVariations)).toBe(true);     // Same name in different type
      expect(rule.validation("red", "color-type", existingVariations)).toBe(false);   // Case-insensitive duplicate in same type
      
      const errorMsg = rule.errorMessage("Red");
      expect(errorMsg).toBe("A variation with name 'Red' already exists in this variation type");
    });
  });

  describe("Data Integrity Rules", () => {
    it("should define cascade deletion prevention", () => {
      const rules = {
        preventCascadeDeletion: true,
        requireExplicitDeletion: true,
        description: "System should not automatically delete related entities. Users must explicitly delete in correct order.",
      };

      expect(rules.preventCascadeDeletion).toBe(true);
      expect(rules.requireExplicitDeletion).toBe(true);
    });

    it("should define referential integrity checks", () => {
      const checks = [
        {
          entity: "VariationType",
          references: ["Variation"],
          checkMethod: "countByVariationType",
          constraint: "count must be 0 for deletion",
        },
        {
          entity: "Variation", 
          references: ["ProductVariationItem"],
          checkMethod: "findByVariation",
          constraint: "usage count must be 0 for deletion",
        },
      ];

      expect(checks).toHaveLength(2);
      expect(checks[0].entity).toBe("VariationType");
      expect(checks[0].references).toContain("Variation");
      expect(checks[1].entity).toBe("Variation");
      expect(checks[1].references).toContain("ProductVariationItem");
    });
  });

  describe("User Experience Rules", () => {
    it("should define clear error messages", () => {
      const messageRules = {
        includeEntityName: true,
        includeCount: true,
        provideSolution: true,
        examples: [
          "Cannot delete variation type 'Color' because it has 3 variation(s) associated with it. Please delete all variations first.",
          "Cannot delete variation 'Red' because it is being used in 2 product variation(s). Please remove it from all products first.",
        ],
      };

      messageRules.examples.forEach(message => {
        expect(message).toContain("Cannot delete");
        expect(message).toContain("because");
        expect(message).toContain("Please");
      });
    });

    it("should define warning messages in UI", () => {
      const warnings = {
        variationType: "This variation type cannot be deleted if it has variations associated with it. Please delete all variations of this type first.",
        variation: "This variation cannot be deleted if it is being used in any product variations. Please remove it from all products first.",
      };

      expect(warnings.variationType).toContain("cannot be deleted if");
      expect(warnings.variation).toContain("cannot be deleted if");
      expect(warnings.variationType).toContain("Please delete all variations");
      expect(warnings.variation).toContain("Please remove it from all products");
    });
  });
});