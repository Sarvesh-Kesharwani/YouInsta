const API_BASE_URL = 'http://localhost:5000/api';

// Types
export interface UserPreferences {
  userId: string;
  relaxDirectories: Array<{
    name: string;
    path: string;
    handle: string;
  }>;
  studyDirectories: Array<{
    name: string;
    path: string;
    handle: string;
  }>;
  combinedDirectory?: {
    name: string;
    path: string;
    handle: string;
  };
  clipDurationMinutes: number;
  isRandomClipDurationEnabled: boolean;
  randomClipDurationRange: {
    min: number;
    max: number;
  };
  isAppStarted: boolean;
  videoRanges: Array<{
    videoPath: string;
    videoName: string;
    timeRanges: Array<{
      start: number;
      end: number;
      duration: number;
    }>;
    directoryType: string;
  }>;
  clipQueue: {
    clips: Array<{
      videoPath: string;
      videoName: string;
      startTime: number;
      endTime: number;
      duration: number;
      directoryType: string;
    }>;
    currentIndex: number;
    lastUsed: number;
    preloadedVideos: string[];
  };
  coinData: {
    totalCoins: number;
    coinsEarned: Array<{
      amount: number;
      reason: string;
      timestamp: Date;
    }>;
  };
  watchTimeData?: {
    totalMinutes: number;
    date: string;
    history: Array<{
      date: string;
      minutes: number;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Clip {
  _id?: string;
  videoPath: string;
  videoName: string;
  startTime: number;
  endTime: number;
  duration: number;
  directoryType: 'relax' | 'study';
  isWatched: boolean;
  isMemorized: boolean;
  watchCount: number;
  lastWatchedAt?: Date;
  memorizedAt?: Date;
  watchPercentage: number;
  totalWatchTime: number;
  createdAt: Date;
  updatedAt: Date;
}

// API Service Class
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // User Preferences API
  async getUserPreferences(userId: string = 'default'): Promise<UserPreferences> {
    return this.request<UserPreferences>(`/user-preferences/${userId}`);
  }

  async updateUserPreferences(
    userId: string = 'default',
    data: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    return this.request<UserPreferences>(`/user-preferences/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patchUserPreferences(
    userId: string = 'default',
    data: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    return this.request<UserPreferences>(`/user-preferences/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteUserPreferences(userId: string = 'default'): Promise<void> {
    return this.request<void>(`/user-preferences/${userId}`, {
      method: 'DELETE',
    });
  }

  async resetUserPreferences(userId: string = 'default'): Promise<UserPreferences> {
    return this.request<UserPreferences>(`/user-preferences/${userId}/reset`, {
      method: 'POST',
    });
  }

  // Clips API
  async getClips(params?: {
    watched?: boolean;
    memorized?: boolean;
    directoryType?: string;
    limit?: number;
    skip?: number;
  }): Promise<Clip[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const queryString = searchParams.toString();
    const endpoint = queryString ? `/clips?${queryString}` : '/clips';
    return this.request<Clip[]>(endpoint);
  }

  async getClip(id: string): Promise<Clip> {
    return this.request<Clip>(`/clips/${id}`);
  }

  async createClip(clipData: Omit<Clip, '_id' | 'createdAt' | 'updatedAt'>): Promise<Clip> {
    return this.request<Clip>('/clips', {
      method: 'POST',
      body: JSON.stringify(clipData),
    });
  }

  async updateClip(id: string, clipData: Partial<Clip>): Promise<Clip> {
    return this.request<Clip>(`/clips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clipData),
    });
  }

  async findAndUpdateClip(clipData: {
    videoPath: string;
    startTime: number;
    endTime: number;
    [key: string]: any;
  }): Promise<Clip> {
    return this.request<Clip>('/clips/find-and-update', {
      method: 'PUT',
      body: JSON.stringify(clipData),
    });
  }

  async deleteClip(id: string): Promise<void> {
    return this.request<void>(`/clips/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkClipsOperation(
    operation: 'create' | 'update' | 'delete',
    clips: Clip[]
  ): Promise<Clip[] | { message: string }> {
    return this.request<Clip[] | { message: string }>('/clips/bulk', {
      method: 'POST',
      body: JSON.stringify({ operation, clips }),
    });
  }

  async getClipsStats(): Promise<{
    overall: {
      totalClips: number;
      watchedClips: number;
      memorizedClips: number;
      totalWatchTime: number;
      totalWatchCount: number;
    };
    byDirectory: Array<{
      _id: string;
      count: number;
      watched: number;
      memorized: number;
    }>;
  }> {
    return this.request('/clips/stats/summary');
  }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>('/health');
  }
}

// Export singleton instance
export const apiService = new ApiService(); 