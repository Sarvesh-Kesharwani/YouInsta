import { useState, useCallback, useEffect, useRef } from 'react';
import VideoFeed from './components/VideoFeed';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import UploadPage from './components/UploadPage';
import ConfigPage from './components/ConfigPage';
import ClipsPage from './components/ClipsPage';
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

export interface ClipEntry {
  id: string;
  videoName: string;
  startTime: number;
  endTime: number;
  category: 'relax' | 'study';
  memorized: boolean;
  watched: boolean;
  watchPercentage: number;
  quizStatus: 'passed' | 'failed' | 'not_yet_answered';
  lastWatchedAt?: number;
  totalWatchTime?: number;
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

export interface CoinData {
  totalCoins: number;
  earnedToday: number;
  date: string;
  history: {
    date: string;
    coins: number;
  }[];
}

function App() {
  const [currentPage, setCurrentPage] = useState('home');
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
  const [clips, setClips] = useState<ClipEntry[]>([]);
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
        if (typeof config.isRandomClipDurationEnabled === 'boolean') {
          return config.isRandomClipDurationEnabled;
        }
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

  // Drop handlers
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



  // Video probability settings
  const [studyVideoProbability, setStudyVideoProbability] = useState(() => {
    try {
      const savedConfig = localStorage.getItem('youinsta_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        return config.studyVideoProbability || 80; // Default 80%
      }
    } catch (error) {
      console.error('Error loading study video probability from localStorage:', error);
    }
    return 80; // Default 80%
  });

  const [relaxVideoProbability, setRelaxVideoProbability] = useState(() => {
    try {
      const savedConfig = localStorage.getItem('youinsta_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        return config.relaxVideoProbability || 20; // Default 20%
      }
    } catch (error) {
      console.error('Error loading relax video probability from localStorage:', error);
    }
    return 20; // Default 20%
  });
  
  const [configLoaded, setConfigLoaded] = useState(false);
  const [configSource, setConfigSource] = useState<'localStorage' | 'config.json' | 'defaults' | null>(null);
  
  const [clipsFileHandle, setClipsFileHandle] = useState<any>(null);

  // Ref to track clips currently being processed to prevent duplicate entries
  const processingClipRef = useRef<Set<string>>(new Set());



  // Always load config.json and update config parameters on app start
  useEffect(() => {
    console.log('🔄 Loading configuration from config.json...');
    loadConfigFromFile();
  }, []);

  // Load saved directories on app start (after config is loaded)
  useEffect(() => {
    const loadSavedDirectories = async () => {
      try {
        const savedRelax = localStorage.getItem('youinsta_relax_dirs');
        const savedStudy = localStorage.getItem('youinsta_study_dirs');
        const savedCombined = localStorage.getItem('youinsta_combined_dir');
        const savedClips = localStorage.getItem('youinsta_clips');
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
        if (savedClips) {
          const parsed = JSON.parse(savedClips);
          setClips(parsed);
          console.log(`Loaded ${parsed.length} clips from localStorage`);
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

  // Update clips in localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('youinsta_clips', JSON.stringify(clips));
    console.log(`💾 Saved ${clips.length} clips to localStorage`);
    
    // Also save to JSON file if we have a file handle
    if (clipsFileHandle && clips.length > 0) {
      const saveToFile = async () => {
        try {
          const writable = await clipsFileHandle.createWritable();
          await writable.write(JSON.stringify(clips, null, 2));
          await writable.close();
          console.log('✅ Automatically saved clips to JSON file');
        } catch (error) {
          console.error('❌ Error auto-saving clips to file:', error);
          // Clear the file handle if there's an error
          setClipsFileHandle(null);
        }
      };
      saveToFile();
    } else if (clips.length > 0) {
      console.log('⚠️ No clips.json file handle available - clips saved to localStorage only. Use "Save to File" button to enable automatic file saving.');
    }
  }, [clips, clipsFileHandle]);


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


  // Save config to localStorage and update config.json whenever settings change
  useEffect(() => {
    const config = { 
      clipDurationMinutes,
      isRandomClipDurationEnabled,
      randomClipDurationRange,
      studyVideoProbability,
      relaxVideoProbability
    };
    
    saveConfigToLocalStorage(config);
    
    // Also try to update the config.json file in the public directory
    updateConfigFile(config);
  }, [clipDurationMinutes, isRandomClipDurationEnabled, randomClipDurationRange, studyVideoProbability, relaxVideoProbability]);

  // Auto-recalculate time ranges when clip duration settings change (if app is already started)
  useEffect(() => {
    if (isAppStarted && videoRanges.length > 0) {
      console.log('🔄 Clip duration settings changed, recalculating time ranges...');
      recalculateTimeRanges();
    }
  }, [clipDurationMinutes, isRandomClipDurationEnabled, randomClipDurationRange]);




  // Function to save memorized clips to a JSON file
  const saveClipsToFile = async () => {
    try {
      // Create a JSON file with the clips data
      const data = JSON.stringify(clips, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      
      // Use the File System Access API to save the file
      const handle = await window.showSaveFilePicker({
        suggestedName: 'clips.json',
        types: [{
          description: 'JSON File',
          accept: { 'application/json': ['.json'] }
        }]
      });
      
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      
      // Store the file handle for future automatic saves
      setClipsFileHandle(handle);
      
      console.log('Clips saved to file successfully');
    } catch (error) {
      console.error('Error saving clips to file:', error);
      // Fallback to localStorage if file saving fails
      localStorage.setItem('youinsta_clips', JSON.stringify(clips));
    }
  };

  // Function to load clips from file
  const loadClipsFromFile = async () => {
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
        setClips(loadedClips);
        // Store the file handle for future automatic saves
        setClipsFileHandle(fileHandle);
        console.log(`Loaded ${loadedClips.length} clips from file`);
      } else {
        throw new Error('Invalid file format');
      }
    } catch (error) {
      console.error('Error loading clips from file:', error);
    }
  };

  // Function to create a sample clips.json file
  const createSampleClipsFile = async () => {
    try {
      const sampleClips: ClipEntry[] = [
        {
          id: 'sample1',
          videoName: 'sample_video.mp4',
          startTime: 10,
          endTime: 30,
          category: 'relax',
          memorized: false,
          watched: true,
          watchPercentage: 85,
          quizStatus: 'not_yet_answered'
        }
      ];
      
      const handle = await window.showSaveFilePicker({
        suggestedName: 'clips.json',
        types: [{
          description: 'JSON File',
          accept: { 'application/json': ['.json'] }
        }]
      });
      
      const blob = new Blob([JSON.stringify(sampleClips, null, 2)], { type: 'application/json' });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      
      console.log('Sample clips.json file created successfully');
    } catch (error) {
      console.error('Error creating sample file:', error);
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
    // First, try to load from localStorage (user preferences take priority)
    console.log('🔄 Loading configuration from localStorage (user preferences)...');
    try {
      const savedConfig = localStorage.getItem('youinsta_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        let loadedCount = 0;
        
        if (config.clipDurationMinutes && typeof config.clipDurationMinutes === 'number') {
          setClipDurationMinutes(config.clipDurationMinutes);
          console.log(`✅ Loaded clip duration from localStorage: ${config.clipDurationMinutes} minutes`);
          loadedCount++;
        }
        
        if (config.isRandomClipDurationEnabled !== undefined) {
          setIsRandomClipDurationEnabled(config.isRandomClipDurationEnabled);
          console.log(`✅ Loaded random clip duration setting from localStorage: ${config.isRandomClipDurationEnabled ? 'enabled' : 'disabled'}`);
          loadedCount++;
        }
        
        if (config.randomClipDurationRange && typeof config.randomClipDurationRange.min === 'number' && typeof config.randomClipDurationRange.max === 'number') {
          setRandomClipDurationRange(config.randomClipDurationRange);
          console.log(`✅ Loaded random clip duration range from localStorage: ${config.randomClipDurationRange.min}-${config.randomClipDurationRange.max} minutes`);
          loadedCount++;
        }
        
        if (config.studyVideoProbability && typeof config.studyVideoProbability === 'number') {
          setStudyVideoProbability(config.studyVideoProbability);
          console.log(`✅ Loaded study video probability from localStorage: ${config.studyVideoProbability}%`);
          loadedCount++;
        }
        
        if (config.relaxVideoProbability && typeof config.relaxVideoProbability === 'number') {
          setRelaxVideoProbability(config.relaxVideoProbability);
          console.log(`✅ Loaded relax video probability from localStorage: ${config.relaxVideoProbability}%`);
          loadedCount++;
        }
        
        console.log(`🎉 Successfully loaded ${loadedCount} configuration parameters from localStorage (user preferences)`);
        setConfigLoaded(true);
        setConfigSource('localStorage');
        return;
      }
    } catch (error) {
      console.error('❌ Error loading config from localStorage:', error);
    }
    
    // If no localStorage config found, fallback to config.json (default configuration)
    console.log('🔄 No user preferences found, loading default configuration from config.json...');
    try {
      const response = await fetch('/config.json');
      if (!response.ok) {
        throw new Error('Config file not found');
      }
      const config = await response.json();
      
      console.log('📋 Default config file loaded successfully:', config);
      
      let loadedCount = 0;
      
      if (config.clipDurationMinutes && typeof config.clipDurationMinutes === 'number') {
        setClipDurationMinutes(config.clipDurationMinutes);
        console.log(`✅ Loaded default clip duration: ${config.clipDurationMinutes} minutes`);
        loadedCount++;
      }
      
      if (config.isRandomClipDurationEnabled !== undefined) {
        setIsRandomClipDurationEnabled(config.isRandomClipDurationEnabled);
        console.log(`✅ Loaded default random clip duration: ${config.isRandomClipDurationEnabled ? 'enabled' : 'disabled'}`);
        loadedCount++;
      }
      
      if (config.randomClipDurationRange && typeof config.randomClipDurationRange.min === 'number' && typeof config.randomClipDurationRange.max === 'number') {
        setRandomClipDurationRange(config.randomClipDurationRange);
        console.log(`✅ Loaded default random clip duration range: ${config.randomClipDurationRange.min}-${config.randomClipDurationRange.max} minutes`);
        loadedCount++;
      }
      
      if (config.studyVideoProbability && typeof config.studyVideoProbability === 'number') {
        setStudyVideoProbability(config.studyVideoProbability);
        console.log(`✅ Loaded default study video probability: ${config.studyVideoProbability}%`);
        loadedCount++;
      }
      
      if (config.relaxVideoProbability && typeof config.relaxVideoProbability === 'number') {
        setRelaxVideoProbability(config.relaxVideoProbability);
        console.log(`✅ Loaded default relax video probability: ${config.relaxVideoProbability}%`);
        loadedCount++;
      }
      
      console.log(`🎉 Successfully loaded ${loadedCount} default configuration parameters from config.json`);
      setConfigLoaded(true);
      setConfigSource('config.json');
    } catch (error) {
      console.error('❌ Error loading config from file:', error);
      console.log('ℹ️ Using default values for all configuration parameters');
      setConfigLoaded(true);
      setConfigSource('defaults');
    }
  };

  // Function to save config to localStorage
  const saveConfigToLocalStorage = (config: { 
    clipDurationMinutes: number;
    isRandomClipDurationEnabled?: boolean;
    randomClipDurationRange?: { min: number; max: number };
    studyVideoProbability?: number;
    relaxVideoProbability?: number;
  }) => {
    localStorage.setItem('youinsta_config', JSON.stringify(config));
    console.log('✅ Config saved to localStorage successfully');
  };

  // Function to update config.json file in the public directory
  const updateConfigFile = async (config: { 
    clipDurationMinutes: number;
    isRandomClipDurationEnabled?: boolean;
    randomClipDurationRange?: { min: number; max: number };
    studyVideoProbability?: number;
    relaxVideoProbability?: number;
  }) => {
    try {
      // Note: In a browser environment, we can't directly write to the public directory
      // This function is a placeholder for future server-side implementation
      // For now, we'll just log that the config would be updated
      console.log('🔄 Config would be updated in config.json file:', config);
      console.log('💡 To persist config changes, use the "💾 Save Config" button to download the updated config.json file');
    } catch (error) {
      console.error('❌ Error updating config file:', error);
    }
  };

  // Function to save config file (manual, on button click)
  const saveConfigFile = async () => {
    try {
      const config = {
        clipDurationMinutes,
        isRandomClipDurationEnabled,
        randomClipDurationRange,
        studyVideoProbability,
        relaxVideoProbability,
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
      console.log('✅ Config file saved successfully with all parameters');
      console.log('📋 Saved configuration:', config);
    } catch (error) {
      console.error('❌ Error saving config file:', error);
    }
  };

  // Function to save watched clips to file


  // Track which clips have been processed for 80% threshold in this session
  const [processedClipsFor80Percent, setProcessedClipsFor80Percent] = useState<Set<string>>(new Set());

  // Function to add or update a clip in the clips array
  const addToClips = async (currentClip: VideoFile, watchPercentage: number) => {
    if (!currentClip.isClip || currentClip.startTime === undefined || currentClip.endTime === undefined) {
      console.log('Skipping non-clip or invalid clip');
      return;
    }

    const videoWithRanges = videoRanges.find(vr => vr.video.id === currentClip.id.split('_clip_')[0]);
    if (!videoWithRanges) {
      console.log('Could not find video with ranges for clip:', currentClip.id);
      return;
    }

    // Create a unique identifier for this clip
    const clipIdentifier = `${videoWithRanges.video.name}_${currentClip.startTime}_${currentClip.endTime}`;

    // Check if this clip is currently being processed to prevent duplicate entries
    if (processingClipRef.current.has(clipIdentifier)) {
      console.log(`Clip is currently being processed, skipping duplicate call: ${videoWithRanges.video.name} (${currentClip.startTime}s - ${currentClip.endTime}s)`);
      return;
    }

    // Check if we've already processed this clip for 80% in this session
    if (processedClipsFor80Percent.has(clipIdentifier)) {
      console.log(`Clip already processed for 80% in this session: ${videoWithRanges.video.name} (${currentClip.startTime}s - ${currentClip.endTime}s)`);
      return;
    }

    // Add this clip to the processing set
    processingClipRef.current.add(clipIdentifier);

    try {
      // If clipsFileHandle is null, try to create a new clips.json file
      if (!clipsFileHandle) {
        console.log('No clips.json file handle found, attempting to create one...');
        try {
          // Try to create clips.json in the current directory if we have a combined directory
          if (combinedDirectory?.handle) {
            const newClipsFileHandle = await combinedDirectory.handle.getFileHandle('clips.json', { create: true });
            const writable = await newClipsFileHandle.createWritable();
            await writable.write(JSON.stringify([], null, 2));
            await writable.close();
            setClipsFileHandle(newClipsFileHandle);
            console.log('Created new clips.json file for automatic saves');
          } else {
            // Try to create clips.json in the first available directory
            const firstRelaxDir = relaxDirectories.find(dir => dir.handle);
            const firstStudyDir = studyDirectories.find(dir => dir.handle);
            const targetDir = firstRelaxDir || firstStudyDir;
            
            if (targetDir?.handle) {
              const newClipsFileHandle = await targetDir.handle.getFileHandle('clips.json', { create: true });
              const writable = await newClipsFileHandle.createWritable();
              await writable.write(JSON.stringify([], null, 2));
              await writable.close();
              setClipsFileHandle(newClipsFileHandle);
              console.log('Created new clips.json file in directory for automatic saves');
            } else {
              console.log('No directory available, clips will be saved to localStorage only. Use "Save to File" button to create clips.json manually.');
            }
          }
        } catch (error) {
          console.log('Could not create clips.json file, clips will be saved to localStorage only:', error);
        }
      }

      // Get the current clips state to ensure we're working with the latest data
      const currentClips = [...clips];
      
      // Double-check if this clip is already being processed (defensive programming)
      if (processingClipRef.current.has(clipIdentifier)) {
        console.log(`Clip is still being processed, skipping: ${videoWithRanges.video.name} (${currentClip.startTime}s - ${currentClip.endTime}s)`);
        return;
      }
      
      // First, try to find and update an existing clip entry
      const existingClipIndex = currentClips.findIndex(clip =>
        clip.videoName === videoWithRanges.video.name &&
        clip.startTime === currentClip.startTime &&
        clip.endTime === currentClip.endTime
      );

      if (existingClipIndex !== -1) {
        // Clip exists - try to update it
        const existingClip = currentClips[existingClipIndex];
        
        console.log(`Found existing clip at index ${existingClipIndex}: ${videoWithRanges.video.name} (${currentClip.startTime}s - ${currentClip.endTime}s) - current: ${existingClip.watchPercentage}%, new: ${watchPercentage}%`);
        
        // If the clip already has 80% or more watched, don't update it
        if (existingClip.watchPercentage >= 80) {
          console.log(`Clip already exists with 80%+ watched: ${videoWithRanges.video.name} (${currentClip.startTime}s - ${currentClip.endTime}s) - current: ${existingClip.watchPercentage}% - stopping tracking`);
          // Mark as processed to prevent further tracking
          setProcessedClipsFor80Percent(prev => new Set(prev).add(clipIdentifier));
          return;
        }
        
        // Update the existing clip if the new percentage is higher
        if (watchPercentage > existingClip.watchPercentage) {
          const updatedClips = currentClips.map((clip, index) =>
            index === existingClipIndex
              ? { 
                  ...clip, 
                  watchPercentage, 
                  watched: watchPercentage >= 80,
                  lastWatchedAt: Date.now(),
                  totalWatchTime: (clip.totalWatchTime || 0) + (watchPercentage - clip.watchPercentage)
                }
              : clip
          );
          setClips(updatedClips);
          console.log(`Updated existing clip: ${videoWithRanges.video.name} (${currentClip.startTime}s - ${currentClip.endTime}s) from ${existingClip.watchPercentage}% to ${watchPercentage}%`);
        } else {
          console.log(`Clip already exists with higher or equal watch percentage: ${videoWithRanges.video.name} (${currentClip.startTime}s - ${currentClip.endTime}s) - current: ${existingClip.watchPercentage}%, new: ${watchPercentage}%`);
        }
      } else {
        // Clip doesn't exist - insert a new entry
        console.log(`No existing clip found, creating new entry for: ${videoWithRanges.video.name} (${currentClip.startTime}s - ${currentClip.endTime}s) with ${watchPercentage}% watched`);
        console.log(`Current clips count: ${currentClips.length}`);
        
        const newClip: ClipEntry = {
          id: Math.random().toString(36).substr(2, 9),
          videoName: videoWithRanges.video.name,
          startTime: currentClip.startTime,
          endTime: currentClip.endTime,
          category: videoWithRanges.category,
          memorized: false,
          watched: watchPercentage >= 80,
          watchPercentage,
          quizStatus: 'not_yet_answered',
          lastWatchedAt: Date.now(),
          totalWatchTime: watchPercentage
        };

        const updatedClips = [...currentClips, newClip];
        setClips(updatedClips);
        console.log(`Inserted new clip: ${videoWithRanges.video.name} (${currentClip.startTime}s - ${currentClip.endTime}s) with ${watchPercentage}% watched`);
      }

      // Mark this clip as processed for 80% in this session
      setProcessedClipsFor80Percent(prev => new Set(prev).add(clipIdentifier));
    } catch (error) {
      console.error('Error in addToClips:', error);
    } finally {
      // Always remove this clip from the processing set, even if an error occurred
      processingClipRef.current.delete(clipIdentifier);
    }
  };

  // Function to check if a clip has been watched (80% or more)
  const isClipWatched = (currentClip: VideoFile): boolean => {
    if (!currentClip.isClip || currentClip.startTime === undefined || currentClip.endTime === undefined) {
      return false;
    }

    // Get the original video name from the clip ID
    const originalVideoId = currentClip.id.split('_clip_')[0];
    const videoWithRanges = videoRanges.find(vr => vr.video.id === originalVideoId);
    if (!videoWithRanges) {
      return false;
    }

    const clipEntry = clips.find(clip =>
      clip.videoName === videoWithRanges.video.name &&
      clip.startTime === currentClip.startTime &&
      clip.endTime === currentClip.endTime
    );

    return clipEntry ? clipEntry.watchPercentage >= 80 : false;
  };

  // Function to check if a clip range overlaps with a watched clip (80% or more overlap)
  const hasOverlappingWatchedClip = (currentClip: VideoFile): boolean => {
    if (!currentClip.isClip || currentClip.startTime === undefined || currentClip.endTime === undefined) {
      return false;
    }

    // Get the original video name from the clip ID
    const originalVideoId = currentClip.id.split('_clip_')[0];
    const videoWithRanges = videoRanges.find(vr => vr.video.id === originalVideoId);
    if (!videoWithRanges) {
      return false;
    }

    const currentClipDuration = currentClip.endTime - currentClip.startTime;
    
    return clips.some(clipEntry => {
      if (clipEntry.videoName !== videoWithRanges.video.name) return false;
      
      const overlapStart = Math.max(currentClip.startTime!, clipEntry.startTime);
      const overlapEnd = Math.min(currentClip.endTime!, clipEntry.endTime);
      const overlapDuration = Math.max(0, overlapEnd - overlapStart);
      
      const overlapPercentage = (overlapDuration / currentClipDuration) * 100;
      return overlapPercentage >= 80;
    });
  };

  // Function to handle quiz answers
  const handleQuizAnswer = (isCorrect: boolean, currentClip: VideoFile | null) => {
    if (isCorrect) {
      addCoins(1);
      console.log('Correct answer! +1 coin');
      
      // Update quiz status for the current clip
      if (currentClip) {
        updateClipQuizStatus(currentClip, 'passed');
        
        // If the answer was correct and the clip is watched 80% or more, mark it as memorized
        if (isClipWatched(currentClip)) {
          markAsMemorized(currentClip);
          console.log('Clip was watched 80% or more and answer was correct - marked as memorized');
        }
      }
    } else {
      removeCoins(1);
      console.log('Incorrect answer! -1 coin');
      
      // Update quiz status for the current clip
      if (currentClip) {
        updateClipQuizStatus(currentClip, 'failed');
      }
    }
  };

  // Function to update quiz status for a clip
  const updateClipQuizStatus = (currentClip: VideoFile, status: 'passed' | 'failed' | 'not_yet_answered') => {
    if (!currentClip.isClip || currentClip.startTime === undefined || currentClip.endTime === undefined) {
      return;
    }

    const originalVideoId = currentClip.id.split('_clip_')[0];
    const videoWithRanges = videoRanges.find(vr => vr.video.id === originalVideoId);
    if (!videoWithRanges) {
      return;
    }

    setClips(prev => prev.map(clip => {
      if (clip.videoName === videoWithRanges.video.name &&
          clip.startTime === currentClip.startTime &&
          clip.endTime === currentClip.endTime) {
        return { ...clip, quizStatus: status };
      }
      return clip;
    }));
  };

  // Function to get the 7 clips currently in memory
  const getCurrentMemoryClips = (): ClipEntry[] => {
    if (clipQueue.clips.length === 0) return [];
    
    const currentClips: ClipEntry[] = [];
    
    clipQueue.clips.forEach(clip => {
      if (!clip.isClip || clip.startTime === undefined || clip.endTime === undefined) {
        return;
      }
      
      const originalVideoId = clip.id.split('_clip_')[0];
      const videoWithRanges = videoRanges.find(vr => vr.video.id === originalVideoId);
      if (!videoWithRanges) {
        return;
      }
      
      const clipEntry = clips.find(c => 
        c.videoName === videoWithRanges.video.name &&
        c.startTime === clip.startTime &&
        c.endTime === clip.endTime
      );
      
      if (clipEntry) {
        currentClips.push(clipEntry);
      }
    });
    
    return currentClips;
  };

  // Function to clear processed clips when video changes
  const clearProcessedClipsFor80Percent = () => {
    setProcessedClipsFor80Percent(new Set());
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
    
    const videoWithRanges = videoRanges.find(vr => vr.video.id === currentClip.id.split('_clip_')[0]);
    if (!videoWithRanges) {
      return false;
    }
    
    const clipEntry = clips.find(clip => 
      clip.videoName === videoWithRanges.video.name &&
      clip.startTime === currentClip.startTime &&
      clip.endTime === currentClip.endTime
    );
    
    const isMemorized = clipEntry ? clipEntry.memorized : false;
    
    if (isMemorized) {
      console.log(`Clip is already memorized: ${videoWithRanges.video.name} (${currentClip.startTime}s - ${currentClip.endTime}s)`);
    }
    
    return isMemorized;
  };

  // Function to check for duplicate clips in memorized list




  // Function to mark a clip as memorized or remove from memorized (toggle functionality)
  const markAsMemorized = (currentClip: VideoFile) => {
    if (!currentClip.isClip || currentClip.startTime === undefined || currentClip.endTime === undefined) {
      return; // Silently return without popup
    }

    const videoWithRanges = videoRanges.find(vr => vr.video.id === currentClip.id.split('_clip_')[0]);
    if (!videoWithRanges) {
      return; // Silently return without popup
    }

    // Check if clip already exists in clips array
    const existingClip = clips.find(clip => 
      clip.videoName === videoWithRanges.video.name &&
      clip.startTime === currentClip.startTime &&
      clip.endTime === currentClip.endTime
    );

    if (existingClip) {
      // Toggle memorized status
      const newMemorizedStatus = !existingClip.memorized;
      setClips(prev => prev.map(clip =>
        clip.id === existingClip.id
          ? { ...clip, memorized: newMemorizedStatus }
          : clip
      ));
      
      if (newMemorizedStatus) {
        addCoins(1); // Add 1 coin
        console.log(`Marked clip as memorized: ${videoWithRanges.video.name} (${currentClip.startTime}s - ${currentClip.endTime}s)`);
      } else {
        removeCoins(1); // Remove 1 coin
        console.log(`Removed clip from memorized: ${videoWithRanges.video.name} (${currentClip.startTime}s - ${currentClip.endTime}s)`);
      }
    } else {
      // Add new clip entry as memorized
      const newClip: ClipEntry = {
        id: Math.random().toString(36).substr(2, 9),
        videoName: videoWithRanges.video.name,
        startTime: currentClip.startTime,
        endTime: currentClip.endTime,
        category: videoWithRanges.category,
        memorized: true,
        watched: false,
        watchPercentage: 0,
        quizStatus: 'not_yet_answered'
      };

      setClips(prev => [...prev, newClip]);
      addCoins(1); // Add 1 coin
      console.log(`Added clip as memorized: ${videoWithRanges.video.name} (${currentClip.startTime}s - ${currentClip.endTime}s)`);
    }
  };

  // Function to remove a clip from clips list
  const removeClip = (clipId: string) => {
    setClips(prev => prev.filter(clip => clip.id !== clipId));
  };

  // Function to clear all clips
  const clearClips = () => {
    setClips([]);
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
  // Note: This function is currently unused but kept for future functionality
  // const loadVideosFromCombinedDirectory = async (dirInfo: DirectoryInfo) => {
  //   setIsLoadingDirectories(true);
  //   
  //   try {
  //     // For saved directories, we need to prompt the user to reselect
  //     const dirHandle = await window.showDirectoryPicker({
  //       startIn: dirInfo.path
  //     });
  //     
  //     const relaxVideos: VideoFile[] = [];
  //     const studyVideos: VideoFile[] = [];
  //     
  //     // Look for relax and study folders
  //     for await (const entry of dirHandle.values()) {
  //       if (entry.kind === 'directory') {
  //         if (entry.name.toLowerCase() === 'relax') {
  //           const relaxFiles = await findVideosInDirectory(entry);
  //           const relaxVideoObjects: VideoFile[] = relaxFiles.map(file => ({
  //             id: Math.random().toString(36).substr(2, 9),
  //             file,
  //             url: URL.createObjectURL(file),
  //             name: file.name
  //           }));
  //           relaxVideos.push(...relaxVideoObjects);
  //         } else if (entry.name.toLowerCase() === 'study') {
  //           const studyFiles = await findVideosInDirectory(entry);
  //           const studyVideoObjects: VideoFile[] = studyFiles.map(file => ({
  //             id: Math.random().toString(36).substr(2, 9),
  //             file,
  //             url: URL.createObjectURL(file),
  //             name: file.name
  //           }));
  //           studyVideos.push(...studyVideoObjects);
  //         }
  //       }
  //     }
  //     
  //     setRelaxVideos(relaxVideos);
  //     setStudyVideos(studyVideos);
  //     
  //     // Update directory info
  //     const updatedDirInfo = { ...dirInfo, handle: dirHandle, lastSelected: Date.now() };
  //     setCombinedDirectory(updatedDirInfo);
  //     
  //   } catch (error) {
  //     console.error('Error loading combined directory:', error);
  //   } finally {
  //     setIsLoadingDirectories(false);
  //   }
  // };

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
  // Note: This function is currently unused but kept for future functionality
  // const loadVideosFromDirectories = async (directories: DirectoryInfo[], category: 'relax' | 'study') => {
  //   setIsLoadingDirectories(true);
  //   
  //   try {
  //     const allVideos: VideoFile[] = [];
  //     
  //     for (const dirInfo of directories) {
  //       try {
  //         // Try to get the directory handle
  //         const dirHandle = await window.showDirectoryPicker({
  //           startIn: dirInfo.path
  //         });
  //         
  //         // Find all videos in this directory
  //         const videoFiles = await findVideosInDirectory(dirHandle);
  //         
  //         // Convert to VideoFile objects
  //         const videoObjects: VideoFile[] = videoFiles.map(file => ({
  //           id: Math.random().toString(36).substr(2, 9),
  //           file,
  //           url: URL.createObjectURL(file),
  //           name: file.name
  //         }));
  //         
  //         allVideos.push(...videoObjects);
  //         
  //         // Update directory info
  //         const updatedDirInfo = { ...dirInfo, lastSelected: Date.now() };
  //         if (category === 'relax') {
  //           setRelaxDirectories(prev => 
  //             prev.map(d => d.path === dirInfo.path ? updatedDirInfo : d)
  //           );
  //         } else {
  //           setStudyDirectories(prev => 
  //             prev.map(d => d.path === dirInfo.path ? updatedDirInfo : d)
  //           );
  //         }
  //         
  //       } catch (error) {
  //         console.error(`Error loading directory ${dirInfo.path}:`, error);
  //         // Remove the problematic directory
  //         if (category === 'relax') {
  //           setRelaxDirectories(prev => prev.filter(d => d.path !== dirInfo.path));
  //         } else {
  //           setStudyDirectories(prev => prev.filter(d => d.path !== dirInfo.path));
  //         }
  //       }
  //     }
  //     
  //     // Update the appropriate video state
  //     if (category === 'relax') {
  //         setRelaxVideos(allVideos);
  //       } else {
  //         setStudyVideos(allVideos);
  //       }
  //     
  //   } catch (error) {
  //     console.error('Error loading videos from directories:', error);
  //   } finally {
  //     setIsLoadingDirectories(false);
  //   }
  // };

  // Function to select a combined directory (with relax and study folders) and load memorized clips
  const selectCombinedDirectory = async () => {
    try {
      // First, try to load memorized clips and coin data from JSON files in the selected directory
      let loadedMemorizedClips: ClipEntry[] = [];
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
            if (entry.name.toLowerCase() === 'clips.json') {
              memorizedFileFound = true;
              console.log('Found clips.json file');
              try {
                const file = await entry.getFile();
                const content = await file.text();
                console.log('File content length:', content.length);
                const parsedClips = JSON.parse(content);
                
                if (Array.isArray(parsedClips)) {
                  loadedMemorizedClips = parsedClips;
                  // Store the file handle for automatic saves
                  setClipsFileHandle(entry);
                  console.log(`Successfully loaded ${parsedClips.length} clips from ${entry.name} and set up automatic saving`);
                } else {
                  console.warn('clips.json does not contain an array');
                }
              } catch (error) {
                console.warn('Could not parse clips.json file:', error);
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
          console.log('No clips.json file found in the selected directory');
          console.log('To create a clips.json file, use the "💾 Save to File" button in the Clips section');
          
          // Try to create a new clips.json file in the selected directory
          try {
            const newClipsFileHandle = await dirHandle.getFileHandle('clips.json', { create: true });
            const writable = await newClipsFileHandle.createWritable();
            await writable.write(JSON.stringify([], null, 2));
            await writable.close();
            setClipsFileHandle(newClipsFileHandle);
            console.log('Created new clips.json file in the selected directory for automatic saves');
          } catch (error) {
            console.log('Could not create clips.json file (will need manual save)');
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
        
        // Load clips and coin data if found
        if (loadedMemorizedClips.length > 0) {
          setClips(loadedMemorizedClips);
          // Try to get the file handle for future automatic saves
          try {
            const clipsFileHandle = await dirHandle.getFileHandle('clips.json');
            setClipsFileHandle(clipsFileHandle);
            console.log('Stored clips.json file handle for automatic saves');
          } catch (error) {
            console.log('Could not get file handle for clips.json (will need manual save)');
          }
          console.log(`Successfully loaded ${loadedMemorizedClips.length} clips`);
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
        console.log('No video files found in the selected directory.');
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
  // Note: This function is currently unused but kept for future functionality
  // const unloadVideo = (videoFile: VideoFile) => {
  //   console.log(`Unloading video from memory: ${videoFile.name}`);
  //   // Don't revoke the URL as it's still needed by clips
  //   // The browser will handle memory cleanup automatically
  // };

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
    
    // Use configurable probabilities for study vs relax videos
    const random = Math.random();
    const studyProbability = studyVideoProbability / 100; // Convert percentage to decimal
    // const relaxProbability = relaxVideoProbability / 100; // Convert percentage to decimal
    
    if (random < studyProbability && studyVideos.length > 0) {
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
      return !clips.some(clipEntry => 
        clipEntry.videoName === selectedVideoRange.video.name &&
        clipEntry.startTime === range.startTime &&
        clipEntry.endTime === range.endTime &&
        clipEntry.memorized
      );
    });
    
    // If no available ranges, try another video
    if (availableRanges.length === 0) {
      // Try to find any video with available ranges
      const allVideos = [...studyVideos, ...relaxVideos];
      for (const videoRange of allVideos) {
        const availableRangesForVideo = videoRange.timeRanges.filter(range => {
          return !clips.some(clipEntry => 
            clipEntry.videoName === videoRange.video.name &&
            clipEntry.startTime === range.startTime &&
            clipEntry.endTime === range.endTime &&
            clipEntry.memorized
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

  // Function to recalculate time ranges with current settings
  const recalculateTimeRanges = async () => {
    if (relaxVideos.length === 0 && studyVideos.length === 0) {
      console.log('No videos available to recalculate time ranges');
      return;
    }
    
    console.log('🔄 Recalculating time ranges with current clip duration settings...');
    console.log('Current settings:', {
      clipDurationMinutes,
      isRandomClipDurationEnabled,
      randomClipDurationRange
    });
    
    // Calculate time ranges for all videos with current settings
    const newVideoRanges = await calculateTimeRanges(relaxVideos, studyVideos);
    setVideoRanges(newVideoRanges);
    
    // Clear the clip queue since the ranges have changed
    setClipQueue({ clips: [], currentIndex: 0, lastUsed: 0, preloadedVideos: new Set() });
    
    console.log('✅ Time ranges recalculated successfully');
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
      {currentPage === 'video-feed' ? (
        <VideoFeed 
          videos={[...relaxVideos, ...studyVideos]}
          videoRanges={videoRanges}
          getNextClip={getNextClip}
          getPreviousClip={getPreviousClip}
          getCurrentClip={getCurrentClip}
          getInitialClip={getInitialClip}
          onClear={clearVideos}
          onAddMore={() => {
            setCurrentPage('upload');
          }}
          markAsMemorized={markAsMemorized}
          clips={clips}
          coinData={coinData}
          isClipMemorized={isClipMemorized}
          addToClips={addToClips}
          hasOverlappingWatchedClip={hasOverlappingWatchedClip}
          onQuizAnswer={handleQuizAnswer}
          onVideoChange={clearProcessedClipsFor80Percent}
          processedClipsFor80Percent={processedClipsFor80Percent}
        />
      ) : (
        <>
          <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
          <div className="main-content">
            {currentPage === 'home' && (
              <HomePage
                coinData={coinData}
                onLoadCoinDataFromFile={loadCoinDataFromFile}
                onSaveCoinDataToFile={saveCoinDataToFile}
                onCreateSampleCoinDataFile={createSampleCoinDataFile}
                onStartApp={() => setCurrentPage('video-feed')}
                canStartApp={relaxVideos.length > 0 || studyVideos.length > 0}
              />
            )}
            
            {currentPage === 'upload' && (
              <UploadPage
                relaxVideos={relaxVideos}
                studyVideos={studyVideos}
                relaxDirectories={relaxDirectories}
                studyDirectories={studyDirectories}
                combinedDirectory={combinedDirectory}
                isLoadingDirectories={isLoadingDirectories}
                isUploading={isUploading}
                onDropRelax={onDropRelax}
                onDropStudy={onDropStudy}
                onSelectDirectory={selectDirectory}
                onSelectCombinedDirectory={selectCombinedDirectory}
                onRemoveDirectory={removeDirectory}
                onRemoveCombinedDirectory={removeCombinedDirectory}
                onClearDirectories={clearDirectories}
              />
            )}
            
            {currentPage === 'config' && (
              <ConfigPage
                clipDurationMinutes={clipDurationMinutes}
                setClipDurationMinutes={setClipDurationMinutes}
                isRandomClipDurationEnabled={isRandomClipDurationEnabled}
                setIsRandomClipDurationEnabled={setIsRandomClipDurationEnabled}
                randomClipDurationRange={randomClipDurationRange}
                setRandomClipDurationRange={setRandomClipDurationRange}
                studyVideoProbability={studyVideoProbability}
                setStudyVideoProbability={setStudyVideoProbability}
                relaxVideoProbability={relaxVideoProbability}
                setRelaxVideoProbability={setRelaxVideoProbability}
                configLoaded={configLoaded}
                configSource={configSource}
                onSaveConfigFile={saveConfigFile}
                onRecalculateTimeRanges={recalculateTimeRanges}
                isAppStarted={isAppStarted}
              />
            )}
            
            {currentPage === 'clips' && (
              <ClipsPage
                clips={clips}
                clipsFileHandle={clipsFileHandle}
                onLoadClipsFromFile={loadClipsFromFile}
                onSaveClipsToFile={saveClipsToFile}
                onCreateSampleClipsFile={createSampleClipsFile}
                onRemoveClip={removeClip}
                onClearClips={clearClips}
                getCurrentMemoryClips={getCurrentMemoryClips}
                isAppStarted={isAppStarted}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App; 