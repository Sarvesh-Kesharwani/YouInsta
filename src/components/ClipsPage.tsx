import React from 'react';
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

interface ClipsPageProps {
  clips: ClipEntry[];
  clipsFileHandle: any;
  onLoadClipsFromFile: () => void;
  onSaveClipsToFile: () => void;
  onCreateSampleClipsFile: () => void;
  onRemoveClip: (clipId: string) => void;
  onClearClips: () => void;
  getCurrentMemoryClips: () => ClipEntry[];
  isAppStarted: boolean;
}

const ClipsPage: React.FC<ClipsPageProps> = ({
  clips,
  clipsFileHandle,
  onLoadClipsFromFile,
  onSaveClipsToFile,
  onCreateSampleClipsFile,
  onRemoveClip,
  onClearClips,
  getCurrentMemoryClips,
  isAppStarted
}) => {
  return (
    <div className="clips-page">
      <div className="clips-header">
        <h1>📋 All Clips</h1>
        <p>Manage your watched and memorized video clips</p>
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
        </div>
        
        {/* Clips List */}
        <div className="clips-section">
          <h2>📋 All Clips ({clips.length})</h2>
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
                onClick={onClearClips}
              >
                🗑️ Clear All Clips
              </button>
            </div>
          ) : (
            <p className="no-clips">No clips yet. Start the app and clips will be added as you watch them!</p>
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
      </div>
    </div>
  );
};

export default ClipsPage; 