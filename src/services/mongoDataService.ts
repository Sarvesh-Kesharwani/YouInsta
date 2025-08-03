import { apiService, Clip } from './api';
import { migrationService } from './migration';

// Types for localStorage fallback
interface LocalStorageConfig {
  clipDurationMinutes: number;
  isRandomClipDurationEnabled: boolean;
  randomClipDurationRange: { min: number; max: number };
  studyVideoProbability: number;
  relaxVideoProbability: number;
}

interface LocalStorageCoinData {
  totalCoins: number;
  earnedToday: number;
  date: string;
  history: { date: string; coins: number }[];
}

export class MongoDataService {
  private static instance: MongoDataService;
  private useMongoDB = true;
  private migrationChecked = false;

  static getInstance(): MongoDataService {
    if (!MongoDataService.instance) {
      MongoDataService.instance = new MongoDataService();
    }
    return MongoDataService.instance;
  }

  /**
   * Initialize the service and check MongoDB availability
   */
  async initialize(): Promise<void> {
    if (this.migrationChecked) return;

    try {
      // Check if MongoDB is available with a timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MongoDB connection timeout')), 3000)
      );
      
      await Promise.race([
        apiService.healthCheck(),
        timeoutPromise
      ]);
      
      console.log('✅ MongoDB is available');
      
      // Check if we need to migrate from localStorage
      if (migrationService.hasLocalStorageData()) {
        console.log('🔄 localStorage data detected, checking if migration is needed...');
        
        // Check if MongoDB already has data
        try {
          const userPrefs = await apiService.getUserPreferences();
          const clips = await apiService.getClips({ limit: 1 });
          
          if (userPrefs && (userPrefs.relaxDirectories.length > 0 || userPrefs.studyDirectories.length > 0 || clips.length > 0)) {
            console.log('✅ MongoDB already has data, skipping migration');
          } else {
            console.log('🔄 MongoDB is empty, starting migration...');
            const result = await migrationService.migrateToMongoDB();
            if (result.success) {
              console.log('✅ Migration completed successfully');
              migrationService.clearLocalStorageData();
            } else {
              console.warn('⚠️ Migration had errors:', result.errors);
            }
          }
        } catch (error) {
          console.log('🔄 MongoDB is empty, starting migration...');
          const result = await migrationService.migrateToMongoDB();
          if (result.success) {
            console.log('✅ Migration completed successfully');
            migrationService.clearLocalStorageData();
          } else {
            console.warn('⚠️ Migration had errors:', result.errors);
          }
        }
      }
      
      this.useMongoDB = true;
    } catch (error) {
      console.warn('⚠️ MongoDB not available, falling back to localStorage:', error);
      this.useMongoDB = false;
    }
    
    this.migrationChecked = true;
  }

  /**
   * Get configuration
   */
  async getConfig(): Promise<LocalStorageConfig> {
    if (this.useMongoDB) {
      try {
        const userPrefs = await apiService.getUserPreferences();
        return {
          clipDurationMinutes: userPrefs.clipDurationMinutes,
          isRandomClipDurationEnabled: userPrefs.isRandomClipDurationEnabled,
          randomClipDurationRange: userPrefs.randomClipDurationRange,
          studyVideoProbability: 80, // Default value
          relaxVideoProbability: 20  // Default value
        };
      } catch (error) {
        console.warn('Failed to get config from MongoDB, falling back to localStorage:', error);
        this.useMongoDB = false;
        return this.getConfigFromLocalStorage();
      }
    } else {
      return this.getConfigFromLocalStorage();
    }
  }

  /**
   * Save configuration
   */
  async saveConfig(config: Partial<LocalStorageConfig>): Promise<void> {
    if (this.useMongoDB) {
      try {
        await apiService.patchUserPreferences('default', {
          clipDurationMinutes: config.clipDurationMinutes,
          isRandomClipDurationEnabled: config.isRandomClipDurationEnabled,
          randomClipDurationRange: config.randomClipDurationRange
        });
      } catch (error) {
        console.warn('Failed to save config to MongoDB, falling back to localStorage:', error);
        this.useMongoDB = false;
        this.saveConfigToLocalStorage(config);
      }
    } else {
      this.saveConfigToLocalStorage(config);
    }
  }

  /**
   * Get coin data
   */
  async getCoinData(): Promise<LocalStorageCoinData> {
    if (this.useMongoDB) {
      try {
        const userPrefs = await apiService.getUserPreferences();
        return {
          totalCoins: userPrefs.coinData.totalCoins,
          earnedToday: userPrefs.coinData.coinsEarned
            .filter(coin => {
              const today = new Date().toDateString();
              return new Date(coin.timestamp).toDateString() === today;
            })
            .reduce((sum, coin) => sum + coin.amount, 0),
          date: new Date().toDateString(),
          history: userPrefs.coinData.coinsEarned.map(coin => ({
            date: new Date(coin.timestamp).toDateString(),
            coins: coin.amount
          }))
        };
      } catch (error) {
        console.warn('Failed to get coin data from MongoDB, falling back to localStorage:', error);
        this.useMongoDB = false;
        return this.getCoinDataFromLocalStorage();
      }
    } else {
      return this.getCoinDataFromLocalStorage();
    }
  }

  /**
   * Save coin data
   */
  async saveCoinData(coinData: LocalStorageCoinData): Promise<void> {
    if (this.useMongoDB) {
      try {
        await apiService.patchUserPreferences('default', {
          coinData: {
            totalCoins: coinData.totalCoins,
            coinsEarned: coinData.history.map(item => ({
              amount: item.coins,
              reason: 'User activity',
              timestamp: new Date(item.date)
            }))
          }
        });
      } catch (error) {
        console.warn('Failed to save coin data to MongoDB, falling back to localStorage:', error);
        this.useMongoDB = false;
        this.saveCoinDataToLocalStorage(coinData);
      }
    } else {
      this.saveCoinDataToLocalStorage(coinData);
    }
  }

  /**
   * Get clips
   */
  async getClips(): Promise<Clip[]> {
    if (this.useMongoDB) {
      try {
        return await apiService.getClips();
      } catch (error) {
        console.warn('Failed to get clips from MongoDB, falling back to localStorage:', error);
        this.useMongoDB = false;
        return this.getClipsFromLocalStorage();
      }
    } else {
      return this.getClipsFromLocalStorage();
    }
  }

  /**
   * Save clips
   */
  async saveClips(clips: Clip[]): Promise<void> {
    if (this.useMongoDB) {
      try {
        // Clear existing clips and create new ones
        const existingClips = await apiService.getClips();
        if (existingClips.length > 0) {
          await apiService.bulkClipsOperation('delete', existingClips);
        }
        if (clips.length > 0) {
          await apiService.bulkClipsOperation('create', clips);
        }
      } catch (error) {
        console.warn('Failed to save clips to MongoDB, falling back to localStorage:', error);
        this.useMongoDB = false;
        this.saveClipsToLocalStorage(clips);
      }
    } else {
      this.saveClipsToLocalStorage(clips);
    }
  }

  /**
   * Add or update a clip
   */
  async addOrUpdateClip(clip: Clip): Promise<void> {
    if (this.useMongoDB) {
      try {
        await apiService.findAndUpdateClip({
          ...clip
        });
      } catch (error) {
        console.warn('Failed to add/update clip in MongoDB, falling back to localStorage:', error);
        this.useMongoDB = false;
        this.addOrUpdateClipInLocalStorage(clip);
      }
    } else {
      this.addOrUpdateClipInLocalStorage(clip);
    }
  }

  /**
   * Get directories
   */
  async getDirectories(): Promise<{
    relaxDirectories: any[];
    studyDirectories: any[];
    combinedDirectory: any;
  }> {
    if (this.useMongoDB) {
      try {
        const userPrefs = await apiService.getUserPreferences();
        return {
          relaxDirectories: userPrefs.relaxDirectories,
          studyDirectories: userPrefs.studyDirectories,
          combinedDirectory: userPrefs.combinedDirectory
        };
      } catch (error) {
        console.warn('Failed to get directories from MongoDB, falling back to localStorage:', error);
        this.useMongoDB = false;
        return this.getDirectoriesFromLocalStorage();
      }
    } else {
      return this.getDirectoriesFromLocalStorage();
    }
  }

  /**
   * Save directories
   */
  async saveDirectories(directories: {
    relaxDirectories: any[];
    studyDirectories: any[];
    combinedDirectory: any;
  }): Promise<void> {
    if (this.useMongoDB) {
      try {
        await apiService.patchUserPreferences('default', {
          relaxDirectories: directories.relaxDirectories,
          studyDirectories: directories.studyDirectories,
          combinedDirectory: directories.combinedDirectory
        });
      } catch (error) {
        console.warn('Failed to save directories to MongoDB, falling back to localStorage:', error);
        this.useMongoDB = false;
        this.saveDirectoriesToLocalStorage(directories);
      }
    } else {
      this.saveDirectoriesToLocalStorage(directories);
    }
  }

  /**
   * Get app state
   */
  async getAppState(): Promise<{
    isAppStarted: boolean;
    videoRanges: any[];
    clipQueue: any;
  }> {
    if (this.useMongoDB) {
      try {
        const userPrefs = await apiService.getUserPreferences();
        return {
          isAppStarted: userPrefs.isAppStarted,
          videoRanges: userPrefs.videoRanges,
          clipQueue: userPrefs.clipQueue
        };
      } catch (error) {
        console.warn('Failed to get app state from MongoDB, falling back to localStorage:', error);
        this.useMongoDB = false;
        return this.getAppStateFromLocalStorage();
      }
    } else {
      return this.getAppStateFromLocalStorage();
    }
  }

  /**
   * Save app state
   */
  async saveAppState(state: {
    isAppStarted: boolean;
    videoRanges: any[];
    clipQueue: any;
  }): Promise<void> {
    if (this.useMongoDB) {
      try {
        await apiService.patchUserPreferences('default', {
          isAppStarted: state.isAppStarted,
          videoRanges: state.videoRanges,
          clipQueue: state.clipQueue
        });
      } catch (error) {
        console.warn('Failed to save app state to MongoDB, falling back to localStorage:', error);
        this.useMongoDB = false;
        this.saveAppStateToLocalStorage(state);
      }
    } else {
      this.saveAppStateToLocalStorage(state);
    }
  }

  /**
   * Check if using MongoDB
   */
  isUsingMongoDB(): boolean {
    return this.useMongoDB;
  }

  // LocalStorage fallback methods
  private getConfigFromLocalStorage(): LocalStorageConfig {
    const configStr = localStorage.getItem('youinsta_config');
    if (configStr) {
      try {
        return JSON.parse(configStr);
      } catch (error) {
        console.warn('Failed to parse config from localStorage:', error);
      }
    }
    return {
      clipDurationMinutes: 1,
      isRandomClipDurationEnabled: false,
      randomClipDurationRange: { min: 0.5, max: 2 },
      studyVideoProbability: 80,
      relaxVideoProbability: 20
    };
  }

  private saveConfigToLocalStorage(config: Partial<LocalStorageConfig>): void {
    const existing = this.getConfigFromLocalStorage();
    const updated = { ...existing, ...config };
    localStorage.setItem('youinsta_config', JSON.stringify(updated));
  }

  private getCoinDataFromLocalStorage(): LocalStorageCoinData {
    const coinDataStr = localStorage.getItem('youinsta_coin_data');
    if (coinDataStr) {
      try {
        return JSON.parse(coinDataStr);
      } catch (error) {
        console.warn('Failed to parse coin data from localStorage:', error);
      }
    }
    return {
      totalCoins: 0,
      earnedToday: 0,
      date: new Date().toDateString(),
      history: []
    };
  }

  private saveCoinDataToLocalStorage(coinData: LocalStorageCoinData): void {
    localStorage.setItem('youinsta_coin_data', JSON.stringify(coinData));
  }

  private getClipsFromLocalStorage(): Clip[] {
    const clipsStr = localStorage.getItem('youinsta_clips');
    if (clipsStr) {
      try {
        const clips = JSON.parse(clipsStr);
        return clips.map((clip: any) => ({
          _id: clip.id,
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
      } catch (error) {
        console.warn('Failed to parse clips from localStorage:', error);
      }
    }
    return [];
  }

  private saveClipsToLocalStorage(clips: Clip[]): void {
    const transformedClips = clips.map(clip => ({
      id: clip._id,
      videoName: clip.videoName,
      startTime: clip.startTime,
      endTime: clip.endTime,
      category: clip.directoryType,
      watched: clip.isWatched,
      memorized: clip.isMemorized,
      watchPercentage: clip.watchPercentage,
      totalWatchTime: clip.totalWatchTime,
      lastWatchedAt: clip.lastWatchedAt
    }));
    localStorage.setItem('youinsta_clips', JSON.stringify(transformedClips));
  }

  private addOrUpdateClipInLocalStorage(clip: Clip): void {
    const clips = this.getClipsFromLocalStorage();
    const existingIndex = clips.findIndex(c => 
      c.videoPath === clip.videoPath && 
      c.startTime === clip.startTime && 
      c.endTime === clip.endTime
    );
    
    if (existingIndex >= 0) {
      clips[existingIndex] = clip;
    } else {
      clips.push(clip);
    }
    
    this.saveClipsToLocalStorage(clips);
  }

  private getDirectoriesFromLocalStorage(): {
    relaxDirectories: any[];
    studyDirectories: any[];
    combinedDirectory: any;
  } {
    const relaxDirsStr = localStorage.getItem('youinsta_relax_dirs');
    const studyDirsStr = localStorage.getItem('youinsta_study_dirs');
    const combinedDirStr = localStorage.getItem('youinsta_combined_dir');

    return {
      relaxDirectories: relaxDirsStr ? JSON.parse(relaxDirsStr) : [],
      studyDirectories: studyDirsStr ? JSON.parse(studyDirsStr) : [],
      combinedDirectory: combinedDirStr ? JSON.parse(combinedDirStr) : null
    };
  }

  private saveDirectoriesToLocalStorage(directories: {
    relaxDirectories: any[];
    studyDirectories: any[];
    combinedDirectory: any;
  }): void {
    localStorage.setItem('youinsta_relax_dirs', JSON.stringify(directories.relaxDirectories));
    localStorage.setItem('youinsta_study_dirs', JSON.stringify(directories.studyDirectories));
    if (directories.combinedDirectory) {
      localStorage.setItem('youinsta_combined_dir', JSON.stringify(directories.combinedDirectory));
    } else {
      localStorage.removeItem('youinsta_combined_dir');
    }
  }

  private getAppStateFromLocalStorage(): {
    isAppStarted: boolean;
    videoRanges: any[];
    clipQueue: any;
  } {
    const appStartedStr = localStorage.getItem('youinsta_app_started');
    const videoRangesStr = localStorage.getItem('youinsta_video_ranges');
    const clipQueueStr = localStorage.getItem('youinsta_clip_queue');

    return {
      isAppStarted: appStartedStr ? JSON.parse(appStartedStr) : false,
      videoRanges: videoRangesStr ? JSON.parse(videoRangesStr) : [],
      clipQueue: clipQueueStr ? JSON.parse(clipQueueStr) : { clips: [], currentIndex: 0, lastUsed: 0, preloadedVideos: [] }
    };
  }

  private saveAppStateToLocalStorage(state: {
    isAppStarted: boolean;
    videoRanges: any[];
    clipQueue: any;
  }): void {
    localStorage.setItem('youinsta_app_started', JSON.stringify(state.isAppStarted));
    localStorage.setItem('youinsta_video_ranges', JSON.stringify(state.videoRanges));
    localStorage.setItem('youinsta_clip_queue', JSON.stringify(state.clipQueue));
  }
}

export const mongoDataService = MongoDataService.getInstance(); 