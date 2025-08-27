# Product Management System

A comprehensive Next.js-based product management system that handles complex product variations and compositions. Built with TypeScript, Tailwind CSS, and Shadcn UI components.

## 🌟 Features

- **Product Management**: Create, edit, and manage products with SKU, name, dimensions, and weight
- **Variation System**: Define variation types (color, material, size) and create product variations
- **Composition System**: Build composite products from other products with automatic weight calculations
- **Complex Business Rules**: Handle weight/dimension overrides, composition constraints, and validation
- **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation and screen reader support
- **Testing**: Comprehensive test coverage ≥90% with unit, integration, and e2e tests
- **Performance**: Optimized for large datasets with efficient caching and batch operations
- **Security**: Built-in security headers, input validation, and XSS protection

## ⚙️ Setup

### Prerequisites

- Node.js 18 or higher
- npm, yarn, or pnpm package manager

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd product-management-system
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Generate demo data (optional):**

   ```bash
   node scripts/seed.js
   ```

4. **Run tests to validate the environment:**

   ```bash
   npm test
   ```

5. **Start development server:**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

6. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

### Core Concepts

#### Products

Products are the main entities in the system. Each product has:

- **SKU**: Unique identifier
- **Name**: Human-readable name
- **Weight**: Physical weight in kg
- **Dimensions**: Height, width, depth in cm
- **Flags**: `isComposite` and `hasVariation` for behavior control

#### Variations

Products can have variations (e.g., different colors, sizes):

- **Variation Types**: Define what can vary (Color, Size, Material)
- **Variation Values**: Specific options (Red, Blue, Small, Large)
- **Product Variations**: Combinations of values for a specific product

#### Compositions

Composite products are made from other products:

- **Composition Items**: Define parent-child relationships with quantities
- **Weight Calculation**: Automatic calculation based on components
- **Hierarchy Support**: Multi-level compositions (products containing products)

### Architecture

The system follows Clean Architecture principles:

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
│   ├── domain/                 # Core domain entities & services
│   ├── storage/                # localStorage abstraction
│   ├── utils/                  # Utility functions
│   └── validations/            # Zod schemas
└── tests/                      # Test utilities and factories
```

### Complex Scenarios

The platform supports advanced combinations of product features, including:

- **Composite with Variations**: A product composed of other products while also offering color or size variations. Composition items are migrated when variations are enabled.
- **Weight Overrides**: Variations can override base weights allowing precise shipping calculations.
- **Deep Hierarchies**: Products can be nested multiple levels deep with automatic weight aggregation and validation of circular references.

### Technology Stack

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + Shadcn UI components
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + React Testing Library + MSW
- **Code Quality**: ESLint + Prettier + Husky + lint-staged

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm start              # Start production server

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint issues
npm run format         # Format code with Prettier
npm run type-check     # Run TypeScript type checking

# Testing
npm run test           # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate test coverage report
npm run test:e2e       # Run end-to-end tests

# Build & Deploy
npm run build:analyze  # Build with bundle analyzer
npm run build:docker   # Build Docker image
```

> The `test` and `build` scripts automatically set `VITE_CJS_IGNORE_WARNING=1` and `NEXT_CACHE_DISABLED=1` to ensure warning-free CI runs.

### Code Style

The project uses strict TypeScript and follows these conventions:

- **Components**: PascalCase with descriptive names
- **Files**: kebab-case for files, PascalCase for components
- **Functions**: camelCase with verb-noun pattern
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase with descriptive names

### Testing Strategy

The project maintains ≥90% test coverage across:

1. **Unit Tests (70%)**: Domain logic, utilities, validation
2. **Integration Tests (20%)**: Component integration, data flow
3. **End-to-End Tests (10%)**: Critical user journeys

### Performance Guidelines

- **Bundle Size**: Keep JavaScript bundles under 1MB
- **Lighthouse Score**: Maintain 90+ performance score
- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Accessibility**: WCAG 2.1 AA compliance

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file for local development:

```bash
# Application
NEXT_PUBLIC_APP_NAME="Product Management System"
NEXT_PUBLIC_APP_VERSION="1.0.0"

# Development
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1

# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

### Build Configuration

The project uses optimized build settings in `next.config.js`:

- **SWC Minification**: Faster builds and smaller bundles
- **Image Optimization**: WebP/AVIF support with caching
- **Bundle Splitting**: Optimized chunk splitting for better caching
- **Security Headers**: XSS protection, CSRF prevention
- **Performance**: Compression, font optimization

## 🚀 Deployment

### Docker Deployment

1. **Build the Docker image:**

   ```bash
   docker build -t product-management-system .
   ```

2. **Run the container:**

   ```bash
   docker run -p 3000:3000 product-management-system
   ```

3. **Using Docker Compose:**
   ```bash
   docker-compose up -d
   ```

### Production Build

1. **Run the build script:**

   ```bash
   ./scripts/build.sh
   ```

2. **Deploy the `.next` folder** to your hosting platform

### Hosting Platforms

The application is compatible with:

- **Vercel**: Zero-config deployment
- **Netlify**: Static site generation
- **AWS**: EC2, ECS, or Lambda
- **Google Cloud**: Cloud Run or App Engine
- **Azure**: App Service or Container Instances

## 🔒 Security

### Security Features

- **Input Validation**: Zod schemas for all user inputs
- **XSS Protection**: Sanitized outputs and CSP headers
- **CSRF Protection**: Built-in Next.js protection
- **Security Headers**: Comprehensive security header configuration
- **Dependency Scanning**: Regular security audits

### Security Best Practices

1. **Keep dependencies updated**: Regular `npm audit` checks
2. **Validate all inputs**: Use Zod schemas consistently
3. **Sanitize outputs**: Prevent XSS attacks
4. **Use HTTPS**: Always use secure connections in production
5. **Monitor logs**: Track security events and errors

## ♿ Accessibility

### WCAG 2.1 AA Compliance

The application meets WCAG 2.1 AA standards:

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: ARIA labels and semantic HTML
- **Color Contrast**: Minimum 4.5:1 contrast ratio
- **Focus Management**: Clear focus indicators
- **Alternative Text**: Images and icons have alt text

### Accessibility Testing

```bash
# Run accessibility tests
npm run test:a11y

# Manual testing tools
# - axe DevTools browser extension
# - WAVE Web Accessibility Evaluator
# - Lighthouse accessibility audit
```

## 📊 Performance

### Performance Metrics

The application is optimized for:

- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **First Input Delay**: < 100ms
- **Cumulative Layout Shift**: < 0.1

### Performance Monitoring

```bash
# Analyze bundle size
npm run build:analyze

# Run Lighthouse audit
npx lighthouse http://localhost:3000

# Performance testing
npm run test:performance
```

## 🐛 Troubleshooting

### Common Issues

1. **Build Failures**
   - Ensure Node.js 18+ is installed
   - Clear `node_modules` and reinstall dependencies
   - Check TypeScript errors with `npm run type-check`

2. **Test Failures**
   - Verify test coverage meets 90% threshold
   - Check mock configurations in test setup
   - Review failing test output for specific issues

3. **Performance Issues**
   - Use React DevTools Profiler
   - Check bundle size with analyzer
   - Review network requests in DevTools

4. **Accessibility Issues**
   - Run axe-core accessibility tests
   - Test with keyboard navigation
   - Verify screen reader compatibility

### Getting Help

1. **Check the documentation** in the `/docs` folder
2. **Review test files** for usage examples
3. **Examine domain models** in `src/lib/domain/`
4. **Look at component tests** for UI patterns

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following the code style guidelines
4. **Add tests** for new functionality
5. **Run the test suite**: `npm run test`
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to the branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Code Review Process

- All changes require code review
- Tests must pass and coverage must be ≥90%
- Code must follow ESLint and Prettier rules
- Accessibility requirements must be met
- Performance impact should be considered

## 📄 License

This project is a proof-of-concept for educational and demonstration purposes.

## 🙏 Acknowledgments

- **Next.js Team** for the amazing framework
- **Shadcn** for the beautiful UI components
- **Tailwind CSS** for the utility-first CSS framework
- **React Hook Form** for form management
- **Zod** for schema validation
- **Vitest** for fast and reliable testing

---

**Built with ❤️ using Next.js, TypeScript, and modern web technologies.**
