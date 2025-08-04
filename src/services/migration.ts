import { apiService } from './api';

// Types for localStorage data
interface LocalStorageData {
  // User preferences
  instalearn_config?: string;
  instalearn_relax_dirs?: string;
  instalearn_study_dirs?: string;
  instalearn_combined_dir?: string;
  instalearn_app_started?: string;
  
  // Clips and coin data
  instalearn_clips?: string;
  instalearn_coin_data?: string;
  
  // Video ranges and queue
  instalearn_video_ranges?: string;
  instalearn_clip_queue?: string;
}

interface MigrationResult {
  success: boolean;
  migratedItems: string[];
  errors: string[];
  totalItems: number;
}

export class MigrationService {
  private static instance: MigrationService;
  private isMigrating = false;

  static getInstance(): MigrationService {
    if (!MigrationService.instance) {
      MigrationService.instance = new MigrationService();
    }
    return MigrationService.instance;
  }

  /**
   * Check if there's localStorage data to migrate
   */
  hasLocalStorageData(): boolean {
    const keys = [
      'instalearn_config',
      'instalearn_relax_dirs',
      'instalearn_study_dirs',
      'instalearn_combined_dir',
      'instalearn_app_started',
      'instalearn_clips',
      'instalearn_coin_data',
      'instalearn_video_ranges',
      'instalearn_clip_queue'
    ];

    return keys.some(key => localStorage.getItem(key) !== null);
  }

  /**
   * Get all localStorage data
   */
  private getLocalStorageData(): LocalStorageData {
    return {
          instalearn_config: localStorage.getItem('instalearn_config') || undefined,
    instalearn_relax_dirs: localStorage.getItem('instalearn_relax_dirs') || undefined,
    instalearn_study_dirs: localStorage.getItem('instalearn_study_dirs') || undefined,
    instalearn_combined_dir: localStorage.getItem('instalearn_combined_dir') || undefined,
    instalearn_app_started: localStorage.getItem('instalearn_app_started') || undefined,
    instalearn_clips: localStorage.getItem('instalearn_clips') || undefined,
    instalearn_coin_data: localStorage.getItem('instalearn_coin_data') || undefined,
    instalearn_video_ranges: localStorage.getItem('instalearn_video_ranges') || undefined,
    instalearn_clip_queue: localStorage.getItem('instalearn_clip_queue') || undefined,
    };
  }

  /**
   * Migrate localStorage data to MongoDB
   */
  async migrateToMongoDB(): Promise<MigrationResult> {
    if (this.isMigrating) {
      throw new Error('Migration already in progress');
    }

    this.isMigrating = true;
    const result: MigrationResult = {
      success: false,
      migratedItems: [],
      errors: [],
      totalItems: 0
    };

    try {
      console.log('🔄 Starting migration from localStorage to MongoDB...');

      // Check if MongoDB is available
      try {
        await apiService.healthCheck();
        console.log('✅ MongoDB connection confirmed');
      } catch (error) {
        throw new Error('MongoDB server is not available');
      }

      const localStorageData = this.getLocalStorageData();
      const itemsToMigrate = Object.entries(localStorageData).filter(([_, value]) => value !== undefined);
      result.totalItems = itemsToMigrate.length;

      if (result.totalItems === 0) {
        result.success = true;
        result.migratedItems.push('No data to migrate');
        return result;
      }

      // Prepare user preferences object
      const userPreferences: any = {
        userId: 'default',
        relaxDirectories: [],
        studyDirectories: [],
        combinedDirectory: null,
        clipDurationMinutes: 1,
        isRandomClipDurationEnabled: false,
        randomClipDurationRange: { min: 0.5, max: 2 },
        isAppStarted: false,
        videoRanges: [],
        clipQueue: {
          clips: [],
          currentIndex: 0,
          lastUsed: 0,
          preloadedVideos: []
        },
        coinData: {
          totalCoins: 0,
          coinsEarned: []
        }
      };

      // Migrate each localStorage item
      for (const [key, value] of itemsToMigrate) {
        try {
          await this.migrateItem(key, value, userPreferences, result);
        } catch (error) {
          const errorMsg = `Failed to migrate ${key}: ${error}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // Save user preferences to MongoDB
      if (Object.keys(userPreferences).length > 0) {
        try {
          await apiService.updateUserPreferences('default', userPreferences);
          result.migratedItems.push('User preferences');
          console.log('✅ User preferences migrated successfully');
        } catch (error) {
          const errorMsg = `Failed to save user preferences: ${error}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // Migrate clips if they exist
      if (localStorageData.instalearn_clips) {
        try {
          const clips = JSON.parse(localStorageData.instalearn_clips);
          if (Array.isArray(clips) && clips.length > 0) {
            // Transform clips to match MongoDB schema
            const transformedClips = clips.map((clip: any) => ({
              videoPath: clip.videoName || '',
              videoName: clip.videoName || '',
              startTime: clip.startTime || 0,
              endTime: clip.endTime || 0,
              duration: (clip.endTime || 0) - (clip.startTime || 0),
              directoryType: clip.category || 'relax',
              isWatched: clip.watched || false,
              isMemorized: clip.memorized || false,
              watchCount: 0,
              lastWatchedAt: clip.lastWatchedAt ? new Date(clip.lastWatchedAt) : undefined,
              memorizedAt: undefined,
              watchPercentage: clip.watchPercentage || 0,
              totalWatchTime: clip.totalWatchTime || 0,
              createdAt: new Date(),
              updatedAt: new Date()
            }));

            await apiService.bulkClipsOperation('create', transformedClips);
            result.migratedItems.push(`Clips (${clips.length} items)`);
            console.log(`✅ ${clips.length} clips migrated successfully`);
          }
        } catch (error) {
          const errorMsg = `Failed to migrate clips: ${error}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      result.success = result.errors.length === 0;
      console.log(`✅ Migration completed. Success: ${result.success}, Items: ${result.migratedItems.length}, Errors: ${result.errors.length}`);

    } catch (error) {
      const errorMsg = `Migration failed: ${error}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
      result.success = false;
    } finally {
      this.isMigrating = false;
    }

    return result;
  }

  /**
   * Migrate individual localStorage item
   */
  private async migrateItem(
    key: string, 
    value: string, 
    userPreferences: any, 
    result: MigrationResult
  ): Promise<void> {
    console.log(`🔄 Migrating ${key}...`);

    switch (key) {
      case 'youinsta_config':
        try {
          const config = JSON.parse(value);
          userPreferences.clipDurationMinutes = config.clipDurationMinutes || 1;
          userPreferences.isRandomClipDurationEnabled = config.isRandomClipDurationEnabled || false;
          userPreferences.randomClipDurationRange = config.randomClipDurationRange || { min: 0.5, max: 2 };
          result.migratedItems.push('Configuration');
        } catch (error) {
          throw new Error(`Invalid config format: ${error}`);
        }
        break;

      case 'youinsta_relax_dirs':
        try {
          const relaxDirs = JSON.parse(value);
          if (Array.isArray(relaxDirs)) {
            userPreferences.relaxDirectories = relaxDirs.map((dir: any) => ({
              name: dir.name || '',
              path: dir.path || '',
              handle: dir.handle || ''
            }));
            result.migratedItems.push('Relax directories');
          }
        } catch (error) {
          throw new Error(`Invalid relax directories format: ${error}`);
        }
        break;

      case 'youinsta_study_dirs':
        try {
          const studyDirs = JSON.parse(value);
          if (Array.isArray(studyDirs)) {
            userPreferences.studyDirectories = studyDirs.map((dir: any) => ({
              name: dir.name || '',
              path: dir.path || '',
              handle: dir.handle || ''
            }));
            result.migratedItems.push('Study directories');
          }
        } catch (error) {
          throw new Error(`Invalid study directories format: ${error}`);
        }
        break;

      case 'youinsta_combined_dir':
        try {
          const combinedDir = JSON.parse(value);
          if (combinedDir) {
            userPreferences.combinedDirectory = {
              name: combinedDir.name || '',
              path: combinedDir.path || '',
              handle: combinedDir.handle || ''
            };
            result.migratedItems.push('Combined directory');
          }
        } catch (error) {
          throw new Error(`Invalid combined directory format: ${error}`);
        }
        break;

      case 'youinsta_app_started':
        try {
          userPreferences.isAppStarted = JSON.parse(value);
          result.migratedItems.push('App started state');
        } catch (error) {
          throw new Error(`Invalid app started format: ${error}`);
        }
        break;

      case 'youinsta_coin_data':
        try {
          const coinData = JSON.parse(value);
          if (coinData) {
            userPreferences.coinData = {
              totalCoins: coinData.totalCoins || 0,
              coinsEarned: coinData.history?.map((item: any) => ({
                amount: item.coins || 0,
                reason: 'Migration from localStorage',
                timestamp: new Date(item.date || Date.now())
              })) || []
            };
            result.migratedItems.push('Coin data');
          }
        } catch (error) {
          throw new Error(`Invalid coin data format: ${error}`);
        }
        break;

      case 'youinsta_video_ranges':
        try {
          const videoRanges = JSON.parse(value);
          if (Array.isArray(videoRanges)) {
            userPreferences.videoRanges = videoRanges.map((range: any) => ({
              videoPath: range.video?.name || '',
              videoName: range.video?.name || '',
              timeRanges: range.timeRanges?.map((tr: any) => ({
                start: tr.startTime || 0,
                end: tr.endTime || 0,
                duration: (tr.endTime || 0) - (tr.startTime || 0)
              })) || [],
              directoryType: range.category || 'relax'
            }));
            result.migratedItems.push('Video ranges');
          }
        } catch (error) {
          throw new Error(`Invalid video ranges format: ${error}`);
        }
        break;

      case 'youinsta_clip_queue':
        try {
          const clipQueue = JSON.parse(value);
          if (clipQueue) {
            userPreferences.clipQueue = {
              clips: clipQueue.clips?.map((clip: any) => ({
                videoPath: clip.name || '',
                videoName: clip.name || '',
                startTime: clip.startTime || 0,
                endTime: clip.endTime || 0,
                duration: (clip.endTime || 0) - (clip.startTime || 0),
                directoryType: 'relax'
              })) || [],
              currentIndex: clipQueue.currentIndex || 0,
              lastUsed: clipQueue.lastUsed || 0,
              preloadedVideos: Array.from(clipQueue.preloadedVideos || [])
            };
            result.migratedItems.push('Clip queue');
          }
        } catch (error) {
          throw new Error(`Invalid clip queue format: ${error}`);
        }
        break;

      default:
        console.warn(`Unknown localStorage key: ${key}`);
    }
  }

  /**
   * Clear localStorage data after successful migration
   */
  clearLocalStorageData(): void {
    const keys = [
      'youinsta_config',
      'youinsta_relax_dirs',
      'youinsta_study_dirs',
      'youinsta_combined_dir',
      'youinsta_app_started',
      'youinsta_clips',
      'youinsta_coin_data',
      'youinsta_video_ranges',
      'youinsta_clip_queue'
    ];

    keys.forEach(key => localStorage.removeItem(key));
    console.log('🗑️ localStorage data cleared after successful migration');
  }

  /**
   * Check if migration is in progress
   */
  isMigrationInProgress(): boolean {
    return this.isMigrating;
  }
}

export const migrationService = MigrationService.getInstance(); 