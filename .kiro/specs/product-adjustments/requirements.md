# Product Adjustments Requirements

## Introduction

This document outlines the requirements for improving the Product Management System's handling of composite products with variations. The current implementation has ambiguous behavior when transitioning between product types, and the user experience needs enhancement for better workflow management.

## Background

The existing system allows products to be both composite and have variations, but the transition between states is not user-friendly and can lead to data loss without proper warnings. Additionally, the UI shows unnecessary columns and forces users through inefficient navigation patterns.

## Requirements

### Requirement 1: Transição de Produto Composto para Composto + Variações

**User Story:** Como gerente de produtos, quero converter um produto composto existente em um produto com variações compostas, para que eu possa oferecer diferentes versões do mesmo produto base.

#### Acceptance Criteria

1. **WHEN** enabling `hasVariation=true` on a composite product **THEN** the system SHALL show a confirmation dialog
   - Dialog must explain that existing composition will become "Variation 1"
   - Dialog must show count of existing composition items that will be migrated
   - Dialog must have clear "Confirm" and "Cancel" options

2. **WHEN** user confirms the transition **THEN** the existing composition SHALL become "Variation 1"
   - All existing composition items must be preserved
   - New variation must be created with auto-generated name "Variation 1"
   - Composition items must be linked to the new variation
   - Total weight must be recalculated for the variation

3. **WHEN** transition is complete **THEN** the Composition tab SHALL be replaced with variation-based composition interface
   - Traditional composition interface must be hidden
   - Variation-based composition interface must be shown
   - User must see the migrated composition items in "Variation 1"

4. **WHEN** user cancels the transition **THEN** the `hasVariation` flag SHALL remain false
   - No data modifications must occur
   - User must return to previous state
   - No composition items must be affected

5. **WHEN** a product has existing composition items **THEN** they SHALL be preserved in the first variation
   - Data integrity must be maintained
   - All quantities, child SKUs, and relationships must be preserved
   - Weight calculations must remain accurate

### Requirement 2: Variation-Based Composition Management

**User Story:** Como gerente de produtos, quero gerenciar composições através de variações, para que cada variação tenha sua própria lista de componentes.

#### Acceptance Criteria

1. **WHEN** a product is `isComposite=true AND hasVariation=true` **THEN** the Composition tab SHALL show variation-based interface
   - Traditional composition table must be hidden
   - Variation selector/tabs must be visible
   - Each variation must have its own composition area
   - Active variation must be clearly indicated

2. **WHEN** creating the first variation **THEN** it SHALL inherit existing composition items
   - Migration must be automatic and seamless
   - All composition data must be transferred accurately
   - User must see familiar composition items in new interface

3. **WHEN** adding new variations **THEN** they SHALL start empty and allow independent composition
   - New variations must have empty composition lists
   - Each variation must allow independent add/remove operations
   - Variations must not affect each other's compositions

4. **WHEN** editing variations **THEN** each SHALL have independent add/remove/modify capabilities
   - Add item functionality per variation
   - Remove item functionality per variation
   - Modify quantity functionality per variation
   - Search and select products functionality per variation

5. **WHEN** calculating weight **THEN** each variation SHALL calculate from its own composition items
   - Weight must be calculated independently per variation
   - Total product weight must reflect selected/active variation
   - Weight changes must update in real-time

### Requirement 3: Variation Management Controls

**User Story:** Como gerente de produtos, quero controlar o número de variações compostas, para que eu possa manter apenas as variações necessárias.

#### Acceptance Criteria

1. **WHEN** creating variations **THEN** the system SHALL auto-name them "Variation 1", "Variation 2", etc.
   - Auto-naming must be sequential and consistent
   - Names must be unique within the product
   - System must handle gaps in numbering (e.g., if Variation 2 is deleted)

2. **WHEN** deleting variations **THEN** the system SHALL allow deletion if more than one exists
   - Delete button must be enabled when count > 1
   - Delete button must be disabled when count = 1
   - Confirmation dialog must be shown before deletion

3. **WHEN** only one variation remains **THEN** deletion SHALL be disabled
   - UI must clearly indicate why deletion is disabled
   - Tooltip or message must explain minimum requirement
   - User must understand they need at least one variation

4. **WHEN** renaming variations **THEN** the system SHALL allow custom names while maintaining uniqueness
   - Inline editing capability for variation names
   - Validation for unique names within product
   - Fallback to auto-generated names if custom name conflicts

5. **WHEN** reordering variations **THEN** the system SHALL maintain composition integrity
   - Drag-and-drop reordering capability
   - All composition items must remain linked correctly
   - Weight calculations must remain accurate after reordering

### Requirement 4: Data Protection and Warnings

**User Story:** Como gerente de produtos, quero ser avisado sobre perda de dados, para que eu possa tomar decisões informadas sobre mudanças destrutivas.

#### Acceptance Criteria

1. **WHEN** disabling `isComposite=true` **THEN** the system SHALL show destructive action warning
   - Warning dialog must clearly state data will be permanently lost
   - Must show count of composition items that will be deleted
   - Must show count of variations that will be deleted (if applicable)
   - Must require explicit confirmation with "I understand" checkbox

2. **WHEN** disabling `hasVariation=true` on composite products **THEN** the system SHALL warn about composition data loss
   - Warning must explain that all variation-specific compositions will be lost
   - Must offer option to merge all variations into single composition
   - Must show preview of what the merged composition would look like
   - Must allow cancellation without data loss

3. **WHEN** user confirms destructive action **THEN** all related data SHALL be permanently deleted
   - Composition items must be deleted from database
   - Variation records must be deleted from database
   - Product flags must be updated accordingly
   - Success message must confirm completion

4. **WHEN** user cancels destructive action **THEN** no data SHALL be modified
   - All flags must remain in previous state
   - All composition data must remain unchanged
   - All variation data must remain unchanged
   - User must return to previous interface state

5. **WHEN** warnings are shown **THEN** they SHALL clearly explain what data will be lost
   - Specific counts of items to be deleted
   - Clear explanation of irreversible nature
   - Examples of what will happen
   - Alternative options if available

### Requirement 5: UI/UX Improvements

**User Story:** Como usuário, quero uma interface mais intuitiva e eficiente, para que eu possa gerenciar produtos sem navegação desnecessária.

#### Acceptance Criteria

1. **WHEN** viewing product list **THEN** composition and variation columns SHALL only show if flags are enabled
   - Columns must be hidden when no products have the respective flags
   - Columns must appear when at least one product has the flag enabled
   - Column visibility must update dynamically as products are modified
   - Table layout must adjust smoothly to column changes

2. **WHEN** saving product changes **THEN** the user SHALL remain on the product edit screen
   - Save operation must not redirect to product list
   - Success message must be shown on current screen
   - User must be able to continue editing immediately
   - All tabs must remain accessible after save

3. **WHEN** in any product tab **THEN** a "Back" button SHALL be available
   - Back button must be visible in header of all tabs
   - Back button must be consistently positioned
   - Back button must have clear icon and label
   - Back button must be accessible via keyboard navigation

4. **WHEN** clicking "Back" **THEN** the user SHALL return to the product list
   - Navigation must be immediate if no unsaved changes
   - Must show confirmation dialog if unsaved changes exist
   - Must preserve any filters or search terms in product list
   - Must highlight the product that was being edited (if still visible)

5. **WHEN** there are unsaved changes **THEN** the system SHALL warn before navigation
   - Browser navigation (back button, refresh) must show warning
   - Internal navigation (tabs, back button) must show warning
   - Warning must clearly state what changes will be lost
   - Must offer options to save, discard, or cancel navigation

## Business Rules

### Composite Product Rules

1. **Minimum Variation Rule**: Composite products with variations must have at least one variation
2. **Data Migration Rule**: When enabling variations on composite products, existing composition becomes first variation
3. **Weight Calculation Rule**: Composite variation weight = sum of component weights for that variation
4. **Uniqueness Rule**: Variation names must be unique within a product
5. **Deletion Rule**: Cannot delete the last remaining variation

### Data Integrity Rules

1. **Referential Integrity**: Composition items must always reference valid products/variations
2. **Cascade Delete**: Deleting a variation must delete all its composition items
3. **Migration Integrity**: Data migrations must be atomic (all-or-nothing)
4. **Validation Rule**: Cannot save invalid states (e.g., composite without variations or composition)

### UI State Rules

1. **Column Visibility**: Columns only show when relevant data exists
2. **Tab Availability**: Composition tab behavior depends on product flags
3. **Button States**: Action buttons must reflect current capabilities
4. **Navigation Rules**: Unsaved changes must be protected across all navigation methods

## Non-Functional Requirements

### Performance Requirements

1. **Response Time**: All UI transitions must complete within 200ms
2. **Data Migration**: Large composition migrations must complete within 5 seconds
3. **Real-time Updates**: Weight calculations must update within 100ms of changes
4. **Memory Usage**: Interface must handle products with 100+ composition items efficiently

### Usability Requirements

1. **Accessibility**: All interfaces must be WCAG 2.1 AA compliant
2. **Keyboard Navigation**: All functionality must be accessible via keyboard
3. **Screen Readers**: All content must be properly announced by screen readers
4. **Mobile Responsive**: Interface must work on tablets (768px+ width)

### Reliability Requirements

1. **Data Safety**: Zero data loss during normal operations
2. **Error Recovery**: System must recover gracefully from errors
3. **Validation**: All user inputs must be validated before processing
4. **Backup**: Critical operations must be logged for audit purposes

## Constraints

### Technical Constraints

1. **Browser Support**: Must work in modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
2. **Storage**: Must work with localStorage (no backend database)
3. **Framework**: Must use existing Next.js + TypeScript + Tailwind stack
4. **Components**: Must use existing Shadcn UI component library

### Business Constraints

1. **Backward Compatibility**: Existing products must continue to work
2. **Data Format**: Must maintain existing data schema where possible
3. **User Training**: Changes must be intuitive enough to require minimal training
4. **Migration Path**: Must provide clear upgrade path for existing data

## Success Criteria

### User Experience Metrics

1. **Task Completion**: 95% of users can successfully convert composite products to variations
2. **Error Rate**: <5% of operations result in user errors
3. **Time to Complete**: Average task completion time reduced by 30%
4. **User Satisfaction**: >90% positive feedback on new workflow

### Technical Metrics

1. **Performance**: All operations complete within specified time limits
2. **Reliability**: 99.9% uptime with zero data loss incidents
3. **Test Coverage**: ≥95% code coverage for all new functionality
4. **Accessibility**: 100% compliance with WCAG 2.1 AA standards

### Business Metrics

1. **Adoption Rate**: 80% of composite products converted to use variations within 30 days
2. **Support Tickets**: 50% reduction in user confusion-related support requests
3. **Feature Usage**: 70% of users actively use variation-based composition features
4. **Data Integrity**: Zero reported data loss incidents post-implementation
