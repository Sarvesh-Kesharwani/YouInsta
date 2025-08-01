import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import VideoFeed from './components/VideoFeed';
import UploadArea from './components/UploadArea';
import './App.css';

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
              <UploadArea 
                getRootProps={getEntertainmentRootProps}
                getInputProps={getEntertainmentInputProps}
                isDragActive={isEntertainmentDragActive}
                isUploading={isUploading}
                compact={true}
              />
              <div className="video-count">
                {entertainmentVideos.length} video(s) uploaded
              </div>
            </div>
            
            <div className="section study-section">
              <h2>📚 Study</h2>
              <UploadArea 
                getRootProps={getStudyRootProps}
                getInputProps={getStudyInputProps}
                isDragActive={isStudyDragActive}
                isUploading={isUploading}
                compact={true}
              />
              <div className="video-count">
                {studyVideos.length} video(s) uploaded
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