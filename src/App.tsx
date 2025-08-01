import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import VideoFeed from './components/VideoFeed';
import UploadArea from './components/UploadArea';
import './App.css';

// Type declarations for File System Access API
declare global {
  interface Window {
    showDirectoryPicker(options?: { startIn?: string }): Promise<any>;
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

export interface VideoWithRanges {
  video: VideoFile;
  timeRanges: VideoTimeRange[];
  category: 'entertainment' | 'study';
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
  const [entertainmentVideos, setEntertainmentVideos] = useState<VideoFile[]>([]);
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
  
  // Directory persistence
  const [entertainmentDirectories, setEntertainmentDirectories] = useState<DirectoryInfo[]>([]);
  const [studyDirectories, setStudyDirectories] = useState<DirectoryInfo[]>([]);
  const [isLoadingDirectories, setIsLoadingDirectories] = useState(false);

  // Load saved directories on app start
  useEffect(() => {
    const loadSavedDirectories = async () => {
      try {
        const savedEntertainment = localStorage.getItem('youinsta_entertainment_dirs');
        const savedStudy = localStorage.getItem('youinsta_study_dirs');
        
        let hasSavedDirectories = false;
        
        if (savedEntertainment) {
          const parsed = JSON.parse(savedEntertainment);
          setEntertainmentDirectories(parsed);
          
          if (parsed.length > 0) {
            hasSavedDirectories = true;
            console.log(`Found ${parsed.length} saved entertainment directories`);
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
        
        // If we have saved directories, show a notification and restore them
        if (hasSavedDirectories) {
          const shouldRestore = confirm(
            'Found previously selected directories. Would you like to restore them? (You will need to reselect each directory for security reasons)'
          );
          
          if (shouldRestore) {
            if (savedEntertainment) {
              const parsed = JSON.parse(savedEntertainment);
              if (parsed.length > 0) {
                await loadVideosFromSavedDirectories(parsed, 'entertainment');
              }
            }
            
            if (savedStudy) {
              const parsed = JSON.parse(savedStudy);
              if (parsed.length > 0) {
                await loadVideosFromSavedDirectories(parsed, 'study');
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading saved directories:', error);
      }
    };
    
    loadSavedDirectories();
  }, []);

  // Save directories to localStorage whenever they change
  useEffect(() => {
    // Don't save the handle as it can't be serialized
    const directoriesToSave = entertainmentDirectories.map(dir => ({
      path: dir.path,
      name: dir.name,
      lastSelected: dir.lastSelected
    }));
    localStorage.setItem('youinsta_entertainment_dirs', JSON.stringify(directoriesToSave));
  }, [entertainmentDirectories]);

  useEffect(() => {
    // Don't save the handle as it can't be serialized
    const directoriesToSave = studyDirectories.map(dir => ({
      path: dir.path,
      name: dir.name,
      lastSelected: dir.lastSelected
    }));
    localStorage.setItem('youinsta_study_dirs', JSON.stringify(directoriesToSave));
  }, [studyDirectories]);

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

  // Function to load videos from saved directories (for app restart)
  const loadVideosFromSavedDirectories = async (directories: DirectoryInfo[], category: 'entertainment' | 'study') => {
    setIsLoadingDirectories(true);
    
    try {
      const allVideos: VideoFile[] = [];
      
      for (const dirInfo of directories) {
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
          if (category === 'entertainment') {
            setEntertainmentDirectories(prev => 
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
          if (category === 'entertainment') {
            setEntertainmentDirectories(prev => prev.filter(d => d.path !== dirInfo.path));
          } else {
            setStudyDirectories(prev => prev.filter(d => d.path !== dirInfo.path));
          }
        }
      }
      
      // Update the appropriate video state
      if (category === 'entertainment') {
        setEntertainmentVideos(allVideos);
      } else {
        setStudyVideos(allVideos);
      }
      
    } catch (error) {
      console.error('Error loading videos from directories:', error);
    } finally {
      setIsLoadingDirectories(false);
    }
  };

  // Function to load videos from newly selected directories
  const loadVideosFromDirectories = async (directories: DirectoryInfo[], category: 'entertainment' | 'study') => {
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
          if (category === 'entertainment') {
            setEntertainmentDirectories(prev => 
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
          if (category === 'entertainment') {
            setEntertainmentDirectories(prev => prev.filter(d => d.path !== dirInfo.path));
          } else {
            setStudyDirectories(prev => prev.filter(d => d.path !== dirInfo.path));
          }
        }
      }
      
      // Update the appropriate video state
      if (category === 'entertainment') {
        setEntertainmentVideos(allVideos);
      } else {
        setStudyVideos(allVideos);
      }
      
    } catch (error) {
      console.error('Error loading videos from directories:', error);
    } finally {
      setIsLoadingDirectories(false);
    }
  };

  // Function to select a directory
  const selectDirectory = async (category: 'entertainment' | 'study') => {
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
      if (category === 'entertainment') {
        setEntertainmentDirectories(prev => [...prev, dirInfo]);
        setEntertainmentVideos(videoObjects);
      } else {
        setStudyDirectories(prev => [...prev, dirInfo]);
        setStudyVideos(videoObjects);
      }
      
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error selecting directory:', error);
        alert('Error selecting directory. Please try again.');
      }
    }
  };

  // Function to remove a directory
  const removeDirectory = (path: string, category: 'entertainment' | 'study') => {
    if (category === 'entertainment') {
      setEntertainmentDirectories(prev => prev.filter(d => d.path !== path));
      setEntertainmentVideos([]);
    } else {
      setStudyDirectories(prev => prev.filter(d => d.path !== path));
      setStudyVideos([]);
    }
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

  const onDropEntertainment = useCallback((acceptedFiles: File[]) => {
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

    setEntertainmentVideos(prev => [...prev, ...newVideos]);
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

  const { getRootProps: getEntertainmentRootProps, getInputProps: getEntertainmentInputProps, isDragActive: isEntertainmentDragActive } = useDropzone({
    onDrop: onDropEntertainment,
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
    entertainmentVideos.forEach(video => URL.revokeObjectURL(video.url));
    studyVideos.forEach(video => URL.revokeObjectURL(video.url));
    setEntertainmentVideos([]);
    setStudyVideos([]);
    setVideoRanges([]);
    setClipQueue({ clips: [], currentIndex: 0, lastUsed: 0, preloadedVideos: new Set() });
    setIsAppStarted(false);
  };

  const clearDirectories = () => {
    setEntertainmentDirectories([]);
    setStudyDirectories([]);
    setEntertainmentVideos([]);
    setStudyVideos([]);
    setVideoRanges([]);
    setClipQueue({ clips: [], currentIndex: 0, lastUsed: 0, preloadedVideos: new Set() });
    setIsAppStarted(false);
  };

  const calculateTimeRanges = (entertainmentVideos: VideoFile[], studyVideos: VideoFile[]) => {
    console.log('Calculating time ranges for', entertainmentVideos.length, 'entertainment videos and', studyVideos.length, 'study videos');
    
    const videoRanges: VideoWithRanges[] = [];
    const clipDuration = 120; // 2 minutes in seconds

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

    // Process entertainment videos
    const processEntertainmentVideos = async () => {
      for (let videoIndex = 0; videoIndex < entertainmentVideos.length; videoIndex++) {
        const video = entertainmentVideos[videoIndex];
        console.log(`Processing entertainment video ${videoIndex + 1}: ${video.name}`);
        
        const actualDuration = await getVideoDuration(video);
        const timeRanges: VideoTimeRange[] = [];
        
        // Generate clips for the entire video duration
        for (let startTime = 0; startTime < actualDuration; startTime += clipDuration) {
          const endTime = Math.min(startTime + clipDuration, actualDuration);
          
          // Only add clips that are at least 30 seconds long
          if (endTime - startTime >= 30) {
            timeRanges.push({
              startTime: startTime,
              endTime: endTime
            });
          }
        }
        
        console.log(`Created ${timeRanges.length} clips for entertainment video: ${video.name}`);
        
        const videoWithRanges: VideoWithRanges = {
          video: video,
          timeRanges: timeRanges,
          category: 'entertainment'
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
        for (let startTime = 0; startTime < actualDuration; startTime += clipDuration) {
          const endTime = Math.min(startTime + clipDuration, actualDuration);
          
          // Only add clips that are at least 30 seconds long
          if (endTime - startTime >= 30) {
            timeRanges.push({
              startTime: startTime,
              endTime: endTime
            });
          }
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
    return Promise.all([processEntertainmentVideos(), processStudyVideos()]).then(() => {
      console.log('Total video ranges created:', videoRanges.length);
      const totalClips = videoRanges.reduce((sum, vr) => sum + vr.timeRanges.length, 0);
      console.log('Total clips available:', totalClips);
      return videoRanges;
    });
  };

  // Function to generate a random clip with 80/20 study/entertainment ratio
  const generateRandomClip = (): VideoFile | null => {
    if (videoRanges.length === 0) return null;
    
    // Separate videos by category
    const studyVideos = videoRanges.filter(vr => vr.category === 'study');
    const entertainmentVideos = videoRanges.filter(vr => vr.category === 'entertainment');
    
    let selectedVideoRange: VideoWithRanges;
    
    // 80% chance for study videos, 20% chance for entertainment videos
    const random = Math.random();
    if (random < 0.8 && studyVideos.length > 0) {
      // Pick a random study video
      const randomIndex = Math.floor(Math.random() * studyVideos.length);
      selectedVideoRange = studyVideos[randomIndex];
    } else if (entertainmentVideos.length > 0) {
      // Pick a random entertainment video
      const randomIndex = Math.floor(Math.random() * entertainmentVideos.length);
      selectedVideoRange = entertainmentVideos[randomIndex];
    } else if (studyVideos.length > 0) {
      // Fallback to study video if no entertainment videos
      const randomIndex = Math.floor(Math.random() * studyVideos.length);
      selectedVideoRange = studyVideos[randomIndex];
    } else {
      return null;
    }
    
    // Pick a random time range from that video
    const randomRangeIndex = Math.floor(Math.random() * selectedVideoRange.timeRanges.length);
    const selectedRange = selectedVideoRange.timeRanges[randomRangeIndex];
    
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
    if (entertainmentVideos.length === 0 && studyVideos.length === 0) {
      alert('Please upload at least one video to start the app');
      return;
    }
    
    // Calculate time ranges for all videos
    const newVideoRanges = await calculateTimeRanges(entertainmentVideos, studyVideos);
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
          <div className="sections-container">
            <div className="section entertainment-section">
              <h2>🎬 Entertainment</h2>
              
              {/* Directory Management */}
              <div className="directory-section">
                <h3>📁 Selected Directories</h3>
                {entertainmentDirectories.length > 0 ? (
                  <div className="directory-list">
                    {entertainmentDirectories.map((dir, index) => (
                      <div key={index} className="directory-item">
                        <span className="directory-name">{dir.name}</span>
                        <button 
                          className="remove-directory-btn"
                          onClick={() => removeDirectory(dir.path, 'entertainment')}
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
                  onClick={() => selectDirectory('entertainment')}
                  disabled={isLoadingDirectories}
                >
                  📁 Select Directory
                </button>
              </div>
              
              <UploadArea 
                getRootProps={getEntertainmentRootProps}
                getInputProps={getEntertainmentInputProps}
                isDragActive={isEntertainmentDragActive}
                isUploading={isUploading}
                compact={true}
              />
              <div className="video-count">
                {entertainmentVideos.length} video(s) from {entertainmentDirectories.length} directory(ies)
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
          
          <div className="start-button-container">
            <button 
              className="start-button"
              onClick={startApp}
              disabled={entertainmentVideos.length === 0 && studyVideos.length === 0}
            >
              🚀 Start Scrolling Experience
            </button>
            
            <button 
              className="clear-all-btn"
              onClick={clearDirectories}
              disabled={entertainmentDirectories.length === 0 && studyDirectories.length === 0}
            >
              🗑️ Clear All Directories
            </button>
          </div>
        </div>
      ) : (
        <VideoFeed 
          videos={[...entertainmentVideos, ...studyVideos]}
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
        />
      )}
    </div>
  );
}

export default App; 