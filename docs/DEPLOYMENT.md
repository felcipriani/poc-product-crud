# Deployment Guide

This guide covers various deployment options for the Product Management System, from local development to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Local Development](#local-development)
- [Production Build](#production-build)
- [Docker Deployment](#docker-deployment)
- [Cloud Platforms](#cloud-platforms)
- [Performance Optimization](#performance-optimization)
- [Security Considerations](#security-considerations)
- [Monitoring and Logging](#monitoring-and-logging)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher (or yarn/pnpm equivalent)
- **Memory**: Minimum 2GB RAM for build process
- **Storage**: 1GB free space for dependencies and build artifacts

### Development Tools

- **Git**: For version control
- **Docker**: For containerized deployment (optional)
- **Docker Compose**: For multi-container setups (optional)

## Environment Configuration

### Environment Variables

Create appropriate environment files for different stages:

#### `.env.local` (Development)
```bash
# Application
NEXT_PUBLIC_APP_NAME="Product Management System"
NEXT_PUBLIC_APP_VERSION="1.0.0"
NEXT_PUBLIC_APP_ENV="development"

# Development
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1

# Debug
DEBUG=true
NEXT_PUBLIC_DEBUG_MODE=true

# Optional: Analytics (development)
NEXT_PUBLIC_ANALYTICS_ID=""
```

#### `.env.production` (Production)
```bash
# Application
NEXT_PUBLIC_APP_NAME="Product Management System"
NEXT_PUBLIC_APP_VERSION="1.0.0"
NEXT_PUBLIC_APP_ENV="production"

# Production
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Security
NEXT_PUBLIC_DEBUG_MODE=false

# Analytics (production)
NEXT_PUBLIC_ANALYTICS_ID="your-analytics-id"

# Optional: API endpoints (for future backend integration)
NEXT_PUBLIC_API_BASE_URL="https://api.yourcompany.com"
API_SECRET_KEY="your-secret-key"
```

#### `.env.staging` (Staging)
```bash
# Application
NEXT_PUBLIC_APP_NAME="Product Management System (Staging)"
NEXT_PUBLIC_APP_VERSION="1.0.0"
NEXT_PUBLIC_APP_ENV="staging"

# Staging
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Debug (limited)
NEXT_PUBLIC_DEBUG_MODE=false

# Staging API
NEXT_PUBLIC_API_BASE_URL="https://staging-api.yourcompany.com"
```

### Configuration Management

For different environments, use a configuration management approach:

```typescript
// src/lib/config/index.ts
interface AppConfig {
  app: {
    name: string;
    version: string;
    environment: string;
  };
  features: {
    debugMode: boolean;
    analytics: boolean;
  };
  api: {
    baseUrl?: string;
  };
}

export const config: AppConfig = {
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Product Management System',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  },
  features: {
    debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
    analytics: Boolean(process.env.NEXT_PUBLIC_ANALYTICS_ID),
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
};
```

## Local Development

### Quick Start

```bash
# Clone repository
git clone <repository-url>
cd product-management-system

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development with Docker

```bash
# Build development image
docker build -f Dockerfile.dev -t product-management-dev .

# Run development container
docker run -p 3000:3000 -v $(pwd):/app product-management-dev

# Or use Docker Compose
docker-compose -f docker-compose.dev.yml up
```

### Development Scripts

```bash
# Development server with hot reload
npm run dev

# Type checking in watch mode
npm run type-check:watch

# Linting with auto-fix
npm run lint:fix

# Tests in watch mode
npm run test:watch

# Build analysis
npm run build:analyze
```

## Production Build

### Manual Build Process

```bash
# 1. Clean previous builds
rm -rf .next out dist

# 2. Install production dependencies
npm ci --production=false

# 3. Run quality checks
npm run lint
npm run type-check
npm run test

# 4. Build for production
npm run build

# 5. Test production build locally
npm start
```

### Automated Build Script

Use the provided build script for comprehensive build process:

```bash
# Make script executable
chmod +x scripts/build.sh

# Run build with all checks
./scripts/build.sh

# Build with bundle analysis
ANALYZE_BUNDLE=true ./scripts/build.sh

# Build with deployment package
CREATE_PACKAGE=true ./scripts/build.sh
```

### Build Optimization

#### Bundle Analysis

```bash
# Analyze bundle size
ANALYZE=true npm run build

# Check specific bundle sizes
npx @next/bundle-analyzer .next
```

#### Performance Budget

The build script enforces performance budgets:

- **JavaScript Bundle**: < 1MB
- **CSS Bundle**: < 200KB
- **Images**: Optimized with WebP/AVIF
- **Fonts**: Subset and optimized

## Docker Deployment

### Production Docker Build

```bash
# Build production image
docker build -t product-management-system .

# Run production container
docker run -p 3000:3000 product-management-system

# Run with environment variables
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_APP_ENV=production \
  product-management-system
```

### Docker Compose Production

```bash
# Start production stack
docker-compose up -d

# View logs
docker-compose logs -f

# Scale application
docker-compose up -d --scale app=3

# Stop stack
docker-compose down
```

### Multi-Stage Build Benefits

The Dockerfile uses multi-stage builds for:

- **Smaller Images**: Only production dependencies
- **Security**: Non-root user execution
- **Caching**: Optimized layer caching
- **Performance**: Standalone output mode

### Health Checks

The Docker container includes health checks:

```bash
# Check container health
docker ps

# Manual health check
curl -f http://localhost:3000/api/health
```

## Cloud Platforms

### Vercel (Recommended)

Vercel provides zero-configuration deployment for Next.js:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Deploy to production
vercel --prod
```

#### Vercel Configuration

Create `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NEXT_PUBLIC_APP_ENV": "production"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

### Netlify

Deploy to Netlify with build configuration:

#### `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_ENV = "production"
  NEXT_TELEMETRY_DISABLED = "1"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### AWS Deployment

#### AWS EC2

```bash
# 1. Launch EC2 instance (Ubuntu 20.04 LTS)
# 2. Install Node.js and Docker
sudo apt update
sudo apt install -y nodejs npm docker.io

# 3. Clone and deploy
git clone <repository-url>
cd product-management-system
npm install
npm run build
npm start
```

#### AWS ECS (Fargate)

Create ECS task definition:

```json
{
  "family": "product-management-system",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "your-account.dkr.ecr.region.amazonaws.com/product-management-system:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/product-management-system",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### AWS Lambda (Serverless)

For serverless deployment, use AWS Lambda with Next.js:

```bash
# Install serverless framework
npm install -g serverless

# Deploy to Lambda
serverless deploy
```

### Google Cloud Platform

#### Cloud Run

```bash
# Build and push to Container Registry
docker build -t gcr.io/PROJECT_ID/product-management-system .
docker push gcr.io/PROJECT_ID/product-management-system

# Deploy to Cloud Run
gcloud run deploy product-management-system \
  --image gcr.io/PROJECT_ID/product-management-system \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Azure

#### Azure Container Instances

```bash
# Create resource group
az group create --name product-management-rg --location eastus

# Deploy container
az container create \
  --resource-group product-management-rg \
  --name product-management-app \
  --image your-registry/product-management-system:latest \
  --dns-name-label product-management \
  --ports 3000
```

## Performance Optimization

### Build Optimizations

1. **Bundle Splitting**: Automatic code splitting by Next.js
2. **Tree Shaking**: Remove unused code
3. **Minification**: SWC-based minification
4. **Compression**: Gzip/Brotli compression
5. **Image Optimization**: WebP/AVIF formats

### Runtime Optimizations

1. **Caching**: Aggressive caching strategies
2. **CDN**: Use CDN for static assets
3. **Preloading**: Critical resource preloading
4. **Service Worker**: Offline functionality (future)

### Monitoring Performance

```bash
# Lighthouse audit
npx lighthouse http://localhost:3000 --output html

# Bundle analyzer
npm run build:analyze

# Performance testing
npm run test:performance
```

## Security Considerations

### Security Headers

The application includes comprehensive security headers:

```typescript
// next.config.js security headers
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];
```

### Environment Security

1. **Secrets Management**: Use environment variables for sensitive data
2. **HTTPS**: Always use HTTPS in production
3. **Dependencies**: Regular security audits with `npm audit`
4. **Container Security**: Non-root user in Docker containers

### Security Checklist

- [ ] Environment variables configured
- [ ] Security headers implemented
- [ ] HTTPS enabled
- [ ] Dependencies audited
- [ ] Container runs as non-root user
- [ ] Input validation implemented
- [ ] XSS protection enabled
- [ ] CSRF protection enabled

## Monitoring and Logging

### Application Monitoring

#### Health Check Endpoint

Create a health check endpoint:

```typescript
// pages/api/health.ts
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.NEXT_PUBLIC_APP_VERSION,
  };

  res.status(200).json(healthCheck);
}
```

#### Logging Strategy

```typescript
// lib/logger.ts
interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    const entry: LogEntry = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      context,
    };
    console.log(JSON.stringify(entry));
  },
  
  error: (message: string, error?: Error, context?: Record<string, any>) => {
    const entry: LogEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        error: error?.message,
        stack: error?.stack,
      },
    };
    console.error(JSON.stringify(entry));
  },
};
```

### External Monitoring

#### Application Performance Monitoring (APM)

Consider integrating with APM solutions:

- **Vercel Analytics**: Built-in for Vercel deployments
- **Google Analytics**: Web analytics
- **Sentry**: Error tracking and performance monitoring
- **DataDog**: Comprehensive monitoring solution

#### Example Sentry Integration

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

## Troubleshooting

### Common Deployment Issues

#### Build Failures

**Issue**: TypeScript compilation errors
```bash
# Solution: Run type checking
npm run type-check

# Fix type errors and rebuild
npm run build
```

**Issue**: Out of memory during build
```bash
# Solution: Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

#### Runtime Issues

**Issue**: Application not starting
```bash
# Check logs
docker logs container-name

# Verify environment variables
docker exec container-name env
```

**Issue**: Performance problems
```bash
# Analyze bundle size
npm run build:analyze

# Check for memory leaks
node --inspect npm start
```

#### Docker Issues

**Issue**: Container build failures
```bash
# Build with verbose output
docker build --progress=plain -t app .

# Check intermediate layers
docker build --target builder -t app-builder .
```

**Issue**: Container startup failures
```bash
# Run container interactively
docker run -it --entrypoint /bin/sh app

# Check file permissions
docker exec container-name ls -la
```

### Debugging Production Issues

#### Enable Debug Mode

```bash
# Temporary debug mode
DEBUG=true npm start

# Or set environment variable
export DEBUG=true
```

#### Log Analysis

```bash
# View application logs
docker-compose logs -f app

# Filter error logs
docker-compose logs app | grep ERROR

# Export logs for analysis
docker-compose logs app > app.log
```

### Performance Troubleshooting

#### Bundle Size Analysis

```bash
# Analyze bundle composition
npm run build:analyze

# Check for duplicate dependencies
npx duplicate-package-checker-webpack-plugin
```

#### Memory Usage

```bash
# Monitor memory usage
docker stats container-name

# Heap dump analysis (development)
node --inspect --inspect-brk npm start
```

### Getting Help

1. **Check logs**: Always start with application and container logs
2. **Verify configuration**: Ensure environment variables are set correctly
3. **Test locally**: Reproduce issues in local environment
4. **Check resources**: Monitor CPU, memory, and disk usage
5. **Review documentation**: Consult platform-specific documentation

### Support Resources

- **Next.js Documentation**: https://nextjs.org/docs
- **Docker Documentation**: https://docs.docker.com
- **Vercel Documentation**: https://vercel.com/docs
- **AWS Documentation**: https://docs.aws.amazon.com
- **Google Cloud Documentation**: https://cloud.google.com/docs
