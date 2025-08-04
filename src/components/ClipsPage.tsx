import React, { useState } from 'react';
import './ClipsPage.css';

interface ClipEntry {
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

interface VideoData {
  id: string;
  name: string;
  category: 'relax' | 'study';
  duration: number; // Total duration in seconds
  memorizedRanges: {
    startTime: number;
    endTime: number;
  }[];
  totalMemorizedTime: number; // Total memorized time in seconds
  memorizedPercentage: number; // Percentage of video memorized
  lastUpdated: string;
}

interface ClipsPageProps {
  clips: ClipEntry[];
  clipsFileHandle: any;
  onLoadClipsFromFile: () => void;
  onSaveClipsToFile: () => void;
  onCreateSampleClipsFile: () => void;
  onRemoveClip: (clipId: string) => void;
  onClearClips: () => Promise<void>;
  onRemoveDuplicateClips: () => Promise<void>;
  getCurrentMemoryClips: () => ClipEntry[];
  isAppStarted: boolean;
  debugClipsState?: () => void;
  testAddClip?: () => void;
  addAllPossibleClips?: () => void;
  // New props for video data
  videoData: VideoData[];
  videosFileHandle: any;
  onLoadVideosDataFromFile: () => void;
  onSaveVideosDataToFile: () => void;
  onCreateSampleVideosDataFile: () => void;
  onRemoveDuplicateVideos: () => void;
}

const ClipsPage: React.FC<ClipsPageProps> = ({
  clips,
  clipsFileHandle,
  onLoadClipsFromFile,
  onSaveClipsToFile,
  onCreateSampleClipsFile,
  onRemoveClip,
  onClearClips,
  onRemoveDuplicateClips,
  getCurrentMemoryClips,
  isAppStarted,
  debugClipsState,
  testAddClip,
  addAllPossibleClips,
  // New props for video data
  videoData,
  videosFileHandle,
  onLoadVideosDataFromFile,
  onSaveVideosDataToFile,
  onCreateSampleVideosDataFile,
  onRemoveDuplicateVideos
}) => {
  const [isClipsListExpanded, setIsClipsListExpanded] = useState(true);
  const [isVideosListExpanded, setIsVideosListExpanded] = useState(true);
  return (
    <div className="clips-page">
      <div className="clips-header">
        <h1>📋 All Clips</h1>
        <p>Manage your watched and memorized video clips</p>
      </div>

             {/* Videos Section */}
       <div className="videos-section">
                   <div className="videos-section-header">
            <h2>🎬 Study Videos ({videoData.filter(v => v.category === 'study').length})</h2>
            <button 
              className="toggle-videos-btn"
              onClick={() => setIsVideosListExpanded(!isVideosListExpanded)}
              title={isVideosListExpanded ? "Collapse videos list" : "Expand videos list"}
            >
              {isVideosListExpanded ? '🔽' : '▶️'}
            </button>
          </div>
         
                   {/* Videos Statistics */}
          {videoData.filter(v => v.category === 'study').length > 0 && (
            <div className="videos-statistics">
              <h3>📊 Study Videos Statistics</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-number">{videoData.filter(v => v.category === 'study').length}</div>
                  <div className="stat-label">Study Videos</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">
                    {videoData.filter(v => v.category === 'study' && v.memorizedRanges.length > 0).length}
                  </div>
                  <div className="stat-label">Videos with Memorized Segments</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">
                    {Math.round(videoData.filter(v => v.category === 'study').reduce((sum, v) => sum + v.memorizedPercentage, 0) / videoData.filter(v => v.category === 'study').length || 0)}%
                  </div>
                  <div className="stat-label">Average Memorization</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">
                    {Math.round(videoData.filter(v => v.category === 'study').reduce((sum, v) => sum + v.totalMemorizedTime, 0) / 60)} min
                  </div>
                  <div className="stat-label">Total Memorized Time</div>
                </div>
              </div>
            </div>
          )}
        
        {isVideosListExpanded && (
          <>
            {/* Video File Status Indicator */}
            <div className="videos-file-status">
              <span className={`status-indicator ${videosFileHandle ? 'enabled' : 'disabled'}`}>
                {videosFileHandle ? '✅' : '⚠️'} Auto-save: {videosFileHandle ? 'Enabled' : 'Disabled'}
              </span>
              {!videosFileHandle && videoData.length > 0 && (
                <span className="status-note">
                  Video data is saved to localStorage only. Click "Save to File" to enable automatic file saving.
                </span>
              )}
            </div>
            
                         {/* Video File Management Buttons */}
             <div className="videos-file-buttons">
               <button 
                 className="load-videos-btn"
                 onClick={onLoadVideosDataFromFile}
                 title="Load video data from file"
               >
                 📂 Load from File
               </button>
               <button 
                 className="save-videos-btn"
                 onClick={onSaveVideosDataToFile}
                 title="Save video data to file"
               >
                 💾 Save to File
               </button>
               <button 
                 className="create-sample-videos-btn"
                 onClick={onCreateSampleVideosDataFile}
                 title="Create a sample videos.json file"
               >
                 📝 Create Sample File
               </button>
               <button 
                 className="remove-duplicates-videos-btn"
                 onClick={onRemoveDuplicateVideos}
                 title="Remove duplicate videos based on video name"
               >
                 🗑️ Remove Duplicates
               </button>
             </div>

                         {/* Videos List */}
             {videoData.filter(v => v.category === 'study').length > 0 ? (
               <div className="videos-list">
                 {videoData.filter(v => v.category === 'study').map((video) => (
                  <div key={video.id} className="video-item">
                    <div className="video-info">
                      <div className="video-header">
                        <span className="video-name">{video.name}</span>
                        <span className="video-category">{video.category}</span>
                        <span className="video-duration">
                          {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="video-progress-container">
                        <div className="video-progress-bar">
                          {video.memorizedRanges.map((range, index) => (
                            <div
                              key={index}
                              className="memorized-segment"
                              style={{
                                left: `${(range.startTime / video.duration) * 100}%`,
                                width: `${((range.endTime - range.startTime) / video.duration) * 100}%`
                              }}
                              title={`Memorized: ${Math.floor(range.startTime / 60)}:${(range.startTime % 60).toString().padStart(2, '0')} - ${Math.floor(range.endTime / 60)}:${(range.endTime % 60).toString().padStart(2, '0')}`}
                            />
                          ))}
                        </div>
                        <div className="video-progress-labels">
                          <span className="progress-text">
                            {video.memorizedPercentage.toFixed(1)}% memorized
                          </span>
                          <span className="progress-time">
                            {Math.floor(video.totalMemorizedTime / 60)}:{(video.totalMemorizedTime % 60).toString().padStart(2, '0')} / {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="video-stats">
                        <span className="video-memorized-ranges">
                          {video.memorizedRanges.length} memorized segment{video.memorizedRanges.length !== 1 ? 's' : ''}
                        </span>
                        <span className="video-last-updated">
                          Last updated: {new Date(video.lastUpdated).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
                         ) : (
               <p className="no-videos">No study videos loaded yet. Upload study videos using the "Upload Combined Directory" button to see them here!</p>
             )}
          </>
        )}
      </div>

      <div className="clips-content">
        {/* File Status Indicator */}
        <div className="clips-file-status">
          <span className={`status-indicator ${clipsFileHandle ? 'enabled' : 'disabled'}`}>
            {clipsFileHandle ? '✅' : '⚠️'} Auto-save: {clipsFileHandle ? 'Enabled' : 'Disabled'}
          </span>
          {!clipsFileHandle && clips.length > 0 && (
            <span className="status-note">
              Clips are saved to localStorage only. Click "Save to File" to enable automatic file saving.
            </span>
          )}
        </div>
        
        {/* File Management Buttons */}
        <div className="clips-file-buttons">
          <button 
            className="load-clips-btn"
            onClick={onLoadClipsFromFile}
            title="Load clips from file"
          >
            📂 Load from File
          </button>
          <button 
            className="save-clips-btn"
            onClick={onSaveClipsToFile}
            title="Save clips to file"
          >
            💾 Save to File
          </button>
          <button 
            className="create-sample-btn"
            onClick={onCreateSampleClipsFile}
            title="Create a sample clips.json file"
          >
            📝 Create Sample File
          </button>
          {debugClipsState && (
            <button 
              className="debug-btn"
              onClick={debugClipsState}
              title="Debug clips state"
            >
              🔍 Debug State
            </button>
          )}
          {testAddClip && (
            <button 
              className="test-btn"
              onClick={testAddClip}
              title="Add test clip"
            >
              🧪 Add Test Clip
            </button>
          )}
          {addAllPossibleClips && (
            <button 
              className="add-all-clips-btn"
              onClick={addAllPossibleClips}
              title="Add all possible clips from video ranges to database"
            >
              📝 Add All Possible Clips
            </button>
          )}
          <button 
            className="remove-duplicates-btn"
            onClick={async () => {
              try {
                await onRemoveDuplicateClips();
              } catch (error) {
                console.error('Error removing duplicate clips:', error);
              }
            }}
            title="Remove duplicate clips based on video name, start time, and end time"
          >
            🗑️ Remove Duplicates
          </button>
        </div>
        
        {/* Statistics Section */}
        <div className="clips-statistics">
          <h3>📊 Clips Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{clips.length}</div>
              <div className="stat-label">Total Clips</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{clips.filter(c => c.memorized).length}</div>
              <div className="stat-label">Memorized</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{clips.filter(c => c.watched).length}</div>
              <div className="stat-label">Watched</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{clips.filter(c => c.quizStatus === 'passed').length}</div>
              <div className="stat-label">Quiz Passed</div>
            </div>
          </div>
        </div>

        {/* Clips List with Toggle */}
        <div className="clips-section">
          <div className="clips-section-header">
            <h2>📋 All Clips ({clips.length})</h2>
            <button 
              className="toggle-clips-btn"
              onClick={() => setIsClipsListExpanded(!isClipsListExpanded)}
              title={isClipsListExpanded ? "Collapse clips list" : "Expand clips list"}
            >
              {isClipsListExpanded ? '🔽' : '▶️'}
            </button>
          </div>
          
          {isClipsListExpanded && (
            <>
              {clips.length > 0 ? (
                <div className="clips-list">
                  {clips.map((clip) => (
                    <div key={clip.id} className="clip-item">
                      <div className="clip-info">
                        <span className="clip-name">{clip.videoName}</span>
                        <span className="clip-time">
                          {Math.floor(clip.startTime / 60)}:{(clip.startTime % 60).toString().padStart(2, '0')} - 
                          {Math.floor(clip.endTime / 60)}:{(clip.endTime % 60).toString().padStart(2, '0')}
                        </span>
                        <span className="clip-category">{clip.category}</span>
                        <span className="clip-status">
                          {clip.memorized ? '🧠 Memorized' : '❌ Not Memorized'} | 
                          {clip.watched ? ` 👁️ Watched (${clip.watchPercentage}%)` : ' 👁️ Not Watched'} |
                          {clip.quizStatus === 'passed' ? ' ✅ Quiz Passed' : 
                           clip.quizStatus === 'failed' ? ' ❌ Quiz Failed' : ' ❓ Quiz Not Answered'}
                          {clip.lastWatchedAt && ` | Last: ${new Date(clip.lastWatchedAt).toLocaleTimeString()}`}
                        </span>
                      </div>
                      <button 
                        className="remove-clip-btn"
                        onClick={() => onRemoveClip(clip.id)}
                        title="Remove clip"
                      >
                        ❌
                      </button>
                    </div>
                  ))}
                  <button 
                    className="clear-clips-btn"
                    onClick={async () => {
                      try {
                        await onClearClips();
                      } catch (error) {
                        console.error('Error clearing clips:', error);
                      }
                    }}
                  >
                    🗑️ Clear All Clips
                  </button>
                </div>
              ) : (
                <p className="no-clips">No clips yet. Start the app and clips will be added as you watch them!</p>
              )}
            </>
          )}
        </div>

        {/* Current Memory Clips Section */}
        {isAppStarted && (
          <div className="current-memory-clips">
            <h3>🧠 Current 7 Clips in Memory</h3>
            {getCurrentMemoryClips().length > 0 ? (
              <div className="memory-clips-list">
                {getCurrentMemoryClips().map((clip, index) => (
                  <div key={`memory-${clip.id}`} className="memory-clip-item">
                    <div className="memory-clip-info">
                      <span className="memory-clip-index">#{index + 1}</span>
                      <span className="memory-clip-name">{clip.videoName}</span>
                      <span className="memory-clip-time">
                        {Math.floor(clip.startTime / 60)}:{(clip.startTime % 60).toString().padStart(2, '0')} - 
                        {Math.floor(clip.endTime / 60)}:{(clip.endTime % 60).toString().padStart(2, '0')}
                      </span>
                      <span className="memory-clip-status">
                        {clip.watchPercentage}% watched | 
                        {clip.quizStatus === 'passed' ? ' ✅ Passed' : 
                         clip.quizStatus === 'failed' ? ' ❌ Failed' : ' ❓ Not Answered'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-memory-clips">No clips currently in memory. Start scrolling to load clips!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClipsPage; 