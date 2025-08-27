# Product Management System

A comprehensive Next.js-based product management system that handles complex product variations and compositions. Built with TypeScript, Tailwind CSS, and Shadcn UI components.

## Features

- **Product Management**: Create, edit, and manage products with SKU, name, dimensions, and weight
- **Variation System**: Define variation types (color, material, size) and create product variations
- **Composition System**: Build composite products from other products with automatic weight calculations
- **Complex Business Rules**: Handle weight/dimension overrides, composition constraints, and validation
- **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation and screen reader support
- **Testing**: Comprehensive test coverage ≥90% with unit, integration, and e2e tests

## Prerequisites

- Node.js 22 or higher
- npm or pnpm package manager

## Setup Instructions

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd product-management-system
   npm install
   ```

2. **Development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run coverage` - Generate test coverage report (fails if <90%)

## Architecture

### Technology Stack

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + Shadcn UI components
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + React Testing Library + MSW
- **Code Quality**: ESLint + Prettier + Husky + lint-staged

### Project Structure

```
src/
├── app/                          # Next.js App Router pages
├── components/
│   ├── ui/                      # Shadcn UI components
│   └── shared/                  # Reusable components
├── features/                    # Feature-based organization
│   ├── products/               # Product domain
│   ├── variation-types/        # Variation type domain
│   ├── variations/             # Variation domain
│   └── composition/            # Composition logic
├── lib/
│   ├── domain/                 # Core domain entities
│   ├── storage/                # localStorage abstraction
│   ├── utils/                  # Utility functions
│   └── validations/            # Zod schemas
└── tests/                      # Test utilities and factories
```

### Architecture Principles

- **Clean Architecture**: Separation of UI, Application, Domain, and Infrastructure layers
- **Domain-Driven Design**: Business logic isolated in domain layer
- **Repository Pattern**: Data access abstraction with localStorage
- **Feature-Based Organization**: Code organized by business features
- **Test-Driven Development**: Comprehensive testing at all layers

## Data Model

### Core Entities

- **Product**: SKU, name, dimensions, weight, composition/variation flags
- **VariationType**: Name, weight/dimension modification flags
- **Variation**: Name, linked to variation type
- **ProductVariationItem**: Product variation combinations with overrides
- **CompositionItem**: Parent-child product relationships with quantities

### Storage Strategy

- **localStorage**: All data persisted locally (no backend required)
- **Schema Versioning**: Migration system for data evolution
- **Repository Pattern**: Abstracted data access with mocking support
- **Referential Integrity**: Validation of entity relationships

## Business Rules

### Product Variations

1. Products with `hasVariation=true` must have at least one variation combination
2. Variation types with `modifiesWeight=true` override base product weight
3. Variation types with `modifiesDimensions=true` override base product dimensions
4. Variation combinations must be unique (no duplicate selections)

### Product Composition

1. Products with `isComposite=true` must have at least one composition item
2. Composite product weight = sum of component weights (considering variations)
3. Variable products (with variations) cannot be used directly in compositions
4. Only specific variation combinations can be used in compositions

### Advanced Rules

1. Products can be both composite AND variable (complex composition interface)
2. Case-insensitive uniqueness for names (products, variation types, variations)
3. Referential integrity enforcement (cannot delete referenced entities)
4. Automatic weight calculation with override precedence

## Testing Strategy

### Coverage Requirements

- **Statements**: ≥90%
- **Lines**: ≥90%
- **Branches**: ≥90%
- **Functions**: ≥90%

### Test Types

1. **Unit Tests (70%)**: Domain logic, utilities, validation
2. **Integration Tests (20%)**: Component integration, data flow
3. **End-to-End Tests (10%)**: Critical user journeys

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run coverage
```

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support with proper tab order
- **Screen Reader Support**: ARIA labels and semantic HTML
- **High Contrast**: Accessible color schemes and visual indicators
- **Focus Management**: Clear focus indicators and logical flow

## Performance Optimizations

- **Memoization**: Cached calculations for weight and combinations
- **Lazy Loading**: On-demand data loading and component rendering
- **Virtual Scrolling**: Efficient rendering of large data sets
- **Debounced Inputs**: Optimized search and form interactions

## Development Guidelines

### Code Style

- **TypeScript**: Strict mode with comprehensive typing
- **ESLint**: Consistent code style and best practices
- **Prettier**: Automated code formatting
- **Husky**: Pre-commit hooks for quality assurance

### Adding New Components

1. Use Shadcn UI components as building blocks
2. Follow accessibility guidelines (ARIA labels, keyboard support)
3. Write comprehensive tests for new functionality
4. Document complex business logic and edge cases

### Adding Shadcn Components

```bash
# Install new Shadcn components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add table
```

## Limitations and Future Work

### Current Limitations

- **localStorage Only**: No server-side persistence or synchronization
- **Single User**: No multi-user support or collaboration features
- **Basic Search**: Simple text-based search without advanced filtering
- **No Import/Export**: Manual data entry only

### Future Enhancements

- **Backend Integration**: REST API or GraphQL backend
- **Advanced Search**: Faceted search with filters and sorting
- **Bulk Operations**: Import/export functionality for products
- **User Management**: Multi-user support with permissions
- **Audit Trail**: Change tracking and history
- **Performance**: Database optimization and caching strategies

## Troubleshooting

### Common Issues

1. **Build Failures**: Ensure Node.js 22+ and clean `node_modules`
2. **Test Failures**: Check coverage thresholds and mock configurations
3. **localStorage Issues**: Clear browser storage if data corruption occurs
4. **Type Errors**: Verify TypeScript configuration and strict mode compliance

### Getting Help

- Check the test files for usage examples
- Review the domain models in `src/lib/domain/`
- Examine the repository implementations for data patterns
- Look at component tests for UI interaction patterns

## License

This project is a proof-of-concept for educational and demonstration purposes.