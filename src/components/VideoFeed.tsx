import React, { useState, useRef, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import { VideoFile, VideoWithRanges } from '../App';
import './VideoFeed.css';

interface VideoFeedProps {
  videos: VideoFile[];
  videoRanges: VideoWithRanges[];
  getNextClip: () => Promise<VideoFile | null>;
  getPreviousClip: () => Promise<VideoFile | null>;
  getCurrentClip: () => VideoFile | null;
  getInitialClip: () => Promise<VideoFile | null>;
  onClear: () => void;
  onAddMore: () => void;
}

const VideoFeed: React.FC<VideoFeedProps> = ({ videos, videoRanges, getNextClip, getPreviousClip, getCurrentClip, getInitialClip, onClear, onAddMore }) => {
  const [currentVideo, setCurrentVideo] = useState<VideoFile | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEnd = async () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > minSwipeDistance;
    const isDownSwipe = distance < -minSwipeDistance;

    if (isUpSwipe) {
      // Get next clip from cache
      const nextClip = await getNextClip();
      if (nextClip) {
        setCurrentVideo(nextClip);
      }
    } else if (isDownSwipe) {
      // Get previous clip from cache
      const prevClip = await getPreviousClip();
      if (prevClip) {
        setCurrentVideo(prevClip);
      }
    }
  };

  const handleWheel = async (e: WheelEvent) => {
    e.preventDefault();
    
    if (e.deltaY > 0) {
      // Get next clip from cache
      const nextClip = await getNextClip();
      if (nextClip) {
        setCurrentVideo(nextClip);
      }
    } else if (e.deltaY < 0) {
      // Get previous clip from cache
      const prevClip = await getPreviousClip();
      if (prevClip) {
        setCurrentVideo(prevClip);
      }
    }
  };

  const handleKeyDown = async (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      // Get previous clip from cache
      const prevClip = await getPreviousClip();
      if (prevClip) {
        setCurrentVideo(prevClip);
      }
    } else if (e.key === 'ArrowDown') {
      // Get next clip from cache
      const nextClip = await getNextClip();
      if (nextClip) {
        setCurrentVideo(nextClip);
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      setIsPlaying(prev => !prev);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentVideo]);

  // Initialize with a clip when component mounts
  useEffect(() => {
    const initializeVideo = async () => {
      if (!currentVideo && videoRanges.length > 0) {
        const initialClip = await getInitialClip();
        if (initialClip) {
          setCurrentVideo(initialClip);
        }
      }
    };
    
    initializeVideo();
  }, [videoRanges, currentVideo, getInitialClip]);

  if (!currentVideo) {
    return (
      <div className="video-feed">
        <div className="video-container">
          <div className="loading">Loading random clip...</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="video-feed"
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="video-container">
        <VideoPlayer
          video={currentVideo}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
        />
        
        <div className="video-overlay">
          <div className="video-info">
            <p className="video-counter">
              Random Clip
            </p>
          </div>
          
          <div className="video-controls">
            <button 
              className="control-btn"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            
            <button 
              className="control-btn"
              onClick={onAddMore}
              title="Add more videos"
            >
              ➕
            </button>
            
            <button 
              className="control-btn"
              onClick={onClear}
              title="Clear all videos"
            >
              🗑️
            </button>
          </div>
        </div>
        
        <div className="navigation-hints">
          <div className="hint">
            <span>↑</span> Previous video
          </div>
          <div className="hint">
            <span>↓</span> Next video
          </div>
          <div className="hint">
            <span>Space</span> Play/Pause
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoFeed; 