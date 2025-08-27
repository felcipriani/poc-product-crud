#!/usr/bin/env node
// Simple seed script to generate demo data for the application.

const fs = require("fs");

const demoData = {
  products: [
    {
      sku: "PROD-001",
      name: "Base Product",
      weight: 1.2,
      dimensions: { height: 10, width: 5, depth: 2 },
      isComposite: false,
      hasVariation: false,
    },
    {
      sku: "COMP-001",
      name: "Composite Product",
      weight: 0,
      dimensions: { height: 20, width: 10, depth: 4 },
      isComposite: true,
      hasVariation: true,
    },
  ],
  variationTypes: [{ id: "color", name: "Color", values: ["Red", "Blue"] }],
  variations: [
    {
      id: "var-1",
      productSku: "COMP-001",
      name: "Red Variant",
      selections: { color: "Red" },
      weightOverride: 1.0,
    },
  ],
  compositions: [
    { parentSku: "COMP-001#var-1", childSku: "PROD-001", quantity: 2 },
  ],
};

fs.writeFileSync("scripts/demo-data.json", JSON.stringify(demoData, null, 2));
console.log("Demo data written to scripts/demo-data.json");
