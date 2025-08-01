import React, { useState, useRef, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import { VideoFile, VideoWithRanges, MemorizedClip, CoinData } from '../App';
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
  addToMemorized: (currentClip: VideoFile) => void;
  removeFromMemorized: (clipId: string) => void;
  memorizedClips: MemorizedClip[];
  coinData: CoinData;
  isClipMemorized: (currentClip: VideoFile) => boolean;
}

const VideoFeed: React.FC<VideoFeedProps> = ({ 
  videoRanges, 
  getNextClip, 
  getPreviousClip, 
  getInitialClip, 
  onClear, 
  addToMemorized,
  coinData,
  isClipMemorized
}) => {
  const [currentVideo, setCurrentVideo] = useState<VideoFile | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showCoinAnimation, setShowCoinAnimation] = useState(false);
  const [coinAnimationStyle, setCoinAnimationStyle] = useState({});
  const [isMemorizeButtonDisabled, setIsMemorizeButtonDisabled] = useState(false);
  const memorizeButtonRef = useRef<HTMLButtonElement>(null);
  const coinDisplayRef = useRef<HTMLDivElement>(null);

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

  const handleMemorizeClick = () => {
    if (currentVideo && !isMemorizeButtonDisabled) {
      const wasMemorized = isClipMemorized(currentVideo);
      
      // Disable button temporarily to prevent rapid clicking
      setIsMemorizeButtonDisabled(true);
      
      addToMemorized(currentVideo);
      
      // Show coin animation if adding to memorized (not removing)
      if (!wasMemorized) {
        // Get positions for animation
        const buttonRect = memorizeButtonRef.current?.getBoundingClientRect();
        const coinDisplayRect = coinDisplayRef.current?.getBoundingClientRect();
        
        if (buttonRect && coinDisplayRect) {
          const startX = buttonRect.left + buttonRect.width / 2;
          const startY = buttonRect.top + buttonRect.height / 2;
          const endX = coinDisplayRect.left + coinDisplayRect.width / 2;
          const endY = coinDisplayRect.top + coinDisplayRect.height / 2;
          
          setCoinAnimationStyle({
            '--start-x': `${startX}px`,
            '--start-y': `${startY}px`,
            '--end-x': `${endX}px`,
            '--end-y': `${endY}px`,
          } as React.CSSProperties);
          
          setShowCoinAnimation(true);
          setTimeout(() => setShowCoinAnimation(false), 1000);
        }
      }
      
      // Re-enable button after a short delay
      setTimeout(() => {
        setIsMemorizeButtonDisabled(false);
      }, 500);
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

  const isCurrentClipMemorized = isClipMemorized(currentVideo);

  return (
    <div 
      className="video-feed"
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="video-container">
        {/* Coin Display */}
        <div className="coin-display" ref={coinDisplayRef}>
          <div className="coin-count">
            🪙 {coinData.totalCoins}
          </div>
          <div className="coin-earned-today">
            Today: +{coinData.earnedToday}
          </div>
        </div>

        {/* Coin Animation */}
        {showCoinAnimation && (
          <div className="coin-animation" style={coinAnimationStyle}>
            🪙
          </div>
        )}

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
              className={`control-btn memorize-btn ${isCurrentClipMemorized ? 'memorized' : ''}`}
              onClick={handleMemorizeClick}
              title={isCurrentClipMemorized ? "Remove from memorized" : "Memorize this clip"}
              disabled={!currentVideo?.isClip || isMemorizeButtonDisabled}
              ref={memorizeButtonRef}
            >
              🧠
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