# Business Rules

This document summarizes the core business rules enforced by the Product Management System.

## Product Rules

- SKU must be unique and use only uppercase letters, numbers and hyphens.
- Product names must be unique (case insensitive).
- Weight and dimensions must be positive numbers.

## Composition Rules

- A product cannot include the same child product more than once in a composition.
- Quantities in compositions must be greater than zero.
- Disabling `isComposite` removes all existing composition data for the product.

## Variation Rules

- Products with variations must contain at least one variation entry.
- Variation combinations must be unique for a given product.
- Disabling `hasVariation` deletes all existing variation data.

## Transition Rules

- Enabling variations on a composite product migrates existing composition items to the first variation.
- Business rules are validated before changing product state to ensure data integrity.
