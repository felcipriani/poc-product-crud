# Implementation Plan

- [x] 1. Project Setup and Configuration
  - Initialize Next.js project with TypeScript and configure all development tools
  - Set up Tailwind CSS, Shadcn UI, ESLint, Prettier, Husky, and lint-staged
  - Configure Vitest with coverage thresholds and React Testing Library
  - Create project structure with feature-based directories
  - _Requirements: 11.1, 11.5_

- [x] 2. Core Domain Entities and Value Objects
  - Create TypeScript interfaces for Product, VariationType, Variation, ProductVariationItem, and CompositionItem entities
  - Implement Dimensions value object with validation
  - Create Zod schemas for all entities with strict validation rules
  - Write unit tests for entity validation and business rules
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 10.1, 10.2_

- [x] 3. Storage Infrastructure and Repository Pattern
  - Implement StorageService class with localStorage abstraction and error handling
  - Create schema versioning system with migration support
  - Implement base Repository class with common CRUD operations
  - Create specific repository implementations for each entity type
  - Write unit tests for storage operations with mocked localStorage
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 10.4, 11.4_

- [x] 4. Business Logic Services and Domain Rules
  - Implement ProductService with CRUD operations and constraint validation
  - Create VariationService with combination generation and uniqueness validation
  - Implement CompositionService with weight calculation and constraint validation
  - Add business rule validation for all complex scenarios (hasVariation, isComposite flags)
  - Write comprehensive unit tests for all business logic and edge cases
  - _Requirements: 1.7, 4.2, 4.4, 4.5, 5.2, 5.3, 5.5, 6.1, 6.2, 7.3, 10.3, 11.2_

- [x] 5. Basic UI Components and Shadcn Integration
  - Install and configure Shadcn UI components (Button, Input, Table, Dialog, Toast)
  - Create reusable form components with React Hook Form integration
  - Implement AccessibleTable component with sorting and pagination
  - Create Modal and Toast notification systems
  - Add loading states and skeleton components
  - _Requirements: 9.1, 9.4, 9.6, 9.7_

- [x] 6. Product Management Interface
  - Create product list page with search, filtering, and CRUD operations
  - Implement product form with conditional field visibility based on flags
  - Add product creation and editing with validation and error handling
  - Implement product deletion with confirmation modal
  - Write integration tests for product management workflows
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 9.2, 9.3, 11.3_

- [x] 7. Variation Type and Variation Management
  - Create variation type management interface with CRUD operations
  - Implement variation management interface linked to variation types
  - Add validation for case-insensitive uniqueness constraints
  - Create forms with proper validation and error messaging
  - Write tests for variation type and variation management
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 10.2_

- [x] 8. Product Variations Interface and Logic
  - Create editable grid interface for product variations with dynamic columns
  - Implement "New Line" functionality to manually add variation combinations
  - Add dynamic columns based on selected variation types (e.g., "Tamanho", "Cor")
  - Implement dimension override columns (Height, Width, Depth) for dimension-modifying variations
  - Add weight override column for weight-modifying variations
  - Prevent duplicate variation combinations within the same product
  - Validate that only one dimension-modifying and one weight-modifying variation type per product
  - Ensure all existing combinations get new columns when variation types are added
  - Implement inline editing for variation values and overrides
  - Write tests for editable grid logic and validation rules
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 11.3_

- [x] 9. Product Composition Interface and Weight Calculation
  - Create composition management interface for composite products
  - Implement product search and selection for composition items
  - Add quantity input and validation for composition items
  - Implement automatic weight calculation from component products
  - Handle variation selection for variable child products
  - Write tests for composition logic and weight calculations
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 6.3, 11.3_

- [x] 10. Complex Composition Rules and Validation
  - Implement restriction preventing variable parent products in compositions
  - Add logic to show only specific variations for variable products in composition
  - Create validation for composition constraints and referential integrity
  - Implement nested composition support (composite products containing other composites)
  - Write comprehensive tests for complex composition scenarios
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.4, 11.2_

- [x] 11. Advanced Composite with Variations Feature
  - Implement composition-based variation interface for products with both flags
  - Create per-combination composition templates with child variation selection
  - Add weight calculation for composite variations based on selected child variations
  - Implement combination uniqueness validation for composite variations
  - Handle mixed scenarios with simple and variable child products
  - Write tests for advanced composite variation scenarios
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 11.2_

- [x] 12. Data Persistence Integration and Error Handling
  - Integrate all UI components with repository services
  - Implement proper error handling and user feedback throughout the application
  - Add data validation at form submission and service layer
  - Create toast notifications for success and error states
  - Implement optimistic updates with rollback on failure
  - Write integration tests for data persistence workflows
  - _Requirements: 8.1, 8.2, 8.5, 8.6, 9.3, 9.4, 10.1, 10.3, 11.4_

- [ ] 13. Performance Optimization and Accessibility
  - Implement memoization for expensive calculations (weight, combinations)
  - Add debouncing for search inputs and form validation
  - Optimize table rendering with virtual scrolling for large datasets
  - Ensure WCAG 2.1 AA compliance with proper ARIA labels and keyboard navigation
  - Add focus management and screen reader support
  - Write accessibility tests and performance benchmarks
  - _Requirements: 9.5, 9.6, 9.7, 11.6_

- [ ] 14. Comprehensive Testing and Coverage
  - Achieve ≥90% test coverage across all code metrics
  - Create test factories for all entities and complex scenarios
  - Write integration tests for cross-feature interactions
  - Add end-to-end tests for critical user journeys
  - Implement MSW mocks for isolated component testing
  - Generate coverage reports and ensure CI/CD integration
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ] 15. Documentation and Final Polish
  - Create comprehensive README with setup instructions and architecture overview
  - Document all business rules and validation constraints
  - Add inline code documentation and TypeScript JSDoc comments
  - Create user guide with examples of complex scenarios
  - Implement seed data functionality for demonstration purposes
  - Perform final code review and refactoring for maintainability
  - _Requirements: All requirements final validation_
