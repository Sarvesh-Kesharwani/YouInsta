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
  
  // Directory persistence
  const [relaxDirectories, setRelaxDirectories] = useState<DirectoryInfo[]>([]);
  const [studyDirectories, setStudyDirectories] = useState<DirectoryInfo[]>([]);
  const [combinedDirectory, setCombinedDirectory] = useState<DirectoryInfo | null>(null);
  const [isLoadingDirectories, setIsLoadingDirectories] = useState(false);
  const [clipDurationMinutes, setClipDurationMinutes] = useState(2); // Default 2 minutes

  // Load saved directories on app start
  useEffect(() => {
    const loadSavedDirectories = async () => {
      try {
        const savedRelax = localStorage.getItem('youinsta_relax_dirs');
        const savedStudy = localStorage.getItem('youinsta_study_dirs');
        const savedCombined = localStorage.getItem('youinsta_combined_dir');
        const savedMemorizedClips = localStorage.getItem('youinsta_memorized_clips');
        
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
          console.log('Found saved combined directory');
        }

        // Try to load memorized clips from localStorage as fallback
        if (savedMemorizedClips) {
          const parsed = JSON.parse(savedMemorizedClips);
          setMemorizedClips(parsed);
          console.log(`Found ${parsed.length} memorized clips in localStorage (fallback)`);
        }
        
        // If we have saved directories, show a notification and restore them
        if (hasSavedDirectories) {
          const shouldRestore = confirm(
            'Found previously selected directories. Would you like to restore them? (You will need to reselect each directory for security reasons)'
          );
          
          if (shouldRestore) {
            if (savedRelax) {
              const parsed = JSON.parse(savedRelax);
              if (parsed.length > 0) {
                await loadVideosFromSavedDirectories(parsed, 'relax');
              }
            }
            
            if (savedStudy) {
              const parsed = JSON.parse(savedStudy);
              if (parsed.length > 0) {
                await loadVideosFromSavedDirectories(parsed, 'study');
              }
            }

            if (savedCombined) {
              const parsed = JSON.parse(savedCombined);
              await loadVideosFromCombinedDirectory(parsed);
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

  // Save memorized clips to localStorage as backup whenever they change
  useEffect(() => {
    localStorage.setItem('youinsta_memorized_clips', JSON.stringify(memorizedClips));
  }, [memorizedClips]);

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

  // Function to add a clip to memorized list
  const addToMemorized = (currentClip: VideoFile) => {
    if (!currentClip.isClip || currentClip.startTime === undefined || currentClip.endTime === undefined) {
      alert('Only video clips can be memorized');
      return;
    }

    // Find the video category
    const videoWithRanges = videoRanges.find(vr => vr.video.id === currentClip.id.split('_clip_')[0]);
    if (!videoWithRanges) {
      alert('Could not determine video category');
      return;
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
    alert('Clip memorized! 🧠');
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
  const loadVideosFromSavedDirectories = async (directories: DirectoryInfo[], category: 'relax' | 'study') => {
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
      // First, try to load memorized clips from a JSON file in the selected directory
      let loadedMemorizedClips: MemorizedClip[] = [];
      
      try {
        const dirHandle = await window.showDirectoryPicker();
        console.log('Selected directory:', dirHandle.name);
        
        // Look for memorized_clips.json file in the root of the selected directory
        let jsonFileFound = false;
        for await (const entry of dirHandle.values()) {
          console.log('Checking entry:', entry.name, 'kind:', entry.kind);
          if (entry.kind === 'file' && entry.name.toLowerCase() === 'memorized_clips.json') {
            jsonFileFound = true;
            console.log('Found memorized_clips.json file');
            try {
              const file = await entry.getFile();
              const content = await file.text();
              console.log('File content length:', content.length);
              const parsedClips = JSON.parse(content);
              
              if (Array.isArray(parsedClips)) {
                loadedMemorizedClips = parsedClips;
                console.log(`Successfully loaded ${parsedClips.length} memorized clips from ${entry.name}`);
              } else {
                console.warn('memorized_clips.json does not contain an array');
              }
            } catch (error) {
              console.warn('Could not parse memorized_clips.json file:', error);
            }
            break;
          }
        }
        
        if (!jsonFileFound) {
          console.log('No memorized_clips.json file found in the selected directory');
          console.log('To create a memorized_clips.json file, use the "💾 Save to File" button in the Memorized Clips section');
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
        
        // Load memorized clips if found
        if (loadedMemorizedClips.length > 0) {
          setMemorizedClips(loadedMemorizedClips);
          console.log(`Successfully loaded ${loadedMemorizedClips.length} memorized clips and ${relaxVideos.length + studyVideos.length} videos! 🧠📁`);
        } else {
          console.log(`Successfully loaded ${relaxVideos.length + studyVideos.length} videos! 📁 (No memorized_clips.json file found)`);
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

  const calculateTimeRanges = (relaxVideos: VideoFile[], studyVideos: VideoFile[]) => {
    console.log('Calculating time ranges for', relaxVideos.length, 'relax videos and', studyVideos.length, 'study videos');
    
    const videoRanges: VideoWithRanges[] = [];
    const clipDuration = clipDurationMinutes * 60; // Convert minutes to seconds

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
                />
                <span className="clip-duration-unit">minutes</span>
              </div>
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
        />
      )}
    </div>
  );
}

export default App; 