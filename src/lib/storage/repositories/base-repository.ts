import { StorageService, StorageError } from '../storage-service';

// Base repository interface
export interface Repository<T, TCreate, TUpdate> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: TCreate): Promise<T>;
  update(id: string, data: TUpdate): Promise<T>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  count(): Promise<number>;
}

// Base repository implementation
export abstract class BaseRepository<T, TCreate, TUpdate> implements Repository<T, TCreate, TUpdate> {
  protected storage: StorageService;
  protected abstract storageKey: string;
  protected abstract entityName: string;

  constructor() {
    this.storage = StorageService.getInstance();
  }

  /**
   * Gets the ID from an entity
   */
  protected abstract getId(entity: T): string;

  /**
   * Creates a new entity with generated ID and timestamps
   */
  protected abstract createEntity(data: TCreate): T;

  /**
   * Updates an existing entity with new data and updated timestamp
   */
  protected abstract updateEntity(existing: T, data: TUpdate): T;

  /**
   * Validates entity data before persistence
   */
  protected abstract validateEntity(entity: T): void;

  /**
   * Gets all entities from storage
   */
  async findAll(): Promise<T[]> {
    try {
      const entities = await this.storage.get<T[]>(this.storageKey);
      return entities || [];
    } catch (error) {
      throw new StorageError(
        `Failed to retrieve all ${this.entityName}s`,
        'findAll',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Finds an entity by ID
   */
  async findById(id: string): Promise<T | null> {
    try {
      const entities = await this.findAll();
      return entities.find((entity) => this.getId(entity) === id) || null;
    } catch (error) {
      throw new StorageError(
        `Failed to find ${this.entityName} with ID: ${id}`,
        'findById',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Creates a new entity
   */
  async create(data: TCreate): Promise<T> {
    try {
      const entity = this.createEntity(data);
      this.validateEntity(entity);

      const entities = await this.findAll();
      
      // Check for duplicate ID (should not happen with UUID generation)
      const existingEntity = entities.find((e) => this.getId(e) === this.getId(entity));
      if (existingEntity) {
        throw new Error(`${this.entityName} with ID ${this.getId(entity)} already exists`);
      }

      entities.push(entity);
      await this.storage.set(this.storageKey, entities);

      return entity;
    } catch (error) {
      throw new StorageError(
        `Failed to create ${this.entityName}`,
        'create',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Updates an existing entity
   */
  async update(id: string, data: TUpdate): Promise<T> {
    try {
      const entities = await this.findAll();
      const existingIndex = entities.findIndex((entity) => this.getId(entity) === id);

      if (existingIndex === -1) {
        throw new Error(`${this.entityName} with ID ${id} not found`);
      }

      const updatedEntity = this.updateEntity(entities[existingIndex], data);
      this.validateEntity(updatedEntity);

      entities[existingIndex] = updatedEntity;
      await this.storage.set(this.storageKey, entities);

      return updatedEntity;
    } catch (error) {
      throw new StorageError(
        `Failed to update ${this.entityName} with ID: ${id}`,
        'update',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Deletes an entity by ID
   */
  async delete(id: string): Promise<void> {
    try {
      const entities = await this.findAll();
      const filteredEntities = entities.filter((entity) => this.getId(entity) !== id);

      if (filteredEntities.length === entities.length) {
        throw new Error(`${this.entityName} with ID ${id} not found`);
      }

      await this.storage.set(this.storageKey, filteredEntities);
    } catch (error) {
      throw new StorageError(
        `Failed to delete ${this.entityName} with ID: ${id}`,
        'delete',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Checks if an entity exists by ID
   */
  async exists(id: string): Promise<boolean> {
    try {
      const entity = await this.findById(id);
      return entity !== null;
    } catch (error) {
      throw new StorageError(
        `Failed to check existence of ${this.entityName} with ID: ${id}`,
        'exists',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Counts total number of entities
   */
  async count(): Promise<number> {
    try {
      const entities = await this.findAll();
      return entities.length;
    } catch (error) {
      throw new StorageError(
        `Failed to count ${this.entityName}s`,
        'count',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Finds entities by a predicate function
   */
  async findWhere(predicate: (entity: T) => boolean): Promise<T[]> {
    try {
      const entities = await this.findAll();
      return entities.filter(predicate);
    } catch (error) {
      throw new StorageError(
        `Failed to find ${this.entityName}s with predicate`,
        'findWhere',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Finds the first entity matching a predicate
   */
  async findFirst(predicate: (entity: T) => boolean): Promise<T | null> {
    try {
      const entities = await this.findAll();
      return entities.find(predicate) || null;
    } catch (error) {
      throw new StorageError(
        `Failed to find first ${this.entityName} with predicate`,
        'findFirst',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Batch creates multiple entities
   */
  async createMany(dataArray: TCreate[]): Promise<T[]> {
    try {
      const entities = dataArray.map((data) => this.createEntity(data));
      
      // Validate all entities
      entities.forEach((entity) => this.validateEntity(entity));

      const existingEntities = await this.findAll();
      
      // Check for duplicate IDs
      const existingIds = new Set(existingEntities.map((e) => this.getId(e)));
      const duplicateIds = entities
        .map((e) => this.getId(e))
        .filter((id) => existingIds.has(id));

      if (duplicateIds.length > 0) {
        throw new Error(`Duplicate IDs found: ${duplicateIds.join(', ')}`);
      }

      const allEntities = [...existingEntities, ...entities];
      await this.storage.set(this.storageKey, allEntities);

      return entities;
    } catch (error) {
      throw new StorageError(
        `Failed to create multiple ${this.entityName}s`,
        'createMany',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Batch deletes multiple entities by IDs
   */
  async deleteMany(ids: string[]): Promise<void> {
    try {
      const entities = await this.findAll();
      const idsSet = new Set(ids);
      const filteredEntities = entities.filter((entity) => !idsSet.has(this.getId(entity)));

      const deletedCount = entities.length - filteredEntities.length;
      if (deletedCount !== ids.length) {
        const existingIds = entities.map((e) => this.getId(e));
        const notFoundIds = ids.filter((id) => !existingIds.includes(id));
        throw new Error(`${this.entityName}s not found: ${notFoundIds.join(', ')}`);
      }

      await this.storage.set(this.storageKey, filteredEntities);
    } catch (error) {
      throw new StorageError(
        `Failed to delete multiple ${this.entityName}s`,
        'deleteMany',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Clears all entities (use with caution)
   */
  async clear(): Promise<void> {
    try {
      await this.storage.set(this.storageKey, []);
    } catch (error) {
      throw new StorageError(
        `Failed to clear all ${this.entityName}s`,
        'clear',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}