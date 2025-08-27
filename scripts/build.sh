#!/bin/bash

# Production Build Script for Product Management System
# This script handles the complete build process with optimizations

set -e  # Exit on any error

echo "🚀 Starting production build process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION') ? 0 : 1)" 2>/dev/null; then
    print_error "Node.js version $NODE_VERSION is not supported. Please use Node.js $REQUIRED_VERSION or higher."
    exit 1
fi

print_success "Node.js version $NODE_VERSION is compatible"

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf .next
rm -rf out
rm -rf dist
rm -rf build
print_success "Previous builds cleaned"

# Install dependencies
print_status "Installing dependencies..."
if [ -f "package-lock.json" ]; then
    npm ci --production=false
elif [ -f "yarn.lock" ]; then
    yarn install --frozen-lockfile
elif [ -f "pnpm-lock.yaml" ]; then
    pnpm install --frozen-lockfile
else
    npm install
fi
print_success "Dependencies installed"

# Run linting
print_status "Running ESLint..."
if npm run lint; then
    print_success "Linting passed"
else
    print_warning "Linting found issues. Continuing with build..."
fi

# Run type checking
print_status "Running TypeScript type checking..."
if npx tsc --noEmit; then
    print_success "Type checking passed"
else
    print_error "Type checking failed"
    exit 1
fi

# Run tests
print_status "Running tests..."
if npm run test -- --run --coverage; then
    print_success "All tests passed"
else
    print_error "Tests failed"
    exit 1
fi

# Check test coverage
print_status "Checking test coverage..."
COVERAGE_THRESHOLD=90

# Extract coverage percentages (this is a simplified check)
if [ -f "coverage/coverage-summary.json" ]; then
    STATEMENTS=$(node -e "console.log(require('./coverage/coverage-summary.json').total.statements.pct)")
    BRANCHES=$(node -e "console.log(require('./coverage/coverage-summary.json').total.branches.pct)")
    FUNCTIONS=$(node -e "console.log(require('./coverage/coverage-summary.json').total.functions.pct)")
    LINES=$(node -e "console.log(require('./coverage/coverage-summary.json').total.lines.pct)")
    
    if (( $(echo "$STATEMENTS < $COVERAGE_THRESHOLD" | bc -l) )) || \
       (( $(echo "$BRANCHES < $COVERAGE_THRESHOLD" | bc -l) )) || \
       (( $(echo "$FUNCTIONS < $COVERAGE_THRESHOLD" | bc -l) )) || \
       (( $(echo "$LINES < $COVERAGE_THRESHOLD" | bc -l) )); then
        print_error "Test coverage below $COVERAGE_THRESHOLD% threshold"
        print_error "Statements: $STATEMENTS%, Branches: $BRANCHES%, Functions: $FUNCTIONS%, Lines: $LINES%"
        exit 1
    fi
    
    print_success "Test coverage meets $COVERAGE_THRESHOLD% threshold"
    print_success "Statements: $STATEMENTS%, Branches: $BRANCHES%, Functions: $FUNCTIONS%, Lines: $LINES%"
fi

# Build the application
print_status "Building Next.js application..."
export NODE_ENV=production

if npm run build; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

# Analyze bundle size if requested
if [ "$ANALYZE_BUNDLE" = "true" ]; then
    print_status "Analyzing bundle size..."
    ANALYZE=true npm run build
    print_success "Bundle analysis complete. Check bundle-analyzer-report.html"
fi

# Generate build info
print_status "Generating build information..."
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)

cat > .next/build-info.json << EOF
{
  "buildTime": "$BUILD_TIME",
  "gitCommit": "$GIT_COMMIT",
  "gitBranch": "$GIT_BRANCH",
  "nodeVersion": "$NODE_VERSION",
  "npmVersion": "$NPM_VERSION",
  "environment": "production"
}
EOF

print_success "Build information generated"

# Check build size
print_status "Analyzing build size..."
BUILD_SIZE=$(du -sh .next | cut -f1)
print_success "Build size: $BUILD_SIZE"

# Validate build output
print_status "Validating build output..."
if [ ! -d ".next" ]; then
    print_error "Build output directory not found"
    exit 1
fi

if [ ! -f ".next/BUILD_ID" ]; then
    print_error "Build ID file not found"
    exit 1
fi

BUILD_ID=$(cat .next/BUILD_ID)
print_success "Build ID: $BUILD_ID"

# Security scan (if tools are available)
if command -v npm audit &> /dev/null; then
    print_status "Running security audit..."
    if npm audit --audit-level=high; then
        print_success "Security audit passed"
    else
        print_warning "Security audit found issues. Please review."
    fi
fi

# Performance budget check
print_status "Checking performance budget..."
MAIN_JS_SIZE=$(find .next/static/chunks -name "*.js" -exec du -b {} + | awk '{sum += $1} END {print sum}')
MAX_JS_SIZE=1048576  # 1MB in bytes

if [ "$MAIN_JS_SIZE" -gt "$MAX_JS_SIZE" ]; then
    print_warning "JavaScript bundle size ($MAIN_JS_SIZE bytes) exceeds budget (1MB)"
else
    print_success "JavaScript bundle size within budget"
fi

# Create deployment package
if [ "$CREATE_PACKAGE" = "true" ]; then
    print_status "Creating deployment package..."
    tar -czf "product-management-system-$BUILD_ID.tar.gz" \
        .next \
        public \
        package.json \
        package-lock.json \
        next.config.js
    print_success "Deployment package created: product-management-system-$BUILD_ID.tar.gz"
fi

# Final summary
echo ""
echo "🎉 Build completed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Build ID: $BUILD_ID"
echo "Build Time: $BUILD_TIME"
echo "Build Size: $BUILD_SIZE"
echo "Git Commit: $GIT_COMMIT"
echo "Git Branch: $GIT_BRANCH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Test the build locally: npm start"
echo "2. Deploy to your hosting platform"
echo "3. Run smoke tests on production"
echo ""

exit 0
