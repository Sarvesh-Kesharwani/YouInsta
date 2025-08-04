import React, { useRef, useEffect, useState } from 'react';
import { VideoFile } from '../App';
import './VideoPlayer.css';

interface VideoPlayerProps {
  video: VideoFile;
  isPlaying: boolean;
  onPlayPause: () => void;
  onProgressUpdate?: (progress: number) => void;
  onReach80Percent?: (progress: number) => void;
  onAutoScrollToNext?: () => void;
  isRelaxClip?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, isPlaying, onPlayPause, onProgressUpdate, onReach80Percent, onAutoScrollToNext, isRelaxClip }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasCalled80Percent, setHasCalled80Percent] = useState(false);


      useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Reset 80% flag when video changes
    setHasCalled80Percent(false);

    // Add a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('Loading timeout reached, forcing loading to false');
      setIsLoading(false);
    }, 5000); // 5 second timeout

    const handleLoadedMetadata = () => {
      console.log('Video loaded:', video.name, 'isClip:', video.isClip);
      
      // If this is a clip, set the start time and calculate clip duration
      if (video.isClip && video.startTime !== undefined && video.endTime !== undefined) {
        console.log('Setting clip start time:', video.startTime, 'end time:', video.endTime);
        
        const clipDuration = video.endTime - video.startTime;
        setDuration(clipDuration);
        console.log('Clip duration set to:', clipDuration);
        
        // Set the start time after a small delay to ensure video is ready
        setTimeout(() => {
          if (video.startTime !== undefined && videoElement.currentTime !== video.startTime) {
            videoElement.currentTime = video.startTime;
          }
        }, 100);
      } else {
        setDuration(videoElement.duration);
        console.log('Regular video duration:', videoElement.duration);
      }
      
      clearTimeout(loadingTimeout);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      // For clips, show time relative to clip start and check end time
      if (video.isClip && video.startTime !== undefined) {
        const relativeTime = videoElement.currentTime - video.startTime;
        setCurrentTime(relativeTime);
        
        // Calculate progress percentage
        const clipDuration = video.endTime! - video.startTime;
        const progressPercentage = (relativeTime / clipDuration) * 100;
        
        // Call progress update callback
        if (onProgressUpdate) {
          onProgressUpdate(progressPercentage);
        }
        
        // Check if we've reached 80% and call the callback only once
        if (progressPercentage >= 80 && onReach80Percent && !hasCalled80Percent) {
          setHasCalled80Percent(true);
          onReach80Percent(progressPercentage);
        }
        
        // Check if we've reached the end of the clip
        if (video.endTime && videoElement.currentTime >= video.endTime) {
          // For relax clips, auto-scroll to next clip instead of looping
          if (isRelaxClip && onAutoScrollToNext) {
            onAutoScrollToNext();
          } else {
            // For study clips, loop back to start
            videoElement.currentTime = video.startTime;
          }
        }
      } else {
        setCurrentTime(videoElement.currentTime);
        
        // Calculate progress percentage for full videos
        const progressPercentage = (videoElement.currentTime / videoElement.duration) * 100;
        
        if (onProgressUpdate) {
          onProgressUpdate(progressPercentage);
        }
        
        // Check if we've reached 80% and call the callback only once
        if (progressPercentage >= 80 && onReach80Percent && !hasCalled80Percent) {
          setHasCalled80Percent(true);
          onReach80Percent(progressPercentage);
        }
      }
    };

    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
    };

    const handleEnded = () => {
      // For relax clips, auto-scroll to next clip instead of looping
      if (isRelaxClip && onAutoScrollToNext) {
        onAutoScrollToNext();
      } else {
        // For study clips and regular videos, loop back to start
        if (video.isClip && video.startTime !== undefined) {
          videoElement.currentTime = video.startTime;
        } else {
          videoElement.currentTime = 0;
        }
        videoElement.play();
      }
    };

    const handleCanPlay = () => {
      console.log('Video can play:', video.name);
      // Ensure loading is set to false when video can play
      clearTimeout(loadingTimeout);
      setIsLoading(false);
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('error', handleError);
    videoElement.addEventListener('ended', handleEnded);
    videoElement.addEventListener('canplay', handleCanPlay);

    return () => {
      clearTimeout(loadingTimeout);
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('ended', handleEnded);
      videoElement.removeEventListener('canplay', handleCanPlay);
    };
  }, [video]); // Add video to dependency array

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isPlaying && !isLoading) {
      videoElement.play().catch((error) => {
        // Don't set error for AbortError as it's expected when switching videos
        if (error.name !== 'AbortError') {
          setHasError(true);
        }
      });
    } else {
      videoElement.pause();
    }
  }, [isPlaying, isLoading]);

  useEffect(() => {
    // Reset state when video changes
    setIsLoading(true);
    setHasError(false);
    setCurrentTime(0);
    setDuration(0);
    
    // Pause any currently playing video before loading new one
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.pause();
    }
  }, [video.id]);



  const handleVideoClick = () => {
    onPlayPause();
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.load();
    }
  };



  if (hasError) {
    return (
      <div className="video-error">
        <h3>Error loading video</h3>
        <p>Unable to play "{video.name}"</p>
        <button onClick={handleRetry}>Retry</button>
      </div>
    );
  }

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        src={video.url}
        className="video-element"
        onClick={handleVideoClick}
        playsInline
        loop
        preload="metadata"
      />
      
      {isLoading && (
        <div className="video-loading">
          <div className="loading-spinner"></div>
          <p>Loading video...</p>
        </div>
      )}
      
      {!isLoading && (
        <div className="video-progress">
          <div 
            className="progress-bar"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
          {video.isClip && (
            <div className="progress-debug" style={{ position: 'absolute', top: '-20px', left: '0', fontSize: '10px', color: 'white' }}>
              {currentTime.toFixed(1)}s / {duration.toFixed(1)}s ({(currentTime / duration * 100).toFixed(1)}%)
            </div>
          )}
        </div>
      )}
      

    </div>
  );
};

export default VideoPlayer; 