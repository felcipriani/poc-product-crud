import { z } from 'zod';

// Storage schema for versioning and migrations
const StorageMetaSchema = z.object({
  schemaVersion: z.number().int().positive(),
  lastUpdated: z.string().datetime(),
  totalProducts: z.number().int().nonnegative(),
  totalVariationTypes: z.number().int().nonnegative(),
  totalVariations: z.number().int().nonnegative(),
});

export type StorageMeta = z.infer<typeof StorageMetaSchema>;

// Storage keys
export const STORAGE_KEYS = {
  META: 'poc:meta',
  PRODUCTS: 'poc:products',
  VARIATION_TYPES: 'poc:variation-types',
  VARIATIONS: 'poc:variations',
  PRODUCT_VARIATIONS: 'poc:product-variations',
  COMPOSITIONS: 'poc:compositions',
} as const;

// Current schema version
export const CURRENT_SCHEMA_VERSION = 1;

// Storage errors
export class StorageError extends Error {
  constructor(
    message: string,
    public operation: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

// Migration interface
export interface Migration {
  version: number;
  description: string;
  up: (data: unknown) => unknown;
  down: (data: unknown) => unknown;
}

// Available migrations
const migrations: Migration[] = [
  {
    version: 1,
    description: 'Initial schema',
    up: (data: unknown) => {
      // Initialize with current schema version
      const dataObj = (typeof data === 'object' && data !== null) ? data as Record<string, unknown> : {};
      return { ...dataObj, schemaVersion: 1 };
    },
    down: (data: unknown) => data,
  },
  // Future migrations would be added here
];

// Storage service class
export class StorageService {
  private static instance: StorageService;
  private locks = new Map<string, Promise<void>>();

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Acquires a lock for a storage key to prevent concurrent modifications
   */
  private async acquireLock(key: string): Promise<() => void> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }

    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.locks.set(key, lockPromise);

    return () => {
      this.locks.delete(key);
      releaseLock();
    };
  }

  /**
   * Gets data from localStorage with error handling
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (typeof window === 'undefined') {
        // Server-side rendering - return null
        return null;
      }

      const item = localStorage.getItem(key);
      if (item === null) {
        return null;
      }

      return JSON.parse(item) as T;
    } catch (error) {
      throw new StorageError(
        `Failed to get data from localStorage for key: ${key}`,
        'get',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Sets data in localStorage with error handling
   */
  async set<T>(key: string, value: T): Promise<void> {
    const releaseLock = await this.acquireLock(key);

    try {
      if (typeof window === 'undefined') {
        // Server-side rendering - skip storage
        return;
      }

      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      throw new StorageError(
        `Failed to set data in localStorage for key: ${key}`,
        'set',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      releaseLock();
    }
  }

  /**
   * Removes data from localStorage
   */
  async remove(key: string): Promise<void> {
    const releaseLock = await this.acquireLock(key);

    try {
      if (typeof window === 'undefined') {
        return;
      }

      localStorage.removeItem(key);
    } catch (error) {
      throw new StorageError(
        `Failed to remove data from localStorage for key: ${key}`,
        'remove',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      releaseLock();
    }
  }

  /**
   * Clears all application data from localStorage
   */
  async clear(): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        return;
      }

      // Remove all our storage keys
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      throw new StorageError(
        'Failed to clear localStorage',
        'clear',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Gets or initializes storage metadata
   */
  async getOrInitializeMeta(): Promise<StorageMeta> {
    let meta = await this.get<StorageMeta>(STORAGE_KEYS.META);

    if (!meta) {
      meta = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        lastUpdated: new Date().toISOString(),
        totalProducts: 0,
        totalVariationTypes: 0,
        totalVariations: 0,
      };
      await this.set(STORAGE_KEYS.META, meta);
    }

    return meta;
  }

  /**
   * Updates storage metadata
   */
  async updateMeta(updates: Partial<Omit<StorageMeta, 'schemaVersion' | 'lastUpdated'>>): Promise<void> {
    const meta = await this.getOrInitializeMeta();
    const updatedMeta: StorageMeta = {
      ...meta,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    await this.set(STORAGE_KEYS.META, updatedMeta);
  }

  /**
   * Runs migrations if needed
   */
  async runMigrations(): Promise<void> {
    const meta = await this.getOrInitializeMeta();
    const currentVersion = meta.schemaVersion;

    if (currentVersion === CURRENT_SCHEMA_VERSION) {
      return; // Already up to date
    }

    // Run migrations in sequence
    const applicableMigrations = migrations.filter(
      (migration) => migration.version > currentVersion
    );

    for (const migration of applicableMigrations) {
      try {
        console.log(`Running migration ${migration.version}: ${migration.description}`);
        
        // Get all data that might need migration
        const allData: Record<string, unknown> = {};
        for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
          if (key !== 'META') {
            allData[key] = await this.get(storageKey);
          }
        }

        // Apply migration
        const migratedData = migration.up(allData);

        // Save migrated data back
        if (typeof migratedData === 'object' && migratedData !== null) {
          const dataRecord = migratedData as Record<string, unknown>;
          for (const [key, value] of Object.entries(dataRecord)) {
            const storageKey = STORAGE_KEYS[key as keyof typeof STORAGE_KEYS];
            if (storageKey && value !== undefined) {
              await this.set(storageKey, value);
            }
          }
        }

        // Update schema version manually since it's excluded from updateMeta
        const meta = await this.getOrInitializeMeta();
        const updatedMeta: StorageMeta = {
          ...meta,
          schemaVersion: migration.version,
          lastUpdated: new Date().toISOString(),
        };
        await this.set(STORAGE_KEYS.META, updatedMeta);
      } catch (error) {
        throw new StorageError(
          `Migration ${migration.version} failed: ${migration.description}`,
          'migration',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  /**
   * Exports all data for backup purposes
   */
  async exportData(): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    
    for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
      data[key] = await this.get(storageKey);
    }

    return data;
  }

  /**
   * Imports data from backup (with validation)
   */
  async importData(data: Record<string, unknown>): Promise<void> {
    // Validate that we have meta information
    if (!data.META) {
      throw new StorageError(
        'Import data must include META information',
        'import'
      );
    }

    // Clear existing data
    await this.clear();

    // Import all data
    for (const [key, value] of Object.entries(data)) {
      const storageKey = STORAGE_KEYS[key as keyof typeof STORAGE_KEYS];
      if (storageKey && value !== undefined) {
        await this.set(storageKey, value);
      }
    }

    // Run migrations if needed
    await this.runMigrations();
  }

  /**
   * Gets storage usage information
   */
  async getStorageInfo(): Promise<{
    totalSize: number;
    keyCount: number;
    keys: string[];
  }> {
    if (typeof window === 'undefined') {
      return { totalSize: 0, keyCount: 0, keys: [] };
    }

    const keys = Object.values(STORAGE_KEYS);
    let totalSize = 0;

    for (const key of keys) {
      const item = localStorage.getItem(key);
      if (item) {
        totalSize += item.length;
      }
    }

    return {
      totalSize,
      keyCount: keys.length,
      keys,
    };
  }
}