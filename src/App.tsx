import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import VideoFeed from './components/VideoFeed';
import UploadArea from './components/UploadArea';
import './App.css';

// Type declarations for File System Access API
declare global {
  interface Window {
    showDirectoryPicker(options?: { startIn?: string }): Promise<any>;
    showSaveFilePicker(options?: { suggestedName?: string; types?: Array<{ description: string; accept: Record<string, string[]> }> }): Promise<any>;
    showOpenFilePicker(options?: { types?: Array<{ description: string; accept: Record<string, string[]> }>; multiple?: boolean }): Promise<any[]>;
  }
}

export interface VideoFile {
  id: string;
  file: File;
  url: string;
  name: string;
  startTime?: number;
  endTime?: number;
  isClip?: boolean;
}

export interface VideoTimeRange {
  startTime: number;
  endTime: number;
}

export interface MemorizedClip {
  id: string;
  videoName: string;
  startTime: number;
  endTime: number;
  category: 'relax' | 'study';
  timestamp: number;
}

export interface WatchedClip {
  id: string;
  videoName: string;
  startTime: number;
  endTime: number;
  category: 'relax' | 'study';
  timestamp: number;
  watchPercentage: number;
}

export interface CoinData {
  totalCoins: number;
  earnedToday: number;
  date: string;
  history: {
    date: string;
    coins: number;
  }[];
}

export interface VideoWithRanges {
  video: VideoFile;
  timeRanges: VideoTimeRange[];
  category: 'relax' | 'study';
}

export interface ClipQueue {
  clips: VideoFile[];
  currentIndex: number;
  lastUsed: number;
  preloadedVideos: Set<string>; // Track which video files are currently loaded
}

interface DirectoryInfo {
  path: string;
  name: string;
  lastSelected: number;
  handle?: any; // Store the directory handle for persistence
}

function App() {
  const [relaxVideos, setRelaxVideos] = useState<VideoFile[]>([]);
  const [studyVideos, setStudyVideos] = useState<VideoFile[]>([]);
  const [videoRanges, setVideoRanges] = useState<VideoWithRanges[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [clipQueue, setClipQueue] = useState<ClipQueue>({ 
    clips: [], 
    currentIndex: 0, 
    lastUsed: 0,
    preloadedVideos: new Set()
  });
  const [isAppStarted, setIsAppStarted] = useState(false);
  const [memorizedClips, setMemorizedClips] = useState<MemorizedClip[]>([]);
  const [watchedClips, setWatchedClips] = useState<WatchedClip[]>([]);
  const [coinData, setCoinData] = useState<CoinData>({
    totalCoins: 0,
    earnedToday: 0,
    date: new Date().toDateString(),
    history: []
  });
  
  // Directory persistence
  const [relaxDirectories, setRelaxDirectories] = useState<DirectoryInfo[]>([]);
  const [studyDirectories, setStudyDirectories] = useState<DirectoryInfo[]>([]);
  const [combinedDirectory, setCombinedDirectory] = useState<DirectoryInfo | null>(null);
  const [isLoadingDirectories, setIsLoadingDirectories] = useState(false);
  const [clipDurationMinutes, setClipDurationMinutes] = useState(() => {
    // Try to get the value from localStorage first
    try {
      const savedConfig = localStorage.getItem('youinsta_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (config.clipDurationMinutes && typeof config.clipDurationMinutes === 'number') {
          return config.clipDurationMinutes;
        }
      }
    } catch (error) {
      console.error('Error loading clip duration from localStorage:', error);
    }
    return 2; // Default 2 minutes
  });
  
  // Random clip duration feature
  const [isRandomClipDurationEnabled, setIsRandomClipDurationEnabled] = useState(() => {
    try {
      const savedConfig = localStorage.getItem('youinsta_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        return config.isRandomClipDurationEnabled || false;
      }
    } catch (error) {
      console.error('Error loading random clip duration setting from localStorage:', error);
    }
    return false; // Default disabled
  });
  
  const [randomClipDurationRange, setRandomClipDurationRange] = useState(() => {
    try {
      const savedConfig = localStorage.getItem('youinsta_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        return config.randomClipDurationRange || { min: 1, max: 5 };
      }
    } catch (error) {
      console.error('Error loading random clip duration range from localStorage:', error);
    }
    return { min: 1, max: 5 }; // Default 1-5 minutes
  });
  
  const [memorizedClipsFileHandle, setMemorizedClipsFileHandle] = useState<any>(null);
  const [watchedClipsFileHandle, setWatchedClipsFileHandle] = useState<any>(null);

  // Load saved directories on app start
  useEffect(() => {
    const loadSavedDirectories = async () => {
      try {
        // Load config first
        await loadConfigFromFile();
        
        const savedRelax = localStorage.getItem('youinsta_relax_dirs');
        const savedStudy = localStorage.getItem('youinsta_study_dirs');
        const savedCombined = localStorage.getItem('youinsta_combined_dir');
        const savedMemorizedClips = localStorage.getItem('youinsta_memorized_clips');
        const savedWatchedClips = localStorage.getItem('youinsta_watched_clips');
        const savedCoinData = localStorage.getItem('youinsta_coin_data');
        
        let hasSavedDirectories = false;
        
        if (savedRelax) {
          const parsed = JSON.parse(savedRelax);
          setRelaxDirectories(parsed);
          
          if (parsed.length > 0) {
            hasSavedDirectories = true;
            console.log(`Found ${parsed.length} saved relax directories`);
          }
        }

        if (savedStudy) {
          const parsed = JSON.parse(savedStudy);
          setStudyDirectories(parsed);
          
          if (parsed.length > 0) {
            hasSavedDirectories = true;
            console.log(`Found ${parsed.length} saved study directories`);
          }
        }

        if (savedCombined) {
          const parsed = JSON.parse(savedCombined);
          setCombinedDirectory(parsed);
          hasSavedDirectories = true;
          console.log('Found saved combined directory');
        }

        if (savedMemorizedClips) {
          const parsed = JSON.parse(savedMemorizedClips);
          setMemorizedClips(parsed);
          console.log(`Loaded ${parsed.length} memorized clips from localStorage (fallback)`);
        }

        if (savedWatchedClips) {
          const parsed = JSON.parse(savedWatchedClips);
          setWatchedClips(parsed);
          console.log(`Loaded ${parsed.length} watched clips from localStorage`);
        }

        if (savedCoinData) {
          const parsed = JSON.parse(savedCoinData);
          setCoinData(parsed);
          console.log(`Loaded coin data: ${parsed.totalCoins} total coins, ${parsed.earnedToday} earned today`);
        }

        // Load videos from saved directories if any exist
        if (hasSavedDirectories) {
          await loadVideosFromSavedDirectories();
        }
      } catch (error) {
        console.error('Error loading saved directories:', error);
      }
    };

    loadSavedDirectories();
  }, []);

  // Update coin data in localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('youinsta_coin_data', JSON.stringify(coinData));
  }, [coinData]);

  // Update memorized clips in localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('youinsta_memorized_clips', JSON.stringify(memorizedClips));
    
    // Check for duplicates whenever memorized clips change
    if (memorizedClips.length > 0) {
      checkForDuplicateClips();
    }
    
    // Also save to JSON file if we have a file handle
    if (memorizedClipsFileHandle && memorizedClips.length > 0) {
      const saveToFile = async () => {
        try {
          const writable = await memorizedClipsFileHandle.createWritable();
          await writable.write(JSON.stringify(memorizedClips, null, 2));
          await writable.close();
          console.log('Automatically saved memorized clips to JSON file');
        } catch (error) {
          console.error('Error auto-saving memorized clips to file:', error);
          // Clear the file handle if there's an error
          setMemorizedClipsFileHandle(null);
        }
      };
      saveToFile();
    }
  }, [memorizedClips, memorizedClipsFileHandle]);

  // Update watched clips in localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('youinsta_watched_clips', JSON.stringify(watchedClips));
    
    // Also save to JSON file if we have a file handle
    if (watchedClipsFileHandle && watchedClips.length > 0) {
      const saveToFile = async () => {
        try {
          const writable = await watchedClipsFileHandle.createWritable();
          await writable.write(JSON.stringify(watchedClips, null, 2));
          await writable.close();
          console.log('Automatically saved watched clips to JSON file');
        } catch (error) {
          console.error('Error auto-saving watched clips to file:', error);
          // Clear the file handle if there's an error
          setWatchedClipsFileHandle(null);
        }
      };
      saveToFile();
    }
  }, [watchedClips, watchedClipsFileHandle]);

  // Save directories to localStorage whenever they change
  useEffect(() => {
    // Don't save the handle as it can't be serialized
    const directoriesToSave = relaxDirectories.map(dir => ({
      path: dir.path,
      name: dir.name,
      lastSelected: dir.lastSelected
    }));
    localStorage.setItem('youinsta_relax_dirs', JSON.stringify(directoriesToSave));
  }, [relaxDirectories]);

  useEffect(() => {
    // Don't save the handle as it can't be serialized
    const directoriesToSave = studyDirectories.map(dir => ({
      path: dir.path,
      name: dir.name,
      lastSelected: dir.lastSelected
    }));
    localStorage.setItem('youinsta_study_dirs', JSON.stringify(directoriesToSave));
  }, [studyDirectories]);

  // Save config to localStorage whenever clip duration changes
  useEffect(() => {
    saveConfigToLocalStorage({ 
      clipDurationMinutes,
      isRandomClipDurationEnabled,
      randomClipDurationRange
    });
  }, [clipDurationMinutes, isRandomClipDurationEnabled, randomClipDurationRange]);

  // Function to save memorized clips to a JSON file
  const saveMemorizedClipsToFile = async () => {
    try {
      // Create a JSON file with the memorized clips data
      const data = JSON.stringify(memorizedClips, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      
      // Use the File System Access API to save the file
      const handle = await window.showSaveFilePicker({
        suggestedName: 'youinsta_memorized_clips.json',
        types: [{
          description: 'JSON File',
          accept: { 'application/json': ['.json'] }
        }]
      });
      
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      
      // Store the file handle for future automatic saves
      setMemorizedClipsFileHandle(handle);
      
      console.log('Memorized clips saved to file successfully');
    } catch (error) {
      console.error('Error saving memorized clips to file:', error);
      // Fallback to localStorage if file saving fails
      localStorage.setItem('youinsta_memorized_clips', JSON.stringify(memorizedClips));
    }
  };

  // Function to load memorized clips from file
  const loadMemorizedClipsFromFile = async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'JSON File',
          accept: { 'application/json': ['.json'] }
        }],
        multiple: false
      });
      
      const file = await fileHandle.getFile();
      const content = await file.text();
      const loadedClips = JSON.parse(content);
      
      if (Array.isArray(loadedClips)) {
        setMemorizedClips(loadedClips);
        // Store the file handle for future automatic saves
        setMemorizedClipsFileHandle(fileHandle);
        console.log(`Loaded ${loadedClips.length} memorized clips from file`);
        alert(`Successfully loaded ${loadedClips.length} memorized clips! 🧠`);
      } else {
        throw new Error('Invalid file format');
      }
    } catch (error) {
      console.error('Error loading memorized clips from file:', error);
      alert('Failed to load memorized clips from file. Please try again.');
    }
  };

  // Function to create a sample memorized_clips.json file
  const createSampleMemorizedClipsFile = async () => {
    try {
      const sampleClips: MemorizedClip[] = [
        {
          id: 'sample1',
          videoName: 'sample_video.mp4',
          startTime: 10,
          endTime: 30,
          category: 'relax',
          timestamp: Date.now()
        }
      ];
      
      const handle = await window.showSaveFilePicker({
        suggestedName: 'memorized_clips.json',
        types: [{
          description: 'JSON File',
          accept: { 'application/json': ['.json'] }
        }]
      });
      
      const blob = new Blob([JSON.stringify(sampleClips, null, 2)], { type: 'application/json' });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      
      console.log('Sample memorized_clips.json file created successfully');
      alert('Sample memorized_clips.json file created! You can now place this file in your directory and use the Upload button.');
    } catch (error) {
      console.error('Error creating sample file:', error);
      alert('Failed to create sample file. Please try again.');
    }
  };

  // Function to save coin data to file
  const saveCoinDataToFile = async () => {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: 'coins_earned.json',
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] }
        }]
      });

      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(coinData, null, 2));
      await writable.close();

      console.log('Coin data saved to file successfully!');
    } catch (error) {
      console.error('Error saving coin data to file:', error);
    }
  };

  // Function to load coin data from file
  const loadCoinDataFromFile = async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] }
        }],
        multiple: false
      });

      const file = await fileHandle.getFile();
      const content = await file.text();
      const parsedData = JSON.parse(content);

      if (parsedData && typeof parsedData === 'object') {
        setCoinData(parsedData);
        console.log('Coin data loaded from file successfully!');
      } else {
        console.warn('File does not contain valid coin data');
      }
    } catch (error) {
      console.error('Error loading coin data from file:', error);
    }
  };

  // Function to create sample coin data file
  const createSampleCoinDataFile = async () => {
    try {
      const sampleData: CoinData = {
        totalCoins: 15,
        earnedToday: 5,
        date: new Date().toDateString(),
        history: [
          { date: new Date().toDateString(), coins: 5 },
          { date: new Date(Date.now() - 86400000).toDateString(), coins: 10 }
        ]
      };

      const fileHandle = await window.showSaveFilePicker({
        suggestedName: 'coins_earned.json',
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] }
        }]
      });

      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(sampleData, null, 2));
      await writable.close();

      console.log('Sample coins_earned.json file created successfully!');
    } catch (error) {
      console.error('Error creating sample coin file:', error);
    }
  };

  // Function to load config from file
  const loadConfigFromFile = async () => {
    try {
      const response = await fetch('/config.json');
      if (!response.ok) {
        throw new Error('Config file not found');
      }
      const config = await response.json();
      
      if (config.clipDurationMinutes && typeof config.clipDurationMinutes === 'number') {
        setClipDurationMinutes(config.clipDurationMinutes);
        console.log(`Loaded clip duration from config: ${config.clipDurationMinutes} minutes`);
      }
      
      if (config.isRandomClipDurationEnabled !== undefined) {
        setIsRandomClipDurationEnabled(config.isRandomClipDurationEnabled);
        console.log(`Loaded random clip duration setting: ${config.isRandomClipDurationEnabled ? 'enabled' : 'disabled'}`);
      }
      
      if (config.randomClipDurationRange && typeof config.randomClipDurationRange.min === 'number' && typeof config.randomClipDurationRange.max === 'number') {
        setRandomClipDurationRange(config.randomClipDurationRange);
        console.log(`Loaded random clip duration range: ${config.randomClipDurationRange.min}-${config.randomClipDurationRange.max} minutes`);
      }
      
      return;
    } catch (error) {
      console.error('Error loading config from file:', error);
    }
    
    // Fallback to localStorage
    try {
      const savedConfig = localStorage.getItem('youinsta_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (config.clipDurationMinutes && typeof config.clipDurationMinutes === 'number') {
          setClipDurationMinutes(config.clipDurationMinutes);
          console.log(`Loaded clip duration from localStorage: ${config.clipDurationMinutes} minutes`);
        }
        
        if (config.isRandomClipDurationEnabled !== undefined) {
          setIsRandomClipDurationEnabled(config.isRandomClipDurationEnabled);
          console.log(`Loaded random clip duration setting from localStorage: ${config.isRandomClipDurationEnabled ? 'enabled' : 'disabled'}`);
        }
        
        if (config.randomClipDurationRange && typeof config.randomClipDurationRange.min === 'number' && typeof config.randomClipDurationRange.max === 'number') {
          setRandomClipDurationRange(config.randomClipDurationRange);
          console.log(`Loaded random clip duration range from localStorage: ${config.randomClipDurationRange.min}-${config.randomClipDurationRange.max} minutes`);
        }
      }
    } catch (error) {
      console.error('Error loading config from localStorage:', error);
    }
  };

  // Function to save config to localStorage
  const saveConfigToLocalStorage = (config: { 
    clipDurationMinutes: number;
    isRandomClipDurationEnabled?: boolean;
    randomClipDurationRange?: { min: number; max: number };
  }) => {
    localStorage.setItem('youinsta_config', JSON.stringify(config));
    console.log('Config saved to localStorage successfully');
  };

  // Function to download config file
  const downloadConfigFile = async () => {
    try {
      const config = { 
        clipDurationMinutes, 
        isRandomClipDurationEnabled,
        randomClipDurationRange,
        version: '1.0.0' 
      };
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      
      const handle = await window.showSaveFilePicker({
        suggestedName: 'config.json',
        types: [{
          description: 'JSON File',
          accept: { 'application/json': ['.json'] }
        }]
      });
      
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      
      console.log('Config file downloaded successfully');
    } catch (error) {
      console.error('Error downloading config file:', error);
    }
  };

  // Function to save watched clips to file
  const saveWatchedClipsToFile = async () => {
    try {
      const data = JSON.stringify(watchedClips, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      
      const handle = await window.showSaveFilePicker({
        suggestedName: 'youinsta_watched_clips.json',
        types: [{
          description: 'JSON File',
          accept: { 'application/json': ['.json'] }
        }]
      });
      
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      
      setWatchedClipsFileHandle(handle);
      
      console.log('Watched clips saved to file successfully!');
    } catch (error) {
      console.error('Error saving watched clips to file:', error);
    }
  };

  // Function to load watched clips from file
  const loadWatchedClipsFromFile = async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] }
        }],
        multiple: false
      });

      const file = await fileHandle.getFile();
      const content = await file.text();
      const parsedClips = JSON.parse(content);

      if (Array.isArray(parsedClips)) {
        setWatchedClips(parsedClips);
        setWatchedClipsFileHandle(fileHandle);
        console.log(`Loaded ${parsedClips.length} watched clips from file`);
      } else {
        console.warn('File does not contain valid watched clips array');
      }
    } catch (error) {
      console.error('Error loading watched clips from file:', error);
    }
  };

  // Function to create a sample watched_clips.json file
  const createSampleWatchedClipsFile = async () => {
    try {
      const sampleClips: WatchedClip[] = [
        {
          id: 'sample1',
          videoName: 'sample_video.mp4',
          startTime: 10,
          endTime: 30,
          category: 'relax',
          timestamp: Date.now(),
          watchPercentage: 85
        }
      ];
      
      const handle = await window.showSaveFilePicker({
        suggestedName: 'watched_clips.json',
        types: [{
          description: 'JSON File',
          accept: { 'application/json': ['.json'] }
        }]
      });
      
      const blob = new Blob([JSON.stringify(sampleClips, null, 2)], { type: 'application/json' });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      
      console.log('Sample watched_clips.json file created successfully');
      alert('Sample watched_clips.json file created! You can now place this file in your directory and use the Upload button.');
    } catch (error) {
      console.error('Error creating sample file:', error);
      alert('Failed to create sample file. Please try again.');
    }
  };

  // Function to add a clip to watched clips
  const addToWatchedClips = (currentClip: VideoFile, watchPercentage: number) => {
    if (!currentClip.isClip || currentClip.startTime === undefined || currentClip.endTime === undefined) {
      return;
    }

    const videoWithRanges = videoRanges.find(vr => vr.video.id === currentClip.id.split('_clip_')[0]);
    if (!videoWithRanges) {
      return;
    }

    // Check if clip is already in watched list
    const existingClip = watchedClips.find(clip =>
      clip.videoName === videoWithRanges.video.name &&
      clip.startTime === currentClip.startTime &&
      clip.endTime === currentClip.endTime
    );

    if (existingClip) {
      // Update the watch percentage if it's higher
      if (watchPercentage > existingClip.watchPercentage) {
        setWatchedClips(prev => prev.map(clip =>
          clip.id === existingClip.id
            ? { ...clip, watchPercentage, timestamp: Date.now() }
            : clip
        ));
        console.log(`Updated watch percentage for clip: ${videoWithRanges.video.name} (${currentClip.startTime}s - ${currentClip.endTime}s) to ${watchPercentage}%`);
      }
    } else {
      // Add new watched clip
      const watchedClip: WatchedClip = {
        id: Math.random().toString(36).substr(2, 9),
        videoName: videoWithRanges.video.name,
        startTime: currentClip.startTime,
        endTime: currentClip.endTime,
        category: videoWithRanges.category,
        timestamp: Date.now(),
        watchPercentage
      };

      setWatchedClips(prev => [...prev, watchedClip]);
      console.log(`Added clip to watched: ${videoWithRanges.video.name} (${currentClip.startTime}s - ${currentClip.endTime}s) with ${watchPercentage}% watched`);
    }
  };

  // Function to check if a clip has been watched (80% or more)
  const isClipWatched = (currentClip: VideoFile): boolean => {
    if (!currentClip.isClip || currentClip.startTime === undefined || currentClip.endTime === undefined) {
      return false;
    }

    const watchedClip = watchedClips.find(clip =>
      clip.videoName === currentClip.name &&
      clip.startTime === currentClip.startTime &&
      clip.endTime === currentClip.endTime
    );

    return watchedClip ? watchedClip.watchPercentage >= 80 : false;
  };

  // Function to check if a clip range overlaps with a watched clip (80% or more overlap)
  const hasOverlappingWatchedClip = (currentClip: VideoFile): boolean => {
    if (!currentClip.isClip || currentClip.startTime === undefined || currentClip.endTime === undefined) {
      return false;
    }

    const currentClipDuration = currentClip.endTime - currentClip.startTime;
    
    return watchedClips.some(watchedClip => {
      if (watchedClip.videoName !== currentClip.name) return false;
      
      const overlapStart = Math.max(currentClip.startTime!, watchedClip.startTime);
      const overlapEnd = Math.min(currentClip.endTime!, watchedClip.endTime);
      const overlapDuration = Math.max(0, overlapEnd - overlapStart);
      
      const overlapPercentage = (overlapDuration / currentClipDuration) * 100;
      return overlapPercentage >= 80;
    });
  };

  // Function to handle quiz answers
  const handleQuizAnswer = (isCorrect: boolean) => {
    if (isCorrect) {
      addCoins(1);
      console.log('Correct answer! +1 coin');
    } else {
      removeCoins(1);
      console.log('Incorrect answer! -1 coin');
    }
  };

  // Save combined directory to localStorage whenever it changes
  useEffect(() => {
    if (combinedDirectory) {
      const directoryToSave = {
        path: combinedDirectory.path,
        name: combinedDirectory.name,
        lastSelected: combinedDirectory.lastSelected
      };
      localStorage.setItem('youinsta_combined_dir', JSON.stringify(directoryToSave));
    } else {
      localStorage.removeItem('youinsta_combined_dir');
    }
  }, [combinedDirectory]);

  // Function to add coins
  const addCoins = (amount: number) => {
    const today = new Date().toDateString();
    
    setCoinData(prev => {
      const newHistory = [...prev.history];
      
      // Update today's entry or create new one
      const todayIndex = newHistory.findIndex(entry => entry.date === today);
      if (todayIndex >= 0) {
        newHistory[todayIndex].coins += amount;
      } else {
        newHistory.push({ date: today, coins: amount });
      }
      
      return {
        totalCoins: prev.totalCoins + amount,
        earnedToday: prev.date === today ? prev.earnedToday + amount : amount,
        date: today,
        history: newHistory
      };
    });
  };

  // Function to remove coins
  const removeCoins = (amount: number) => {
    const today = new Date().toDateString();
    
    setCoinData(prev => {
      const newHistory = [...prev.history];
      
      // Update today's entry
      const todayIndex = newHistory.findIndex(entry => entry.date === today);
      if (todayIndex >= 0) {
        newHistory[todayIndex].coins = Math.max(0, newHistory[todayIndex].coins - amount);
      }
      
      return {
        totalCoins: Math.max(0, prev.totalCoins - amount),
        earnedToday: prev.date === today ? Math.max(0, prev.earnedToday - amount) : 0,
        date: today,
        history: newHistory
      };
    });
  };

  // Function to check if a clip is already memorized
  const isClipMemorized = (currentClip: VideoFile): boolean => {
    if (!currentClip.isClip || currentClip.startTime === undefined || currentClip.endTime === undefined) {
      return false;
    }
    
    const isMemorized = memorizedClips.some(clip => 
      clip.videoName === currentClip.name &&
      clip.startTime === currentClip.startTime &&
      clip.endTime === currentClip.endTime
    );
    
    if (isMemorized) {
      console.log(`Clip is already memorized: ${currentClip.name} (${currentClip.startTime}s - ${currentClip.endTime}s)`);
    }
    
    return isMemorized;
  };

  // Function to check for duplicate clips in memorized list
  const checkForDuplicateClips = () => {
    const duplicates: { [key: string]: MemorizedClip[] } = {};
    
    memorizedClips.forEach(clip => {
      const key = `${clip.videoName}_${clip.startTime}_${clip.endTime}`;
      if (!duplicates[key]) {
        duplicates[key] = [];
      }
      duplicates[key].push(clip);
    });
    
    const actualDuplicates = Object.values(duplicates).filter(clips => clips.length > 1);
    
    if (actualDuplicates.length > 0) {
      console.warn('Found duplicate clips in memorized list:', actualDuplicates);
      return actualDuplicates;
    } else {
      console.log('No duplicate clips found in memorized list');
      return [];
    }
  };

  // Function to remove duplicate clips from memorized list
  const removeDuplicateClips = () => {
    const uniqueClips: MemorizedClip[] = [];
    const seenKeys = new Set<string>();
    
    memorizedClips.forEach(clip => {
      const key = `${clip.videoName}_${clip.startTime}_${clip.endTime}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueClips.push(clip);
      } else {
        console.log(`Removing duplicate clip: ${clip.videoName} (${clip.startTime}s - ${clip.endTime}s)`);
      }
    });
    
    if (uniqueClips.length !== memorizedClips.length) {
      setMemorizedClips(uniqueClips);
      console.log(`Removed ${memorizedClips.length - uniqueClips.length} duplicate clips`);
    }
  };

  // Function to add or remove from memorized (toggle functionality)
  const addToMemorized = (currentClip: VideoFile) => {
    if (!currentClip.isClip || currentClip.startTime === undefined || currentClip.endTime === undefined) {
      return; // Silently return without popup
    }

    // Check if clip is already memorized
    const isAlreadyMemorized = isClipMemorized(currentClip);
    
    if (isAlreadyMemorized) {
      // Remove from memorized
      const clipToRemove = memorizedClips.find(clip => 
        clip.videoName === currentClip.name &&
        clip.startTime === currentClip.startTime &&
        clip.endTime === currentClip.endTime
      );
      
      if (clipToRemove) {
        setMemorizedClips(prev => prev.filter(clip => clip.id !== clipToRemove.id));
        removeCoins(1); // Remove 1 coin
        console.log(`Removed clip from memorized: ${currentClip.name} (${currentClip.startTime}s - ${currentClip.endTime}s)`);
      }
    } else {
      // Add to memorized - Check for duplicates before adding
      const videoWithRanges = videoRanges.find(vr => vr.video.id === currentClip.id.split('_clip_')[0]);
      if (!videoWithRanges) {
        return; // Silently return without popup
      }

      // Explicit duplicate check before adding
      const existingClip = memorizedClips.find(clip => 
        clip.videoName === videoWithRanges.video.name &&
        clip.startTime === currentClip.startTime &&
        clip.endTime === currentClip.endTime
      );

      if (existingClip) {
        console.log(`Clip already exists in memorized list: ${videoWithRanges.video.name} (${currentClip.startTime}s - ${currentClip.endTime}s)`);
        return; // Don't add duplicate
      }

      const memorizedClip: MemorizedClip = {
        id: Math.random().toString(36).substr(2, 9),
        videoName: videoWithRanges.video.name,
        startTime: currentClip.startTime,
        endTime: currentClip.endTime,
        category: videoWithRanges.category,
        timestamp: Date.now()
      };

      setMemorizedClips(prev => [...prev, memorizedClip]);
      addCoins(1); // Add 1 coin
      console.log(`Added clip to memorized: ${videoWithRanges.video.name} (${currentClip.startTime}s - ${currentClip.endTime}s)`);
    }
  };

  // Function to remove a clip from memorized list
  const removeFromMemorized = (clipId: string) => {
    setMemorizedClips(prev => prev.filter(clip => clip.id !== clipId));
  };

  // Function to clear all memorized clips
  const clearMemorizedClips = () => {
    if (memorizedClips.length > 0) {
      const shouldClear = confirm('Are you sure you want to clear all memorized clips?');
      if (shouldClear) {
        setMemorizedClips([]);
      }
    }
  };

  // Function to recursively find all video files in a directory
  const findVideosInDirectory = async (dirHandle: any): Promise<File[]> => {
    const videos: File[] = [];
    
    try {
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          if (file.type.startsWith('video/')) {
            videos.push(file);
          }
        } else if (entry.kind === 'directory') {
          // Recursively search subdirectories
          const subVideos = await findVideosInDirectory(entry);
          videos.push(...subVideos);
        }
      }
    } catch (error) {
      console.error('Error reading directory:', error);
    }
    
    return videos;
  };

  // Function to load videos from combined directory (relax and study folders)
  const loadVideosFromCombinedDirectory = async (dirInfo: DirectoryInfo) => {
    setIsLoadingDirectories(true);
    
    try {
      // For saved directories, we need to prompt the user to reselect
      const dirHandle = await window.showDirectoryPicker({
        startIn: dirInfo.path
      });
      
      const relaxVideos: VideoFile[] = [];
      const studyVideos: VideoFile[] = [];
      
      // Look for relax and study folders
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'directory') {
          if (entry.name.toLowerCase() === 'relax') {
            const relaxFiles = await findVideosInDirectory(entry);
            const relaxVideoObjects: VideoFile[] = relaxFiles.map(file => ({
              id: Math.random().toString(36).substr(2, 9),
              file,
              url: URL.createObjectURL(file),
              name: file.name
            }));
            relaxVideos.push(...relaxVideoObjects);
          } else if (entry.name.toLowerCase() === 'study') {
            const studyFiles = await findVideosInDirectory(entry);
            const studyVideoObjects: VideoFile[] = studyFiles.map(file => ({
              id: Math.random().toString(36).substr(2, 9),
              file,
              url: URL.createObjectURL(file),
              name: file.name
            }));
            studyVideos.push(...studyVideoObjects);
          }
        }
      }
      
      setRelaxVideos(relaxVideos);
      setStudyVideos(studyVideos);
      
      // Update directory info
      const updatedDirInfo = { ...dirInfo, handle: dirHandle, lastSelected: Date.now() };
      setCombinedDirectory(updatedDirInfo);
      
    } catch (error) {
      console.error('Error loading combined directory:', error);
    } finally {
      setIsLoadingDirectories(false);
    }
  };

  // Function to load videos from saved directories (for app restart)
  const loadVideosFromSavedDirectories = async () => {
    setIsLoadingDirectories(true);
    
    try {
      const allVideos: VideoFile[] = [];
      
      for (const dirInfo of relaxDirectories) {
        try {
          // For saved directories, we need to prompt the user to reselect
          // because File System Access API handles can't be serialized
          const dirHandle = await window.showDirectoryPicker({
            startIn: dirInfo.path
          });
          
          // Find all videos in this directory
          const videoFiles = await findVideosInDirectory(dirHandle);
          
          // Convert to VideoFile objects
          const videoObjects: VideoFile[] = videoFiles.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            url: URL.createObjectURL(file),
            name: file.name
          }));
          
          allVideos.push(...videoObjects);
          
          // Update directory info with new handle
          const updatedDirInfo = { ...dirInfo, handle: dirHandle, lastSelected: Date.now() };
          setRelaxDirectories(prev => 
            prev.map(d => d.path === dirInfo.path ? updatedDirInfo : d)
          );
          
        } catch (error) {
          console.error(`Error loading directory ${dirInfo.path}:`, error);
          // Remove the problematic directory
          setRelaxDirectories(prev => prev.filter(d => d.path !== dirInfo.path));
        }
      }
      
      for (const dirInfo of studyDirectories) {
        try {
          // For saved directories, we need to prompt the user to reselect
          // because File System Access API handles can't be serialized
          const dirHandle = await window.showDirectoryPicker({
            startIn: dirInfo.path
          });
          
          // Find all videos in this directory
          const videoFiles = await findVideosInDirectory(dirHandle);
          
          // Convert to VideoFile objects
          const videoObjects: VideoFile[] = videoFiles.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            url: URL.createObjectURL(file),
            name: file.name
          }));
          
          allVideos.push(...videoObjects);
          
          // Update directory info with new handle
          const updatedDirInfo = { ...dirInfo, handle: dirHandle, lastSelected: Date.now() };
          setStudyDirectories(prev => 
            prev.map(d => d.path === dirInfo.path ? updatedDirInfo : d)
          );
          
        } catch (error) {
          console.error(`Error loading directory ${dirInfo.path}:`, error);
          // Remove the problematic directory
          setStudyDirectories(prev => prev.filter(d => d.path !== dirInfo.path));
        }
      }
      
      // Update the appropriate video state
      setRelaxVideos(allVideos);
      setStudyVideos(allVideos);
      
    } catch (error) {
      console.error('Error loading videos from directories:', error);
    } finally {
      setIsLoadingDirectories(false);
    }
  };

  // Function to load videos from newly selected directories
  const loadVideosFromDirectories = async (directories: DirectoryInfo[], category: 'relax' | 'study') => {
    setIsLoadingDirectories(true);
    
    try {
      const allVideos: VideoFile[] = [];
      
      for (const dirInfo of directories) {
        try {
          // Try to get the directory handle
          const dirHandle = await window.showDirectoryPicker({
            startIn: dirInfo.path
          });
          
          // Find all videos in this directory
          const videoFiles = await findVideosInDirectory(dirHandle);
          
          // Convert to VideoFile objects
          const videoObjects: VideoFile[] = videoFiles.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            url: URL.createObjectURL(file),
            name: file.name
          }));
          
          allVideos.push(...videoObjects);
          
          // Update directory info
          const updatedDirInfo = { ...dirInfo, lastSelected: Date.now() };
          if (category === 'relax') {
            setRelaxDirectories(prev => 
              prev.map(d => d.path === dirInfo.path ? updatedDirInfo : d)
            );
          } else {
            setStudyDirectories(prev => 
              prev.map(d => d.path === dirInfo.path ? updatedDirInfo : d)
            );
          }
          
        } catch (error) {
          console.error(`Error loading directory ${dirInfo.path}:`, error);
          // Remove the problematic directory
          if (category === 'relax') {
            setRelaxDirectories(prev => prev.filter(d => d.path !== dirInfo.path));
          } else {
            setStudyDirectories(prev => prev.filter(d => d.path !== dirInfo.path));
          }
        }
      }
      
      // Update the appropriate video state
      if (category === 'relax') {
        setRelaxVideos(allVideos);
      } else {
        setStudyVideos(allVideos);
      }
      
    } catch (error) {
      console.error('Error loading videos from directories:', error);
    } finally {
      setIsLoadingDirectories(false);
    }
  };

  // Function to select a combined directory (with relax and study folders) and load memorized clips
  const selectCombinedDirectory = async () => {
    try {
      // First, try to load memorized clips and coin data from JSON files in the selected directory
      let loadedMemorizedClips: MemorizedClip[] = [];
      let loadedCoinData: CoinData | null = null;
      
      try {
        const dirHandle = await window.showDirectoryPicker();
        console.log('Selected directory:', dirHandle.name);
        
        // Look for JSON files in the root of the selected directory
        let memorizedFileFound = false;
        let coinFileFound = false;
        
        for await (const entry of dirHandle.values()) {
          console.log('Checking entry:', entry.name, 'kind:', entry.kind);
          
          if (entry.kind === 'file') {
            if (entry.name.toLowerCase() === 'memorized_clips.json') {
              memorizedFileFound = true;
              console.log('Found memorized_clips.json file');
              try {
                const file = await entry.getFile();
                const content = await file.text();
                console.log('File content length:', content.length);
                const parsedClips = JSON.parse(content);
                
                if (Array.isArray(parsedClips)) {
                  loadedMemorizedClips = parsedClips;
                  // Store the file handle for automatic saves
                  setMemorizedClipsFileHandle(entry);
                  console.log(`Successfully loaded ${parsedClips.length} memorized clips from ${entry.name} and set up automatic saving`);
                } else {
                  console.warn('memorized_clips.json does not contain an array');
                }
              } catch (error) {
                console.warn('Could not parse memorized_clips.json file:', error);
              }
            } else if (entry.name.toLowerCase() === 'coins_earned.json') {
              coinFileFound = true;
              console.log('Found coins_earned.json file');
              try {
                const file = await entry.getFile();
                const content = await file.text();
                console.log('Coin file content length:', content.length);
                const parsedCoinData = JSON.parse(content);
                
                if (parsedCoinData && typeof parsedCoinData === 'object') {
                  loadedCoinData = parsedCoinData;
                  console.log(`Successfully loaded coin data: ${parsedCoinData.totalCoins} total coins`);
                } else {
                  console.warn('coins_earned.json does not contain valid coin data');
                }
              } catch (error) {
                console.warn('Could not parse coins_earned.json file:', error);
              }
            }
          }
        }
        
        if (!memorizedFileFound) {
          console.log('No memorized_clips.json file found in the selected directory');
          console.log('To create a memorized_clips.json file, use the "💾 Save to File" button in the Memorized Clips section');
          
          // Try to create a new memorized_clips.json file in the selected directory
          try {
            const newMemorizedFileHandle = await dirHandle.getFileHandle('memorized_clips.json', { create: true });
            const writable = await newMemorizedFileHandle.createWritable();
            await writable.write(JSON.stringify([], null, 2));
            await writable.close();
            setMemorizedClipsFileHandle(newMemorizedFileHandle);
            console.log('Created new memorized_clips.json file in the selected directory for automatic saves');
          } catch (error) {
            console.log('Could not create memorized_clips.json file (will need manual save)');
          }
        }
        
        if (!coinFileFound) {
          console.log('No coins_earned.json file found in the selected directory');
        }
        
        // Get directory info
        const dirInfo: DirectoryInfo = {
          path: dirHandle.name,
          name: dirHandle.name,
          lastSelected: Date.now(),
          handle: dirHandle
        };
        
        const relaxVideos: VideoFile[] = [];
        const studyVideos: VideoFile[] = [];
        
        // Look for relax and study folders
        let relaxFolderFound = false;
        let studyFolderFound = false;
        
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'directory') {
            if (entry.name.toLowerCase() === 'relax') {
              relaxFolderFound = true;
              console.log('Found relax folder');
              const relaxFiles = await findVideosInDirectory(entry);
              console.log(`Found ${relaxFiles.length} video files in relax folder`);
              const relaxVideoObjects: VideoFile[] = relaxFiles.map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                file,
                url: URL.createObjectURL(file),
                name: file.name
              }));
              relaxVideos.push(...relaxVideoObjects);
            } else if (entry.name.toLowerCase() === 'study') {
              studyFolderFound = true;
              console.log('Found study folder');
              const studyFiles = await findVideosInDirectory(entry);
              console.log(`Found ${studyFiles.length} video files in study folder`);
              const studyVideoObjects: VideoFile[] = studyFiles.map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                file,
                url: URL.createObjectURL(file),
                name: file.name
              }));
              studyVideos.push(...studyVideoObjects);
            }
          }
        }
        
        if (!relaxFolderFound && !studyFolderFound) {
          console.warn('No "relax" or "study" folders found in the selected directory. Please ensure your directory contains "relax" and/or "study" folders with video files.');
          return;
        }
        
        if (relaxVideos.length === 0 && studyVideos.length === 0) {
          console.warn('No video files found in relax or study folders. Please ensure your directory contains "relax" and/or "study" folders with video files.');
          return;
        }
        
        // Clear individual directories when using combined directory
        setRelaxDirectories([]);
        setStudyDirectories([]);
        setCombinedDirectory(dirInfo);
        setRelaxVideos(relaxVideos);
        setStudyVideos(studyVideos);
        
        // Load memorized clips and coin data if found
        if (loadedMemorizedClips.length > 0) {
          setMemorizedClips(loadedMemorizedClips);
          // Try to get the file handle for future automatic saves
          try {
            const memorizedFileHandle = await dirHandle.getFileHandle('memorized_clips.json');
            setMemorizedClipsFileHandle(memorizedFileHandle);
            console.log('Stored memorized_clips.json file handle for automatic saves');
          } catch (error) {
            console.log('Could not get file handle for memorized_clips.json (will need manual save)');
          }
          console.log(`Successfully loaded ${loadedMemorizedClips.length} memorized clips`);
        }
        
        if (loadedCoinData) {
          setCoinData(loadedCoinData);
          console.log(`Successfully loaded coin data: ${loadedCoinData.totalCoins} total coins`);
        }
        
        if (loadedMemorizedClips.length > 0 || loadedCoinData) {
          console.log(`Successfully loaded ${relaxVideos.length + studyVideos.length} videos, ${loadedMemorizedClips.length} memorized clips, and coin data! 🧠📁🪙`);
        } else {
          console.log(`Successfully loaded ${relaxVideos.length + studyVideos.length} videos! 📁 (No JSON files found)`);
        }
        
      } catch (error) {
        console.error('Error reading directory:', error);
        throw error;
      }
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error selecting combined directory:', error);
      }
    }
  };

  // Function to select a directory
  const selectDirectory = async (category: 'relax' | 'study') => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      
      // Get directory info
      const dirInfo: DirectoryInfo = {
        path: dirHandle.name,
        name: dirHandle.name,
        lastSelected: Date.now(),
        handle: dirHandle // Store the handle for persistence
      };
      
      // Find all videos in the directory
      const videoFiles = await findVideosInDirectory(dirHandle);
      
      if (videoFiles.length === 0) {
        alert('No video files found in the selected directory.');
        return;
      }
      
      // Convert to VideoFile objects
      const videoObjects: VideoFile[] = videoFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        url: URL.createObjectURL(file),
        name: file.name
      }));
      
      // Update directory list and videos
      if (category === 'relax') {
        setRelaxDirectories(prev => [...prev, dirInfo]);
        setRelaxVideos(videoObjects);
      } else {
        setStudyDirectories(prev => [...prev, dirInfo]);
        setStudyVideos(videoObjects);
      }
      
      // Clear combined directory when using individual directories
      setCombinedDirectory(null);
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error selecting directory:', error);
        alert('Error selecting directory. Please try again.');
      }
    }
  };

  // Function to remove a directory
  const removeDirectory = (path: string, category: 'relax' | 'study') => {
    if (category === 'relax') {
      setRelaxDirectories(prev => prev.filter(d => d.path !== path));
      setRelaxVideos([]);
    } else {
      setStudyDirectories(prev => prev.filter(d => d.path !== path));
      setStudyVideos([]);
    }
  };

  // Function to remove combined directory
  const removeCombinedDirectory = () => {
    setCombinedDirectory(null);
    setRelaxVideos([]);
    setStudyVideos([]);
  };

  // Helper function to preload video into memory
  const preloadVideo = (videoFile: VideoFile) => {
    return new Promise<void>((resolve) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      
      video.oncanplaythrough = () => {
        console.log(`Preloaded video: ${videoFile.name}`);
        resolve();
      };
      
      video.onerror = () => {
        console.warn(`Failed to preload video: ${videoFile.name}`);
        resolve();
      };
      
      video.src = videoFile.url;
    });
  };

  // Helper function to unload video from memory
  const unloadVideo = (videoFile: VideoFile) => {
    console.log(`Unloading video from memory: ${videoFile.name}`);
    // Don't revoke the URL as it's still needed by clips
    // The browser will handle memory cleanup automatically
  };

  // Function to manage video memory - keep only 7 clips worth of videos in memory
  const manageVideoMemory = async (newQueue: VideoFile[], currentIndex: number) => {
    // Get unique video files needed for the 7-clip window
    const neededVideoIds = new Set<string>();
    const windowStart = Math.max(0, currentIndex - 3);
    const windowEnd = Math.min(newQueue.length - 1, currentIndex + 3);
    
    for (let i = windowStart; i <= windowEnd; i++) {
      if (newQueue[i]) {
        neededVideoIds.add(newQueue[i].file.name); // Use file name as unique identifier
      }
    }
    
    // Preload videos that are needed for smooth scrolling
    const videosToPreload: VideoFile[] = [];
    newQueue.forEach(clip => {
      if (neededVideoIds.has(clip.file.name)) {
        videosToPreload.push(clip);
      }
    });
    
    // Preload videos in background
    if (videosToPreload.length > 0) {
      console.log(`Preloading ${videosToPreload.length} clips for smooth scrolling...`);
      Promise.all(videosToPreload.map(video => preloadVideo(video))).then(() => {
        console.log('Video preloading completed');
      });
    }
    
    // Update preloaded videos set
    const newPreloadedVideos = new Set<string>();
    neededVideoIds.forEach(id => newPreloadedVideos.add(id));
    
    return newPreloadedVideos;
  };

  // Function to generate a queue of 7 pre-calculated clips with memory management
  const generateClipQueue = async (centerIndex: number = 3): Promise<VideoFile[]> => {
    const queue: VideoFile[] = [];
    
    // Generate 7 clips: 3 before, 1 current, 3 after
    for (let i = 0; i < 7; i++) {
      const clip = generateRandomClip();
      if (clip) {
        queue.push(clip);
      }
    }
    
    // Manage memory for the new queue
    const newPreloadedVideos = await manageVideoMemory(queue, centerIndex);
    
    // Update the queue state with memory management info
    setClipQueue(prev => ({
      ...prev,
      preloadedVideos: newPreloadedVideos
    }));
    
    return queue;
  };

  // Function to get next clip from pre-calculated queue
  const getNextClip = async (): Promise<VideoFile | null> => {
    if (videoRanges.length === 0) return null;
    
    const currentQueue = clipQueue.clips;
    const currentIndex = clipQueue.currentIndex;
    
    // If we have a clip after the current one in queue
    if (currentIndex < currentQueue.length - 1) {
      const nextIndex = currentIndex + 1;
      const newPreloadedVideos = await manageVideoMemory(currentQueue, nextIndex);
      
      setClipQueue(prev => ({ 
        ...prev, 
        currentIndex: nextIndex, 
        lastUsed: Date.now(),
        preloadedVideos: newPreloadedVideos
      }));
      return currentQueue[nextIndex];
    }
    
    // If we're at the end of queue, generate new queue with current clip in middle
    const newQueue = await generateClipQueue(3);
    setClipQueue({ 
      clips: newQueue, 
      currentIndex: 3, // Start at middle (current clip)
      lastUsed: Date.now(),
      preloadedVideos: new Set() // Will be set by generateClipQueue
    });
    return newQueue[3];
  };

  // Function to get previous clip from pre-calculated queue
  const getPreviousClip = async (): Promise<VideoFile | null> => {
    if (videoRanges.length === 0) return null;
    
    const currentQueue = clipQueue.clips;
    const currentIndex = clipQueue.currentIndex;
    
    // If we have a clip before the current one in queue
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const newPreloadedVideos = await manageVideoMemory(currentQueue, prevIndex);
      
      setClipQueue(prev => ({ 
        ...prev, 
        currentIndex: prevIndex, 
        lastUsed: Date.now(),
        preloadedVideos: newPreloadedVideos
      }));
      return currentQueue[prevIndex];
    }
    
    // If we're at the beginning of queue, generate new queue with current clip in middle
    const newQueue = await generateClipQueue(3);
    setClipQueue({ 
      clips: newQueue, 
      currentIndex: 3, // Start at middle (current clip)
      lastUsed: Date.now(),
      preloadedVideos: new Set() // Will be set by generateClipQueue
    });
    return newQueue[3];
  };

  // Function to get current clip
  const getCurrentClip = (): VideoFile | null => {
    const currentQueue = clipQueue.clips;
    const currentIndex = clipQueue.currentIndex;
    
    if (currentQueue.length > 0 && currentIndex < currentQueue.length) {
      return currentQueue[currentIndex];
    }
    return null;
  };

  // Function to initialize with a pre-calculated queue
  const getInitialClip = async (): Promise<VideoFile | null> => {
    if (videoRanges.length === 0) return null;
    
    // Generate initial queue of 7 clips with memory management
    const initialQueue = await generateClipQueue(3);
    setClipQueue({ 
      clips: initialQueue, 
      currentIndex: 3, // Start at middle clip
      lastUsed: Date.now(),
      preloadedVideos: new Set() // Will be set by generateClipQueue
    });
    return initialQueue[3]; // Return middle clip
  };

  const onDropRelax = useCallback((acceptedFiles: File[]) => {
    setIsUploading(true);
    
    const videoFiles = acceptedFiles.filter(file => 
      file.type.startsWith('video/')
    );

    const newVideos: VideoFile[] = videoFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }));

    setRelaxVideos(prev => [...prev, ...newVideos]);
    setIsUploading(false);
  }, []);

  const onDropStudy = useCallback((acceptedFiles: File[]) => {
    setIsUploading(true);
    
    const videoFiles = acceptedFiles.filter(file => 
      file.type.startsWith('video/')
    );

    const newVideos: VideoFile[] = videoFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }));

    setStudyVideos(prev => [...prev, ...newVideos]);
    setIsUploading(false);
  }, []);

  const { getRootProps: getRelaxRootProps, getInputProps: getRelaxInputProps, isDragActive: isRelaxDragActive } = useDropzone({
    onDrop: onDropRelax,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v']
    },
    multiple: true
  });

  const { getRootProps: getStudyRootProps, getInputProps: getStudyInputProps, isDragActive: isStudyDragActive } = useDropzone({
    onDrop: onDropStudy,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v']
    },
    multiple: true
  });

  const clearVideos = () => {
    // Revoke object URLs to free memory
    relaxVideos.forEach(video => URL.revokeObjectURL(video.url));
    studyVideos.forEach(video => URL.revokeObjectURL(video.url));
    setRelaxVideos([]);
    setStudyVideos([]);
    setVideoRanges([]);
    setClipQueue({ clips: [], currentIndex: 0, lastUsed: 0, preloadedVideos: new Set() });
    setIsAppStarted(false);
  };

  const clearDirectories = () => {
    setRelaxDirectories([]);
    setStudyDirectories([]);
    setCombinedDirectory(null);
    setRelaxVideos([]);
    setStudyVideos([]);
    setVideoRanges([]);
    setClipQueue({ clips: [], currentIndex: 0, lastUsed: 0, preloadedVideos: new Set() });
    setIsAppStarted(false);
  };

  // Function to generate random clip duration
  const getRandomClipDuration = (): number => {
    if (!isRandomClipDurationEnabled) {
      return clipDurationMinutes * 60; // Use fixed duration
    }
    
    const minSeconds = randomClipDurationRange.min * 60;
    const maxSeconds = randomClipDurationRange.max * 60;
    const randomDuration = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
    
    console.log(`Generated random clip duration: ${randomDuration / 60} minutes`);
    return randomDuration;
  };

  const calculateTimeRanges = (relaxVideos: VideoFile[], studyVideos: VideoFile[]) => {
    console.log('Calculating time ranges for', relaxVideos.length, 'relax videos and', studyVideos.length, 'study videos');
    console.log('Random clip duration enabled:', isRandomClipDurationEnabled);
    
    const videoRanges: VideoWithRanges[] = [];

    // Helper function to get video duration
    const getVideoDuration = (videoFile: VideoFile): Promise<number> => {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = () => {
          const duration = video.duration;
          console.log(`Video ${videoFile.name} duration: ${duration} seconds`);
          resolve(duration);
        };
        
        video.onerror = () => {
          console.warn(`Could not get duration for ${videoFile.name}, using default 600 seconds`);
          resolve(600); // Fallback duration
        };
        
        video.src = videoFile.url;
      });
    };

    // Process relax videos
    const processRelaxVideos = async () => {
      for (let videoIndex = 0; videoIndex < relaxVideos.length; videoIndex++) {
        const video = relaxVideos[videoIndex];
        console.log(`Processing relax video ${videoIndex + 1}: ${video.name}`);
        
        const actualDuration = await getVideoDuration(video);
        const timeRanges: VideoTimeRange[] = [];
        
        // Generate clips for the entire video duration
        let startTime = 0;
        while (startTime < actualDuration) {
          const clipDuration = getRandomClipDuration();
          const endTime = Math.min(startTime + clipDuration, actualDuration);
          
          // Only add clips that are at least 30 seconds long
          if (endTime - startTime >= 30) {
            timeRanges.push({
              startTime: startTime,
              endTime: endTime
            });
          }
          
          startTime = endTime;
        }
        
        console.log(`Created ${timeRanges.length} clips for relax video: ${video.name}`);
        
        const videoWithRanges: VideoWithRanges = {
          video: video,
          timeRanges: timeRanges,
          category: 'relax'
        };
        
        videoRanges.push(videoWithRanges);
      }
    };

    // Process study videos
    const processStudyVideos = async () => {
      for (let videoIndex = 0; videoIndex < studyVideos.length; videoIndex++) {
        const video = studyVideos[videoIndex];
        console.log(`Processing study video ${videoIndex + 1}: ${video.name}`);
        
        const actualDuration = await getVideoDuration(video);
        const timeRanges: VideoTimeRange[] = [];
        
        // Generate clips for the entire video duration
        let startTime = 0;
        while (startTime < actualDuration) {
          const clipDuration = getRandomClipDuration();
          const endTime = Math.min(startTime + clipDuration, actualDuration);
          
          // Only add clips that are at least 30 seconds long
          if (endTime - startTime >= 30) {
            timeRanges.push({
              startTime: startTime,
              endTime: endTime
            });
          }
          
          startTime = endTime;
        }
        
        console.log(`Created ${timeRanges.length} clips for study video: ${video.name}`);
        
        const videoWithRanges: VideoWithRanges = {
          video: video,
          timeRanges: timeRanges,
          category: 'study'
        };
        
        videoRanges.push(videoWithRanges);
      }
    };

    // Process all videos and return the ranges
    return Promise.all([processRelaxVideos(), processStudyVideos()]).then(() => {
      console.log('Total video ranges created:', videoRanges.length);
      const totalClips = videoRanges.reduce((sum, vr) => sum + vr.timeRanges.length, 0);
      console.log('Total clips available:', totalClips);
      return videoRanges;
    });
  };

  // Function to generate a random clip with 80/20 study/relax ratio
  const generateRandomClip = (): VideoFile | null => {
    if (videoRanges.length === 0) return null;
    
    // Separate videos by category
    const studyVideos = videoRanges.filter(vr => vr.category === 'study');
    const relaxVideos = videoRanges.filter(vr => vr.category === 'relax');
    
    let selectedVideoRange: VideoWithRanges;
    
    // 80% chance for study videos, 20% chance for relax videos
    const random = Math.random();
    if (random < 0.8 && studyVideos.length > 0) {
      // Pick a random study video
      const randomIndex = Math.floor(Math.random() * studyVideos.length);
      selectedVideoRange = studyVideos[randomIndex];
    } else if (relaxVideos.length > 0) {
      // Pick a random relax video
      const randomIndex = Math.floor(Math.random() * relaxVideos.length);
      selectedVideoRange = relaxVideos[randomIndex];
    } else if (studyVideos.length > 0) {
      // Fallback to study video if no relax videos
      const randomIndex = Math.floor(Math.random() * studyVideos.length);
      selectedVideoRange = studyVideos[randomIndex];
    } else {
      return null;
    }
    
    // Filter out time ranges that are already memorized
    const availableRanges = selectedVideoRange.timeRanges.filter(range => {
      return !memorizedClips.some(memorizedClip => 
        memorizedClip.videoName === selectedVideoRange.video.name &&
        memorizedClip.startTime === range.startTime &&
        memorizedClip.endTime === range.endTime
      );
    });
    
    // If no available ranges, try another video
    if (availableRanges.length === 0) {
      // Try to find any video with available ranges
      const allVideos = [...studyVideos, ...relaxVideos];
      for (const videoRange of allVideos) {
        const availableRangesForVideo = videoRange.timeRanges.filter(range => {
          return !memorizedClips.some(memorizedClip => 
            memorizedClip.videoName === videoRange.video.name &&
            memorizedClip.startTime === range.startTime &&
            memorizedClip.endTime === range.endTime
          );
        });
        
        if (availableRangesForVideo.length > 0) {
          selectedVideoRange = videoRange;
          availableRanges.splice(0, availableRanges.length, ...availableRangesForVideo);
          break;
        }
      }
      
      // If still no available ranges, return null
      if (availableRanges.length === 0) {
        return null;
      }
    }
    
    // Pick a random time range from available ranges
    const randomRangeIndex = Math.floor(Math.random() * availableRanges.length);
    const selectedRange = availableRanges[randomRangeIndex];
    
    // Create a clip object
    const clip: VideoFile = {
      id: `${selectedVideoRange.video.id}_clip_${randomRangeIndex + 1}`,
      file: selectedVideoRange.video.file,
      url: selectedVideoRange.video.url,
      name: `${selectedVideoRange.video.name} (${Math.floor(selectedRange.startTime / 60)}:${(selectedRange.startTime % 60).toString().padStart(2, '0')})`,
      startTime: selectedRange.startTime,
      endTime: selectedRange.endTime,
      isClip: true
    };
    
    return clip;
  };

  // Function to start the app
  const startApp = async () => {
    if (relaxVideos.length === 0 && studyVideos.length === 0) {
      alert('Please upload at least one video to start the app');
      return;
    }
    
    // Calculate time ranges for all videos
    const newVideoRanges = await calculateTimeRanges(relaxVideos, studyVideos);
    setVideoRanges(newVideoRanges);
    setIsAppStarted(true);
  };

  // Memory cleanup effect
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const queueAge = now - clipQueue.lastUsed;
      
      // If queue hasn't been used for 5 minutes, clear it to free memory
      if (queueAge > 5 * 60 * 1000 && clipQueue.clips.length > 0) {
        console.log('Clearing unused clip queue to free memory');
        setClipQueue({ clips: [], currentIndex: 0, lastUsed: 0, preloadedVideos: new Set() });
      }
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, [clipQueue.lastUsed, clipQueue.clips.length]);

  return (
    <div className="app">
      {!isAppStarted ? (
        <div className="home-screen">
          {/* Coin Display */}
          <div className="home-coin-display">
            <div className="coin-info">
              <div className="coin-count">
                🪙 {coinData.totalCoins} Coins
              </div>
              <div className="coin-earned-today">
                Today: +{coinData.earnedToday}
              </div>
            </div>
            <div className="coin-history">
              {coinData.history.slice(-3).map((entry, index) => (
                <div key={index} className="history-entry">
                  {entry.date}: +{entry.coins}
                </div>
              ))}
            </div>
          </div>

          {/* Combined Directory Section */}
          {combinedDirectory && (relaxVideos.length > 0 || studyVideos.length > 0) && (
            <div className="combined-directory-section">
              <h2>📁 Combined Directory</h2>
              <div className="directory-info">
                <span className="directory-name">{combinedDirectory.name}</span>
                <button 
                  className="remove-directory-btn"
                  onClick={removeCombinedDirectory}
                  title="Remove combined directory"
                >
                  ❌
                </button>
              </div>
              <div className="video-count">
                {relaxVideos.length} relax video(s) + {studyVideos.length} study video(s)
              </div>
            </div>
          )}

          <div className="content-management-section">
            <h2>📂 Content Management</h2>
            
            <div className="sections-container">
              <div className="section relax-section">
                <h2>🎬 Relax</h2>
                
                {/* Directory Management */}
                <div className="directory-section">
                  <h3>📁 Selected Directories</h3>
                  {relaxDirectories.length > 0 ? (
                    <div className="directory-list">
                      {relaxDirectories.map((dir, index) => (
                        <div key={index} className="directory-item">
                          <span className="directory-name">{dir.name}</span>
                          <button 
                            className="remove-directory-btn"
                            onClick={() => removeDirectory(dir.path, 'relax')}
                            title="Remove directory"
                          >
                            ❌
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-directories">No directories selected</p>
                  )}
                  
                  <button 
                    className="select-directory-btn"
                    onClick={() => selectDirectory('relax')}
                    disabled={isLoadingDirectories}
                  >
                    📁 Select Directory
                  </button>
                </div>
                
                <UploadArea 
                  getRootProps={getRelaxRootProps}
                  getInputProps={getRelaxInputProps}
                  isDragActive={isRelaxDragActive}
                  isUploading={isUploading}
                  compact={true}
                />
                <div className="video-count">
                  {relaxVideos.length} video(s) from {relaxDirectories.length} directory(ies)
                </div>
              </div>
              
              <div className="section study-section">
                <h2>📚 Study</h2>
                
                {/* Directory Management */}
                <div className="directory-section">
                  <h3>📁 Selected Directories</h3>
                  {studyDirectories.length > 0 ? (
                    <div className="directory-list">
                      {studyDirectories.map((dir, index) => (
                        <div key={index} className="directory-item">
                          <span className="directory-name">{dir.name}</span>
                          <button 
                            className="remove-directory-btn"
                            onClick={() => removeDirectory(dir.path, 'study')}
                            title="Remove directory"
                          >
                            ❌
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-directories">No directories selected</p>
                  )}
                  
                  <button 
                    className="select-directory-btn"
                    onClick={() => selectDirectory('study')}
                    disabled={isLoadingDirectories}
                  >
                    📁 Select Directory
                  </button>
                </div>
                
                <UploadArea 
                  getRootProps={getStudyRootProps}
                  getInputProps={getStudyInputProps}
                  isDragActive={isStudyDragActive}
                  isUploading={isUploading}
                  compact={true}
                />
                <div className="video-count">
                  {studyVideos.length} video(s) from {studyDirectories.length} directory(ies)
                </div>
              </div>
            </div>
            
            {/* Clip Duration Setting */}
            <div className="clip-duration-container">
              <label htmlFor="clip-duration-input" className="clip-duration-label">
                ⏱️ Clip Duration (minutes):
              </label>
              <div className="clip-duration-input-group">
                <input
                  id="clip-duration-input"
                  type="number"
                  min="1"
                  max="60"
                  value={clipDurationMinutes}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value >= 1 && value <= 60) {
                      setClipDurationMinutes(value);
                    }
                  }}
                  className="clip-duration-input"
                  title="Set the duration for each video clip in minutes (1-60)"
                  disabled={isRandomClipDurationEnabled}
                />
                <span className="clip-duration-unit">minutes</span>
              </div>
              <button 
                className="download-config-btn"
                onClick={downloadConfigFile}
                title="Download current configuration as config.json"
              >
                📥 Download Config
              </button>
            </div>
            
            {/* Random Clip Duration Setting */}
            <div className="random-clip-duration-container">
              <div className="random-clip-toggle">
                <label className="random-clip-label">
                  <input
                    type="checkbox"
                    checked={isRandomClipDurationEnabled}
                    onChange={(e) => setIsRandomClipDurationEnabled(e.target.checked)}
                    className="random-clip-checkbox"
                  />
                  <span className="random-clip-text">🎲 Random Clip Duration</span>
                </label>
              </div>
              
              {isRandomClipDurationEnabled && (
                <div className="random-clip-range">
                  <label className="range-label">
                    Range: {randomClipDurationRange.min} - {randomClipDurationRange.max} minutes
                  </label>
                  <div className="range-inputs">
                    <div className="range-input-group">
                      <label htmlFor="min-range">Min:</label>
                      <input
                        id="min-range"
                        type="number"
                        min="1"
                        max={randomClipDurationRange.max}
                        value={randomClipDurationRange.min}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value >= 1 && value <= randomClipDurationRange.max) {
                            setRandomClipDurationRange((prev: { min: number; max: number }) => ({ ...prev, min: value }));
                          }
                        }}
                        className="range-input"
                      />
                    </div>
                    <div className="range-input-group">
                      <label htmlFor="max-range">Max:</label>
                      <input
                        id="max-range"
                        type="number"
                        min={randomClipDurationRange.min}
                        max="10"
                        value={randomClipDurationRange.max}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value >= randomClipDurationRange.min && value <= 10) {
                            setRandomClipDurationRange((prev: { min: number; max: number }) => ({ ...prev, max: value }));
                          }
                        }}
                        className="range-input"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Combined Directory Button */}
            {!combinedDirectory && (
              <div className="combined-directory-button-container">
                <button 
                  className="select-combined-directory-btn"
                  onClick={selectCombinedDirectory}
                  disabled={isLoadingDirectories}
                >
                  📁 Upload
                </button>
              </div>
            )}

            {/* Clear All Directories Button */}
            <div className="clear-directories-container">
              <button 
                className="clear-all-btn"
                onClick={clearDirectories}
                disabled={(relaxDirectories.length === 0 && studyDirectories.length === 0) && !combinedDirectory}
              >
                🗑️ Clear All Directories
              </button>
            </div>
          </div>
          
          {/* Memorized Clips Section */}
          <div className="memorized-section">
            <h2>🧠 Memorized Clips</h2>
            
            {/* File Management Buttons */}
            <div className="memorized-file-buttons">
              <button 
                className="load-memorized-btn"
                onClick={loadMemorizedClipsFromFile}
                title="Load memorized clips from file"
              >
                📂 Load from File
              </button>
              <button 
                className="save-memorized-btn"
                onClick={saveMemorizedClipsToFile}
                title="Save memorized clips to file"
              >
                💾 Save to File
              </button>
              <button 
                className="create-sample-btn"
                onClick={createSampleMemorizedClipsFile}
                title="Create a sample memorized_clips.json file"
              >
                📝 Create Sample File
              </button>
            </div>

            {/* Duplicate Management Buttons */}
            <div className="duplicate-management-buttons">
              <button 
                className="check-duplicates-btn"
                onClick={checkForDuplicateClips}
                title="Check for duplicate clips in memorized list"
              >
                🔍 Check Duplicates
              </button>
              <button 
                className="remove-duplicates-btn"
                onClick={removeDuplicateClips}
                title="Remove duplicate clips from memorized list"
              >
                🧹 Remove Duplicates
              </button>
            </div>

            {/* Coin Management Buttons */}
            <div className="coin-file-buttons">
              <button 
                className="load-coin-btn"
                onClick={loadCoinDataFromFile}
                title="Load coin data from file"
              >
                🪙 Load Coins
              </button>
              <button 
                className="save-coin-btn"
                onClick={saveCoinDataToFile}
                title="Save coin data to file"
              >
                💾 Save Coins
              </button>
              <button 
                className="create-coin-sample-btn"
                onClick={createSampleCoinDataFile}
                title="Create a sample coins_earned.json file"
              >
                📝 Create Coin Sample
              </button>
            </div>
            
            {memorizedClips.length > 0 ? (
              <div className="memorized-clips-list">
                {memorizedClips.map((clip) => (
                  <div key={clip.id} className="memorized-clip-item">
                    <div className="clip-info">
                      <span className="clip-name">{clip.videoName}</span>
                      <span className="clip-time">
                        {Math.floor(clip.startTime / 60)}:{(clip.startTime % 60).toString().padStart(2, '0')} - 
                        {Math.floor(clip.endTime / 60)}:{(clip.endTime % 60).toString().padStart(2, '0')}
                      </span>
                      <span className="clip-category">{clip.category}</span>
                    </div>
                    <button 
                      className="remove-clip-btn"
                      onClick={() => removeFromMemorized(clip.id)}
                      title="Remove from memorized"
                    >
                      ❌
                    </button>
                  </div>
                ))}
                <button 
                  className="clear-memorized-btn"
                  onClick={clearMemorizedClips}
                >
                  🗑️ Clear All Memorized Clips
                </button>
              </div>
            ) : (
              <p className="no-memorized">No clips memorized yet. Start the app and use the 🧠 button to memorize clips!</p>
            )}
          </div>

          {/* Watched Clips Section */}
          <div className="watched-section">
            <h2>👁️ Watched Clips</h2>
            
            {/* File Management Buttons */}
            <div className="watched-file-buttons">
              <button 
                className="load-watched-btn"
                onClick={loadWatchedClipsFromFile}
                title="Load watched clips from file"
              >
                📂 Load from File
              </button>
              <button 
                className="save-watched-btn"
                onClick={saveWatchedClipsToFile}
                title="Save watched clips to file"
              >
                💾 Save to File
              </button>
              <button 
                className="create-watched-sample-btn"
                onClick={createSampleWatchedClipsFile}
                title="Create a sample watched_clips.json file"
              >
                📝 Create Sample File
              </button>
            </div>
            
            {watchedClips.length > 0 ? (
              <div className="watched-clips-list">
                {watchedClips.map((clip) => (
                  <div key={clip.id} className="watched-clip-item">
                    <div className="clip-info">
                      <span className="clip-name">{clip.videoName}</span>
                      <span className="clip-time">
                        {Math.floor(clip.startTime / 60)}:{(clip.startTime % 60).toString().padStart(2, '0')} - 
                        {Math.floor(clip.endTime / 60)}:{(clip.endTime % 60).toString().padStart(2, '0')}
                      </span>
                      <span className="clip-category">{clip.category}</span>
                      <span className="watch-percentage">Watched: {clip.watchPercentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-watched">No clips watched yet. Start the app and watch clips to 80% or more to track them!</p>
            )}
          </div>

          <div className="start-button-container">
            <button 
              className="start-button"
              onClick={startApp}
              disabled={relaxVideos.length === 0 && studyVideos.length === 0}
            >
              🚀 Start Scrolling Experience
            </button>
          </div>
        </div>
      ) : (
        <VideoFeed 
          videos={[...relaxVideos, ...studyVideos]}
          videoRanges={videoRanges}
          getNextClip={getNextClip}
          getPreviousClip={getPreviousClip}
          getCurrentClip={getCurrentClip}
          getInitialClip={getInitialClip}
          onClear={clearVideos}
          onAddMore={() => {
            // Go back to home screen to add more videos
            setIsAppStarted(false);
          }}
          addToMemorized={addToMemorized}
          removeFromMemorized={removeFromMemorized}
          memorizedClips={memorizedClips}
          coinData={coinData}
          isClipMemorized={isClipMemorized}
          addToWatchedClips={addToWatchedClips}
          hasOverlappingWatchedClip={hasOverlappingWatchedClip}
          onQuizAnswer={handleQuizAnswer}
        />
      )}
    </div>
  );
}

export default App; 