import { apiService, UserPreferences } from '../services/api';

// LocalStorage keys mapping
const LOCALSTORAGE_KEYS = {
  CONFIG: 'instalearn_config',
  RELAX_DIRS: 'instalearn_relax_dirs',
  STUDY_DIRS: 'instalearn_study_dirs',
  COMBINED_DIR: 'instalearn_combined_dir',
  CLIPS: 'instalearn_clips',
  COIN_DATA: 'instalearn_coin_data',
  VIDEO_RANGES: 'instalearn_video_ranges',
  CLIP_QUEUE: 'instalearn_clip_queue',
  APP_STARTED: 'instalearn_app_started'
};

// Migration utility class
export class MigrationService {
  private static instance: MigrationService;
  
  private constructor() {}
  
  static getInstance(): MigrationService {
    if (!MigrationService.instance) {
      MigrationService.instance = new MigrationService();
    }
    return MigrationService.instance;
  }

  // Check if migration is needed
  async checkMigrationStatus(): Promise<{
    needsMigration: boolean;
    hasLocalData: boolean;
    hasMongoData: boolean;
    localDataKeys: string[];
  }> {
    const localDataKeys = this.getLocalStorageKeys();
    const hasLocalData = localDataKeys.length > 0;
    
    let hasMongoData = false;
    try {
      const userPrefs = await apiService.getUserPreferences();
      hasMongoData = userPrefs && Object.keys(userPrefs).length > 0;
    } catch (error) {
      console.log('No MongoDB data found or connection failed');
    }

    return {
      needsMigration: hasLocalData && !hasMongoData,
      hasLocalData,
      hasMongoData,
      localDataKeys
    };
  }

  // Perform migration from localStorage to MongoDB
  async migrateFromLocalStorage(userId: string = 'default'): Promise<{
    success: boolean;
    migratedData: {
      userPreferences: boolean;
      clips: number;
    };
    errors: string[];
  }> {
    const errors: string[] = [];
    const migratedData = {
      userPreferences: false,
      clips: 0
    };

    try {
      console.log('🔄 Starting migration from localStorage to MongoDB...');

      // Migrate user preferences
      const userPrefs = await this.migrateUserPreferences(userId);
      if (userPrefs) {
        migratedData.userPreferences = true;
        console.log('✅ User preferences migrated successfully');
      }

      // Migrate clips
      const clipsCount = await this.migrateClips();
      migratedData.clips = clipsCount;
      console.log(`✅ ${clipsCount} clips migrated successfully`);

      // Clear localStorage after successful migration
      if (migratedData.userPreferences && migratedData.clips > 0) {
        this.clearLocalStorage();
        console.log('🧹 localStorage cleared after successful migration');
      }

      return {
        success: true,
        migratedData,
        errors
      };

    } catch (error) {
      console.error('❌ Migration failed:', error);
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        migratedData,
        errors
      };
    }
  }

  // Migrate user preferences
  private async migrateUserPreferences(userId: string): Promise<boolean> {
    try {
      const config = this.getLocalStorageItem(LOCALSTORAGE_KEYS.CONFIG);
      const relaxDirs = this.getLocalStorageItem(LOCALSTORAGE_KEYS.RELAX_DIRS);
      const studyDirs = this.getLocalStorageItem(LOCALSTORAGE_KEYS.STUDY_DIRS);
      const combinedDir = this.getLocalStorageItem(LOCALSTORAGE_KEYS.COMBINED_DIR);
      const coinData = this.getLocalStorageItem(LOCALSTORAGE_KEYS.COIN_DATA);
      const videoRanges = this.getLocalStorageItem(LOCALSTORAGE_KEYS.VIDEO_RANGES);
      const clipQueue = this.getLocalStorageItem(LOCALSTORAGE_KEYS.CLIP_QUEUE);
      const isAppStarted = this.getLocalStorageItem(LOCALSTORAGE_KEYS.APP_STARTED);

      const userPreferences: Partial<UserPreferences> = {
        userId,
        relaxDirectories: relaxDirs || [],
        studyDirectories: studyDirs || [],
        combinedDirectory: combinedDir || undefined,
        coinData: coinData || { totalCoins: 0, coinsEarned: [] },
        videoRanges: videoRanges || [],
        clipQueue: clipQueue || { clips: [], currentIndex: 0, lastUsed: 0, preloadedVideos: [] },
        isAppStarted: isAppStarted || false
      };

      // Add clip duration settings from config
      if (config) {
        userPreferences.clipDurationMinutes = config.clipDurationMinutes || 1;
        userPreferences.isRandomClipDurationEnabled = config.isRandomClipDurationEnabled || false;
        userPreferences.randomClipDurationRange = config.randomClipDurationRange || { min: 0.5, max: 2 };
      }

      await apiService.updateUserPreferences(userId, userPreferences);
      return true;

    } catch (error) {
      console.error('Error migrating user preferences:', error);
      throw error;
    }
  }

  // Migrate clips
  private async migrateClips(): Promise<number> {
    try {
      const clipsData = this.getLocalStorageItem(LOCALSTORAGE_KEYS.CLIPS);
      
      if (!clipsData || !Array.isArray(clipsData) || clipsData.length === 0) {
        return 0;
      }

      // Transform clips data to match MongoDB schema
      const clipsToMigrate = clipsData.map((clip: any) => ({
        videoPath: clip.videoPath,
        videoName: clip.videoName,
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.duration,
        directoryType: clip.directoryType || 'relax',
        isWatched: clip.isWatched || false,
        isMemorized: clip.isMemorized || false,
        watchCount: clip.watchCount || 0,
        lastWatchedAt: clip.lastWatchedAt ? new Date(clip.lastWatchedAt) : undefined,
        memorizedAt: clip.memorizedAt ? new Date(clip.memorizedAt) : undefined,
        watchPercentage: clip.watchPercentage || 0,
        totalWatchTime: clip.totalWatchTime || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Use bulk operation to create all clips
      const result = await apiService.bulkClipsOperation('create', clipsToMigrate);
      
      if (Array.isArray(result)) {
        return result.length;
      } else {
        return 0;
      }

    } catch (error) {
      console.error('Error migrating clips:', error);
      throw error;
    }
  }

  // Get localStorage keys that contain data
  private getLocalStorageKeys(): string[] {
    return Object.values(LOCALSTORAGE_KEYS).filter(key => {
      const item = localStorage.getItem(key);
      return item !== null && item !== 'null' && item !== '[]' && item !== '{}';
    });
  }

  // Get and parse localStorage item
  private getLocalStorageItem(key: string): any {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error parsing localStorage item ${key}:`, error);
      return null;
    }
  }

  // Clear localStorage
  private clearLocalStorage(): void {
    Object.values(LOCALSTORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Export current MongoDB data to localStorage (for backup)
  async exportToLocalStorage(): Promise<boolean> {
    try {
      console.log('📤 Exporting MongoDB data to localStorage...');

      // Get user preferences
      const userPrefs = await apiService.getUserPreferences();
      
      // Get clips
      const clips = await apiService.getClips();

      // Save to localStorage
      localStorage.setItem(LOCALSTORAGE_KEYS.CONFIG, JSON.stringify({
        clipDurationMinutes: userPrefs.clipDurationMinutes,
        isRandomClipDurationEnabled: userPrefs.isRandomClipDurationEnabled,
        randomClipDurationRange: userPrefs.randomClipDurationRange
      }));
      
      localStorage.setItem(LOCALSTORAGE_KEYS.RELAX_DIRS, JSON.stringify(userPrefs.relaxDirectories));
      localStorage.setItem(LOCALSTORAGE_KEYS.STUDY_DIRS, JSON.stringify(userPrefs.studyDirectories));
      localStorage.setItem(LOCALSTORAGE_KEYS.COMBINED_DIR, JSON.stringify(userPrefs.combinedDirectory));
      localStorage.setItem(LOCALSTORAGE_KEYS.COIN_DATA, JSON.stringify(userPrefs.coinData));
      localStorage.setItem(LOCALSTORAGE_KEYS.VIDEO_RANGES, JSON.stringify(userPrefs.videoRanges));
      localStorage.setItem(LOCALSTORAGE_KEYS.CLIP_QUEUE, JSON.stringify(userPrefs.clipQueue));
      localStorage.setItem(LOCALSTORAGE_KEYS.APP_STARTED, JSON.stringify(userPrefs.isAppStarted));
      localStorage.setItem(LOCALSTORAGE_KEYS.CLIPS, JSON.stringify(clips));

      console.log('✅ Data exported to localStorage successfully');
      return true;

    } catch (error) {
      console.error('❌ Error exporting to localStorage:', error);
      return false;
    }
  }
}

// Export singleton instance
export const migrationService = MigrationService.getInstance(); 