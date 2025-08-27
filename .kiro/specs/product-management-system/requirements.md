# Requirements Document

## Introduction

This document outlines the requirements for a Next.js-based Product Management System that handles complex product variations and compositions. The system is a proof-of-concept that persists all data in localStorage without requiring a backend. It supports products with variations (different combinations of attributes like color, material) and composite products (made up of other products). The system must enforce complex business rules around weight and dimension calculations, uniqueness constraints, and composition restrictions.

## Requirements

### Requirement 1: Basic Product Management

**User Story:** As a product manager, I want to create and manage basic products with essential attributes, so that I can maintain a catalog of simple products.

#### Acceptance Criteria

1. WHEN creating a product THEN the system SHALL require a unique SKU (string format)
2. WHEN creating a product THEN the system SHALL require a product name
3. WHEN creating a product THEN the system SHALL allow entry of dimensions (height, width, depth) as positive numbers
4. WHEN creating a product THEN the system SHALL allow entry of weight as a positive number
5. WHEN creating a product THEN the system SHALL provide flags for isComposite and hasVariation
6. WHEN saving a product THEN the system SHALL validate SKU uniqueness across all products
7. WHEN editing a product THEN the system SHALL preserve existing data while allowing modifications
8. WHEN deleting a product THEN the system SHALL confirm the action before permanent removal

### Requirement 2: Variation Type Management

**User Story:** As a product manager, I want to define types of variations (like color, material, size), so that I can create structured product variations.

#### Acceptance Criteria

1. WHEN creating a variation type THEN the system SHALL require a unique name (case-insensitive)
   - Example: Cannot create "Color" if "color" already exists
2. WHEN creating a variation type THEN the system SHALL provide a modifiesWeight boolean flag
   - Example: "Material" type with modifiesWeight=true means material choice affects product weight
3. WHEN creating a variation type THEN the system SHALL provide a modifiesDimensions boolean flag
   - Example: "Size" type with modifiesDimensions=true means size choice affects product dimensions
4. WHEN saving a variation type THEN the system SHALL validate name uniqueness globally
5. WHEN a variation type has modifiesWeight=true THEN products using this type SHALL ignore base weight
   - Example: Chair base weight 5kg ignored when "Material: Steel" variation specifies 8kg
6. WHEN a variation type has modifiesDimensions=true THEN products using this type SHALL ignore base dimensions
   - Example: Box base 10×10×10cm ignored when "Size: Large" variation specifies 20×20×20cm
7. WHEN creating variation types THEN common examples SHALL include:
   - "Color" (modifiesWeight=false, modifiesDimensions=false) - aesthetic only
   - "Material" (modifiesWeight=true, modifiesDimensions=false) - affects weight
   - "Size" (modifiesWeight=true, modifiesDimensions=true) - affects both

### Requirement 3: Variation Management

**User Story:** As a product manager, I want to create specific variations within each variation type, so that I can define the actual options available for products.

#### Acceptance Criteria

1. WHEN creating a variation THEN the system SHALL require a variation type selection
   - Example: Select "Color" type before creating "Red", "Blue", "Green" variations
2. WHEN creating a variation THEN the system SHALL require a name unique within the selected type (case-insensitive)
   - Example: Cannot create "red" in "Color" type if "Red" already exists
3. WHEN saving a variation THEN the system SHALL validate name uniqueness within the variation type
4. WHEN saving a variation THEN the system SHALL allow duplicate names across different variation types
   - Example: "Large" can exist in both "Size" and "Packaging" types
5. WHEN deleting a variation type THEN the system SHALL prevent deletion if variations exist for that type
   - Example: Cannot delete "Color" type if "Red", "Blue" variations exist
6. WHEN creating variations THEN typical examples SHALL include:
   - Color type: "Red", "Blue", "Green", "Black", "White"
   - Material type: "Wood", "Steel", "Plastic", "Glass"
   - Size type: "Small", "Medium", "Large", "Extra Large"
   - Finish type: "Matte", "Glossy", "Textured"

### Requirement 4: Product Variations

**User Story:** As a product manager, I want to create products with multiple variation combinations, so that I can offer different versions of the same base product.

#### Acceptance Criteria

1. WHEN hasVariation=true THEN the system SHALL enable the Variations tab
2. WHEN hasVariation=true THEN the system SHALL require at least one variation combination before saving
3. WHEN creating variation combinations THEN the system SHALL prevent duplicate combinations
   - Example: Cannot have two combinations with "Wood Type: Oak" + "Color: Blue"
4. WHEN a variation type modifies weight THEN the system SHALL use override weight instead of base weight
   - Example: Product base weight 5kg, but "Material: Steel" variation overrides to 8kg
5. WHEN a variation type modifies dimensions THEN the system SHALL use override dimensions instead of base dimensions
   - Example: Product base 10x10x10cm, but "Size: Large" variation overrides to 15x15x15cm
6. WHEN generating combinations THEN the system SHALL create cartesian product of selected variation types
   - Example: Wood Types [Oak, Pine] × Colors [Blue, Red] = 4 combinations
7. WHEN editing combinations THEN the system SHALL validate uniqueness of each combination
8. WHEN multiple variation types modify weight THEN the system SHALL ignore base weight entirely
   - Example: If both "Material" and "Finish" types have modifiesWeight=true, base weight is ignored
9. WHEN no variation types modify weight THEN the system SHALL use base product weight
10. WHEN some variation types modify dimensions and others don't THEN the system SHALL ignore base dimensions if ANY type modifies them

### Requirement 5: Product Composition

**User Story:** As a product manager, I want to create composite products made up of other products, so that I can manage bundled or assembled items.

#### Acceptance Criteria

1. WHEN isComposite=true THEN the system SHALL enable the Composition tab
2. WHEN isComposite=true THEN the system SHALL disable and make weight field non-mandatory
3. WHEN isComposite=true THEN the system SHALL require at least one composition item before saving
4. WHEN adding composition items THEN the system SHALL require positive quantity values
   - Example: "Table Leg" × 4, "Table Top" × 1
5. WHEN calculating composite weight THEN the system SHALL sum weights of all component products
   - Example: (Table Leg 2kg × 4) + (Table Top 5kg × 1) = 13kg total
6. WHEN component has variations THEN the system SHALL use selected variation's weight in calculation
   - Example: If "Table Leg" has "Material: Steel" variation (3kg), total = (3kg × 4) + 5kg = 17kg
7. WHEN removing composition items THEN the system SHALL recalculate total weight
8. WHEN component product is simple (no variations) THEN the system SHALL use its base weight
9. WHEN component product has variations THEN the system SHALL require specific variation selection
   - Example: Cannot add "Chair" (which has Color variations) without specifying "Chair - Color: Red"

### Requirement 6: Complex Composition Rules

**User Story:** As a product manager, I want the system to enforce proper composition rules with variations, so that composite products maintain data integrity.

#### Acceptance Criteria

1. WHEN a product has hasVariation=true THEN the parent product SHALL NOT be usable in other compositions
   - Example: "Chair" with Color variations cannot be added to "Dining Set" composition
2. WHEN a product has hasVariation=true THEN individual variation combinations SHALL be usable in compositions
   - Example: "Chair - Color: Red" and "Chair - Color: Blue" can be added to "Dining Set"
3. WHEN adding a variable product to composition THEN the system SHALL require specific variation selection
   - Example: Adding "Chair" shows dropdown: "Chair - Color: Red", "Chair - Color: Blue", etc.
4. WHEN a composite product also has variations THEN the system SHALL use composition-based variation interface
   - Example: "Dining Set" with "Style" variations shows composition items per style combination
5. WHEN composite has variations THEN each combination SHALL specify which child variations to use
   - Example: "Dining Set - Style: Modern" uses "Chair - Color: Black" × 4, "Table - Finish: Glossy" × 1
6. WHEN searching for composition items THEN the system SHALL show only valid products
   - Simple products: Show as-is
   - Variable products: Show individual variations only
   - Composite products: Show as-is (can nest composites)

### Requirement 7: Advanced Composite with Variations

**User Story:** As a product manager, I want to create composite products that also have variations, so that I can offer different versions of assembled products.

#### Acceptance Criteria

1. WHEN isComposite=true AND hasVariation=true THEN the system SHALL use composition-based variation interface
   - Traditional grid is replaced with composition template per variation combination
2. WHEN creating composite variations THEN the system SHALL allow selection of specific child variations per combination
   - Example: "Dining Set - Style: Modern" specifies exact chair colors and table finish for this style
3. WHEN calculating weight for composite variations THEN the system SHALL derive weight from selected child variations
   - Example: "Dining Set - Style: Modern" weight = sum of selected chair/table variation weights
4. WHEN validating composite variations THEN the system SHALL ensure combination uniqueness
   - Example: Cannot have two "Style: Modern" combinations with different child selections
5. WHEN a child product has variations THEN the system SHALL require variation selection for each parent combination
   - Example: For each "Dining Set" style, must specify which "Chair" color variation to use
6. WHEN child product is simple THEN the system SHALL use it directly in all parent combinations
   - Example: "Simple Cushion" (no variations) used as-is in all "Sofa Set" variations
7. WHEN parent variation types modify weight/dimensions THEN child selections SHALL be ignored for those attributes
   - Example: If "Dining Set" has "Packaging: Bulk" (modifiesWeight=true), ignore calculated child weights

### Requirement 8: Data Persistence and Storage

**User Story:** As a system user, I want all data to be persisted locally, so that I can work offline without requiring a backend server.

#### Acceptance Criteria

1. WHEN saving data THEN the system SHALL store all information in localStorage
2. WHEN loading the application THEN the system SHALL retrieve all data from localStorage
3. WHEN data schema changes THEN the system SHALL provide migration capabilities
4. WHEN concurrent operations occur THEN the system SHALL prevent data corruption
5. WHEN storage operations fail THEN the system SHALL provide clear error messages
6. WHEN validating uniqueness THEN the system SHALL check against all stored data

### Requirement 9: User Interface and Experience

**User Story:** As a user, I want an intuitive and accessible interface, so that I can efficiently manage products and their variations.

#### Acceptance Criteria

1. WHEN viewing product lists THEN the system SHALL provide search and filtering capabilities
2. WHEN performing actions THEN the system SHALL show loading states and progress indicators
3. WHEN errors occur THEN the system SHALL display clear, actionable error messages
4. WHEN operations succeed THEN the system SHALL show confirmation messages
5. WHEN using keyboard navigation THEN all interactive elements SHALL be accessible
6. WHEN using screen readers THEN all content SHALL have proper ARIA labels
7. WHEN on mobile devices THEN the interface SHALL be responsive and touch-friendly

### Requirement 10: Data Validation and Integrity

**User Story:** As a system administrator, I want robust data validation, so that the system maintains data integrity and prevents invalid states.

#### Acceptance Criteria

1. WHEN entering numeric values THEN the system SHALL validate positive numbers for weights and dimensions
2. WHEN creating names THEN the system SHALL enforce case-insensitive uniqueness where required
3. WHEN saving incomplete data THEN the system SHALL prevent save and highlight missing fields
4. WHEN referencing other entities THEN the system SHALL validate referential integrity
5. WHEN deleting referenced entities THEN the system SHALL prevent deletion or cascade appropriately
6. WHEN importing data THEN the system SHALL validate all constraints before accepting

### Requirement 11: Testing and Quality Assurance

**User Story:** As a developer, I want comprehensive test coverage, so that the system is reliable and maintainable.

#### Acceptance Criteria

1. WHEN running tests THEN the system SHALL achieve ≥90% code coverage across statements, lines, branches, and functions
2. WHEN testing business rules THEN all domain logic SHALL have unit test coverage
3. WHEN testing UI components THEN all user interactions SHALL be tested
4. WHEN testing data persistence THEN repository operations SHALL be tested with mocked storage
5. WHEN running CI/CD THEN tests SHALL fail the build if coverage drops below 90%
6. WHEN testing accessibility THEN UI components SHALL pass accessibility audits

## Detailed Examples and Scenarios

### Example 1: Simple Product with Variations

**Product:** "Office Chair"
- Base: weight=5kg, dimensions=60×60×100cm
- hasVariation=true, isComposite=false

**Variation Types Applied:**
- "Color" (modifiesWeight=false, modifiesDimensions=false)
- "Material" (modifiesWeight=true, modifiesDimensions=false)

**Variations:**
- Color: Red, Blue, Black
- Material: Fabric (5kg), Leather (6kg), Mesh (4kg)

**Generated Combinations:**
1. Red + Fabric = 5kg (uses Material override)
2. Red + Leather = 6kg (uses Material override)  
3. Red + Mesh = 4kg (uses Material override)
4. Blue + Fabric = 5kg
5. Blue + Leather = 6kg
6. Blue + Mesh = 4kg
7. Black + Fabric = 5kg
8. Black + Leather = 6kg
9. Black + Mesh = 4kg

**Key Rules:**
- Base weight (5kg) is ignored because Material type modifies weight
- Base dimensions are used because no type modifies dimensions
- Each combination must be unique

### Example 2: Composite Product

**Product:** "Dining Set"
- isComposite=true, hasVariation=false
- Weight field disabled (calculated from components)

**Composition:**
- "Chair - Color: Black" × 4 (each 5kg) = 20kg
- "Table - Material: Wood" × 1 (15kg) = 15kg
- **Total Weight:** 35kg

**Key Rules:**
- Cannot add "Chair" (parent with variations) directly
- Must select specific variation "Chair - Color: Black"
- Weight automatically calculated from components

### Example 3: Advanced Composite with Variations

**Product:** "Custom Dining Set"
- isComposite=true, hasVariation=true

**Variation Types Applied:**
- "Style" (modifiesWeight=false, modifiesDimensions=false)

**Variations:**
- Style: Modern, Classic, Rustic

**Composition Template per Style:**

**Modern Style:**
- "Chair - Color: Black" × 4 = 20kg
- "Table - Finish: Glossy" × 1 = 16kg
- **Total:** 36kg

**Classic Style:**
- "Chair - Color: Brown" × 6 = 30kg  
- "Table - Finish: Matte" × 1 = 15kg
- **Total:** 45kg

**Rustic Style:**
- "Chair - Material: Wood" × 4 = 24kg
- "Table - Material: Reclaimed Wood" × 1 = 18kg
- **Total:** 42kg

**Key Rules:**
- Each style combination specifies exact child variations
- Weight calculated per combination from selected child variations
- Cannot duplicate style combinations
- Traditional variation grid replaced with composition interface

### Example 4: Validation Scenarios

**Blocked Operations:**
1. Save "Chair" with hasVariation=true but no combinations → Error
2. Save "Dining Set" with isComposite=true but no items → Error  
3. Create variation type "color" when "Color" exists → Error (case-insensitive)
4. Add "Chair" (parent with variations) to composition → Error, must select specific variation
5. Create duplicate combination "Red + Fabric" → Error

**Allowed Operations:**
1. Create "Large" variation in both "Size" and "Packaging" types → OK (different types)
2. Add "Chair - Color: Red" to multiple compositions → OK (specific variation)
3. Nest composite in composite: "Office Set" contains "Dining Set" → OK