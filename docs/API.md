# API Documentation

This document describes the internal API structure of the Product Management System. While the system currently uses localStorage, this API documentation serves as a blueprint for future backend integration.

## Table of Contents

- [Overview](#overview)
- [Data Models](#data-models)
- [Repository APIs](#repository-apis)
- [Service APIs](#service-apis)
- [Error Handling](#error-handling)
- [Validation](#validation)

## Overview

The system follows a repository pattern with service layer abstraction. All data operations go through repositories, which currently implement localStorage but can be easily swapped for HTTP APIs.

### Architecture Layers

```
UI Components
    ↓
Feature Hooks (useProducts, useVariations, etc.)
    ↓
Service Layer (ProductService, CompositionService, etc.)
    ↓
Repository Layer (ProductRepository, VariationRepository, etc.)
    ↓
Storage Layer (localStorage / Future: HTTP API)
```

## Data Models

### Product

```typescript
interface Product {
  sku: string;                    // Unique identifier
  name: string;                   // Display name
  weight?: number;                // Weight in kg
  dimensions?: {                  // Dimensions in cm
    height: number;
    width: number;
    depth: number;
  };
  isComposite: boolean;           // Can contain other products
  hasVariation: boolean;          // Has product variations
  createdAt: Date;
  updatedAt: Date;
}

interface CreateProductData {
  sku: string;
  name: string;
  weight?: number;
  dimensions?: {
    height: number;
    width: number;
    depth: number;
  };
  isComposite?: boolean;
  hasVariation?: boolean;
}

interface UpdateProductData {
  name?: string;
  weight?: number;
  dimensions?: {
    height: number;
    width: number;
    depth: number;
  };
  isComposite?: boolean;
  hasVariation?: boolean;
}
```

### Variation Type

```typescript
interface VariationType {
  id: string;
  name: string;                   // e.g., "Color", "Size"
  modifiesWeight: boolean;        // Affects product weight
  modifiesDimensions: boolean;    // Affects product dimensions
  createdAt: Date;
  updatedAt: Date;
}

interface CreateVariationTypeData {
  name: string;
  modifiesWeight?: boolean;
  modifiesDimensions?: boolean;
}

interface UpdateVariationTypeData {
  name?: string;
  modifiesWeight?: boolean;
  modifiesDimensions?: boolean;
}
```

### Variation

```typescript
interface Variation {
  id: string;
  name: string;                   // e.g., "Red", "Large"
  variationTypeId: string;        // Reference to VariationType
  createdAt: Date;
  updatedAt: Date;
}

interface CreateVariationData {
  name: string;
  variationTypeId: string;
}

interface UpdateVariationData {
  name?: string;
  variationTypeId?: string;
}
```

### Product Variation Item

```typescript
interface ProductVariationItem {
  id: string;
  productSku: string;             // Reference to Product
  selections: Record<string, string>; // VariationTypeId -> VariationId
  weightOverride?: number;        // Override product weight
  dimensionsOverride?: {          // Override product dimensions
    height: number;
    width: number;
    depth: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface CreateProductVariationItemData {
  productSku: string;
  selections: Record<string, string>;
  weightOverride?: number;
  dimensionsOverride?: {
    height: number;
    width: number;
    depth: number;
  };
}

interface UpdateProductVariationItemData {
  selections?: Record<string, string>;
  weightOverride?: number;
  dimensionsOverride?: {
    height: number;
    width: number;
    depth: number;
  };
}
```

### Composition Item

```typescript
interface CompositionItem {
  id: string;
  parentSku: string;              // Parent product SKU
  childSku: string;               // Child product SKU (may include variation)
  quantity: number;               // Quantity of child in parent
  createdAt: Date;
  updatedAt: Date;
}

interface CreateCompositionItemData {
  parentSku: string;
  childSku: string;
  quantity: number;
}

interface UpdateCompositionItemData {
  quantity?: number;
}
```

## Repository APIs

### Base Repository Interface

All repositories implement this base interface:

```typescript
interface BaseRepository<T, CreateData, UpdateData> {
  // CRUD Operations
  create(data: CreateData): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  update(id: string, data: UpdateData): Promise<T>;
  delete(id: string): Promise<void>;
  
  // Batch Operations
  createMany(data: CreateData[]): Promise<T[]>;
  updateMany(updates: Array<{ id: string; data: UpdateData }>): Promise<T[]>;
  deleteMany(ids: string[]): Promise<void>;
  
  // Query Operations
  findWhere(predicate: (item: T) => boolean): Promise<T[]>;
  findFirst(predicate: (item: T) => boolean): Promise<T | null>;
  count(): Promise<number>;
  exists(id: string): Promise<boolean>;
  
  // Search Operations
  search(query: string): Promise<T[]>;
}
```

### Product Repository

```typescript
interface ProductRepository extends BaseRepository<Product, CreateProductData, UpdateProductData> {
  // Product-specific methods
  findBySku(sku: string): Promise<Product | null>;
  findByName(name: string): Promise<Product | null>;
  findCompositeProducts(): Promise<Product[]>;
  findVariableProducts(): Promise<Product[]>;
  findSimpleProducts(): Promise<Product[]>;
  
  // Validation
  validateSku(sku: string, excludeId?: string): Promise<boolean>;
  validateName(name: string, excludeId?: string): Promise<boolean>;
}
```

### Variation Type Repository

```typescript
interface VariationTypeRepository extends BaseRepository<VariationType, CreateVariationTypeData, UpdateVariationTypeData> {
  // Variation type-specific methods
  findByName(name: string): Promise<VariationType | null>;
  findWeightModifying(): Promise<VariationType[]>;
  findDimensionModifying(): Promise<VariationType[]>;
  
  // Validation
  validateName(name: string, excludeId?: string): Promise<boolean>;
}
```

### Variation Repository

```typescript
interface VariationRepository extends BaseRepository<Variation, CreateVariationData, UpdateVariationData> {
  // Variation-specific methods
  findByType(variationTypeId: string): Promise<Variation[]>;
  findByName(name: string, variationTypeId?: string): Promise<Variation[]>;
  
  // Validation
  validateName(name: string, variationTypeId: string, excludeId?: string): Promise<boolean>;
}
```

### Product Variation Item Repository

```typescript
interface ProductVariationItemRepository extends BaseRepository<ProductVariationItem, CreateProductVariationItemData, UpdateProductVariationItemData> {
  // Product variation-specific methods
  findByProduct(productSku: string): Promise<ProductVariationItem[]>;
  findBySelections(selections: Record<string, string>): Promise<ProductVariationItem[]>;
  countByProduct(productSku: string): Promise<number>;
  
  // Validation
  validateSelections(productSku: string, selections: Record<string, string>, excludeId?: string): Promise<boolean>;
}
```

### Composition Item Repository

```typescript
interface CompositionItemRepository extends BaseRepository<CompositionItem, CreateCompositionItemData, UpdateCompositionItemData> {
  // Composition-specific methods
  findByParent(parentSku: string): Promise<CompositionItem[]>;
  findByChild(childSku: string): Promise<CompositionItem[]>;
  findByParentPattern(parentSkuPattern: string): Promise<CompositionItem[]>;
  
  // Business operations
  calculateCompositeWeight(parentSku: string, childWeights: Record<string, number>): Promise<number>;
  getCompositionStats(): Promise<CompositionStats>;
  validateIntegrity(availableProducts: string[]): Promise<IntegrityCheck>;
  
  // Batch operations
  createBatch(data: CreateCompositionItemData[]): Promise<CompositionItem[]>;
  deleteByParent(parentSku: string): Promise<void>;
  deleteByChild(childSku: string): Promise<void>;
  deleteByParentPattern(parentSkuPattern: string): Promise<void>;
  
  // Migration operations
  moveItems(fromParentSku: string, toParentSku: string): Promise<CompositionItem[]>;
  copyItems(fromParentSku: string, toParentSku: string): Promise<CompositionItem[]>;
}

interface CompositionStats {
  totalItems: number;
  uniqueParents: number;
  uniqueChildren: number;
  averageItemsPerParent: number;
}

interface IntegrityCheck {
  valid: boolean;
  orphanedItems: CompositionItem[];
  missingChildren: string[];
}
```

## Service APIs

### Product Service

```typescript
class ProductService {
  // Validation methods
  static validateProductData(
    data: CreateProductData | UpdateProductData,
    existingProducts: Product[],
    excludeSku?: string
  ): ValidationResult;
  
  static validateStateTransition(
    currentProduct: Product,
    targetFlags: { isComposite?: boolean; hasVariation?: boolean },
    compositionItems: CompositionItem[],
    variations: ProductVariationItem[]
  ): TransitionValidationResult;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface TransitionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

### Composition Service

```typescript
class CompositionService {
  // Weight calculation
  static calculateProductWeight(
    product: Product,
    compositionItems: CompositionItem[],
    variations: ProductVariationItem[],
    childProducts: Product[]
  ): number;
  
  static calculateVariationWeight(
    product: Product,
    variation: ProductVariationItem,
    compositionItems: CompositionItem[],
    childProducts: Product[]
  ): number;
  
  // Validation
  static validateCompositionItem(
    itemData: CreateCompositionItemData,
    existingItems: CompositionItem[],
    availableProducts: Product[]
  ): ValidationResult;
  
  static wouldCreateCircularDependency(
    parentSku: string,
    childSku: string,
    existingItems: CompositionItem[]
  ): boolean;
  
  // Tree operations
  static buildCompositionTree(
    productSku: string,
    compositionItems: CompositionItem[],
    products: Product[],
    maxDepth?: number
  ): CompositionTreeNode;
  
  static calculateTreeWeight(tree: CompositionTreeNode): number;
}

interface CompositionTreeNode {
  sku: string;
  name: string;
  weight: number;
  quantity: number;
  children: CompositionTreeNode[];
}
```

### Variation Service

```typescript
class VariationService {
  // Validation
  static validateVariationCreation(
    data: CreateProductVariationItemData,
    existingVariations: ProductVariationItem[],
    product: Product
  ): ValidationResult;
  
  static validateMinimumVariations(
    variations: ProductVariationItem[],
    product: Product
  ): ValidationResult;
  
  static validateVariationOrdering(
    variations: ProductVariationItem[],
    newOrder: string[]
  ): ValidationResult;
  
  // Utility methods
  static generateVariationName(
    existingVariations: ProductVariationItem[],
    prefix?: string
  ): string;
  
  static calculateVariationWeight(
    variation: ProductVariationItem,
    product: Product,
    compositionItems: CompositionItem[],
    childProducts: Product[]
  ): number;
}
```

## Error Handling

### Error Types

```typescript
// Base error class
class ProductManagementError extends Error {
  code: string;
  context?: Record<string, any>;
  
  constructor(message: string, code: string, context?: Record<string, any>) {
    super(message);
    this.code = code;
    this.context = context;
  }
}

// Specific error types
class ValidationError extends ProductManagementError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', context);
  }
}

class NotFoundError extends ProductManagementError {
  constructor(resource: string, id: string) {
    super(`${resource} with ID '${id}' not found`, 'NOT_FOUND', { resource, id });
  }
}

class DuplicateError extends ProductManagementError {
  constructor(resource: string, field: string, value: string) {
    super(`${resource} with ${field} '${value}' already exists`, 'DUPLICATE', { resource, field, value });
  }
}

class BusinessRuleError extends ProductManagementError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'BUSINESS_RULE_VIOLATION', context);
  }
}
```

### Error Context

```typescript
interface ErrorContext {
  operation: string;
  productSku?: string;
  timestamp: Date;
  userAction: string;
  errorCode: string;
  metadata?: Record<string, any>;
}

interface UserFriendlyError {
  message: string;
  code: string;
  recoverable: boolean;
  retryAction?: () => void;
  supportInfo: {
    timestamp: Date;
    operation: string;
    errorId: string;
  };
}
```

## Validation

### Validation Schemas

The system uses Zod for runtime validation:

```typescript
// Product validation
const ProductSchema = z.object({
  sku: z.string().min(1).max(50).regex(/^[A-Z0-9-]+$/),
  name: z.string().min(1).max(200),
  weight: z.number().positive().optional(),
  dimensions: z.object({
    height: z.number().positive(),
    width: z.number().positive(),
    depth: z.number().positive(),
  }).optional(),
  isComposite: z.boolean().default(false),
  hasVariation: z.boolean().default(false),
});

// Variation type validation
const VariationTypeSchema = z.object({
  name: z.string().min(1).max(100),
  modifiesWeight: z.boolean().default(false),
  modifiesDimensions: z.boolean().default(false),
});

// Composition item validation
const CompositionItemSchema = z.object({
  parentSku: z.string().min(1),
  childSku: z.string().min(1),
  quantity: z.number().int().positive(),
});
```

### Business Rule Validation

```typescript
// Product business rules
const validateProductBusinessRules = (product: Product, context: ValidationContext): ValidationResult => {
  const errors: string[] = [];
  
  // Rule: Products with variations must have at least one variation
  if (product.hasVariation && context.variations.length === 0) {
    errors.push('Products with variations must have at least one variation');
  }
  
  // Rule: Composite products must have at least one composition item
  if (product.isComposite && context.compositionItems.length === 0) {
    errors.push('Composite products must have at least one composition item');
  }
  
  return { valid: errors.length === 0, errors };
};

interface ValidationContext {
  variations: ProductVariationItem[];
  compositionItems: CompositionItem[];
  existingProducts: Product[];
}
```

## Future API Integration

When integrating with a backend API, the repository implementations can be swapped out while maintaining the same interface:

```typescript
// HTTP API implementation example
class HttpProductRepository implements ProductRepository {
  private baseUrl: string;
  private httpClient: HttpClient;
  
  async create(data: CreateProductData): Promise<Product> {
    const response = await this.httpClient.post(`${this.baseUrl}/products`, data);
    return response.data;
  }
  
  async findById(id: string): Promise<Product | null> {
    try {
      const response = await this.httpClient.get(`${this.baseUrl}/products/${id}`);
      return response.data;
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }
  
  // ... other methods
}
```

This design allows for seamless transition from localStorage to HTTP APIs without changing the application logic.
