import { BackupData } from '@/lib/types/migration-types';
import { Product } from '@/lib/domain/entities/product';
import { CompositionItem } from '@/lib/domain/entities/composition-item';
import { ProductVariationItem } from '@/lib/domain/entities/product-variation-item';

/**
 * Service for creating and managing data backups during migrations
 * Provides rollback capabilities for failed operations
 */
export class BackupService {
  private static readonly BACKUP_PREFIX = 'poc:backup:';
  private static readonly MAX_BACKUPS = 10; // Keep only last 10 backups per product
  private static readonly BACKUP_EXPIRY_DAYS = 7; // Auto-cleanup after 7 days

  /**
   * Create a backup of current product state before migration
   */
  async createBackup(
    productSku: string,
    operation: string,
    product: Product,
    compositionItems: CompositionItem[] = [],
    variations: ProductVariationItem[] = []
  ): Promise<string> {
    const backupId = this.generateBackupId(productSku);
    
    const backupData: BackupData = {
      id: backupId,
      productSku,
      timestamp: new Date(),
      originalProduct: { ...product },
      originalCompositionItems: compositionItems.map(item => ({ ...item })),
      originalVariations: variations.map(variation => ({ ...variation })),
      metadata: {
        operation,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
      }
    };

    try {
      // Store backup in localStorage
      const backupKey = `${BackupService.BACKUP_PREFIX}${backupId}`;
      localStorage.setItem(backupKey, JSON.stringify(backupData));
      
      // Update backup index
      await this.updateBackupIndex(productSku, backupId);
      
      // Cleanup old backups
      await this.cleanupOldBackups(productSku);
      
      return backupId;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restore data from a backup
   */
  async restore(backupId: string): Promise<BackupData> {
    try {
      const backupKey = `${BackupService.BACKUP_PREFIX}${backupId}`;
      const backupJson = localStorage.getItem(backupKey);
      
      if (!backupJson) {
        throw new Error(`Backup not found: ${backupId}`);
      }
      
      const backupData: BackupData = JSON.parse(backupJson);
      
      // Validate backup data
      if (!this.validateBackupData(backupData)) {
        throw new Error(`Invalid backup data: ${backupId}`);
      }
      
      return backupData;
    } catch (error) {
      throw new Error(`Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all backups for a product
   */
  async getBackupsForProduct(productSku: string): Promise<BackupData[]> {
    try {
      const indexKey = `${BackupService.BACKUP_PREFIX}index:${productSku}`;
      const indexJson = localStorage.getItem(indexKey);
      
      if (!indexJson) {
        return [];
      }
      
      const backupIds: string[] = JSON.parse(indexJson);
      const backups: BackupData[] = [];
      
      for (const backupId of backupIds) {
        try {
          const backup = await this.restore(backupId);
          backups.push(backup);
        } catch (error) {
          // Skip corrupted backups
          console.warn(`Skipping corrupted backup: ${backupId}`, error);
        }
      }
      
      // Sort by timestamp (newest first)
      return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Failed to get backups for product:', error);
      return [];
    }
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      const backupKey = `${BackupService.BACKUP_PREFIX}${backupId}`;
      localStorage.removeItem(backupKey);
      
      // Remove from index
      const backup = await this.restore(backupId).catch(() => null);
      if (backup) {
        await this.removeFromBackupIndex(backup.productSku, backupId);
      }
    } catch (error) {
      console.error(`Failed to delete backup ${backupId}:`, error);
    }
  }

  /**
   * Cleanup old backups for a product
   */
  private async cleanupOldBackups(productSku: string): Promise<void> {
    try {
      const backups = await this.getBackupsForProduct(productSku);
      
      // Remove excess backups (keep only MAX_BACKUPS)
      if (backups.length > BackupService.MAX_BACKUPS) {
        const toDelete = backups.slice(BackupService.MAX_BACKUPS);
        for (const backup of toDelete) {
          await this.deleteBackup(backup.id);
        }
      }
      
      // Remove expired backups
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - BackupService.BACKUP_EXPIRY_DAYS);
      
      const expiredBackups = backups.filter(backup => 
        new Date(backup.timestamp) < expiryDate
      );
      
      for (const backup of expiredBackups) {
        await this.deleteBackup(backup.id);
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Update backup index for a product
   */
  private async updateBackupIndex(productSku: string, backupId: string): Promise<void> {
    try {
      const indexKey = `${BackupService.BACKUP_PREFIX}index:${productSku}`;
      const indexJson = localStorage.getItem(indexKey);
      
      let backupIds: string[] = [];
      if (indexJson) {
        backupIds = JSON.parse(indexJson);
      }
      
      // Add new backup ID if not already present
      if (!backupIds.includes(backupId)) {
        backupIds.unshift(backupId); // Add to beginning (newest first)
      }
      
      localStorage.setItem(indexKey, JSON.stringify(backupIds));
    } catch (error) {
      console.error('Failed to update backup index:', error);
    }
  }

  /**
   * Remove backup from index
   */
  private async removeFromBackupIndex(productSku: string, backupId: string): Promise<void> {
    try {
      const indexKey = `${BackupService.BACKUP_PREFIX}index:${productSku}`;
      const indexJson = localStorage.getItem(indexKey);
      
      if (indexJson) {
        let backupIds: string[] = JSON.parse(indexJson);
        backupIds = backupIds.filter(id => id !== backupId);
        localStorage.setItem(indexKey, JSON.stringify(backupIds));
      }
    } catch (error) {
      console.error('Failed to remove from backup index:', error);
    }
  }

  /**
   * Generate unique backup ID
   */
  private generateBackupId(productSku: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${productSku}-${timestamp}-${random}`;
  }

  /**
   * Validate backup data structure
   */
  private validateBackupData(data: any): data is BackupData {
    return (
      data &&
      typeof data.id === 'string' &&
      typeof data.productSku === 'string' &&
      data.timestamp &&
      data.originalProduct &&
      Array.isArray(data.originalCompositionItems) &&
      Array.isArray(data.originalVariations) &&
      data.metadata &&
      typeof data.metadata.operation === 'string'
    );
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
  }> {
    let totalBackups = 0;
    let totalSize = 0;
    let oldestBackup: Date | undefined;
    let newestBackup: Date | undefined;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(BackupService.BACKUP_PREFIX) && !key.includes(':index:')) {
          const value = localStorage.getItem(key);
          if (value) {
            totalBackups++;
            totalSize += value.length;
            
            try {
              const backup: BackupData = JSON.parse(value);
              const backupDate = new Date(backup.timestamp);
              
              if (!oldestBackup || backupDate < oldestBackup) {
                oldestBackup = backupDate;
              }
              if (!newestBackup || backupDate > newestBackup) {
                newestBackup = backupDate;
              }
            } catch {
              // Skip invalid backup data
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to get storage stats:', error);
    }

    return {
      totalBackups,
      totalSize,
      oldestBackup,
      newestBackup
    };
  }
}
