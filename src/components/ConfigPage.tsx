import React from 'react';
import './ConfigPage.css';

interface ConfigPageProps {
  clipDurationMinutes: number;
  setClipDurationMinutes: (value: number) => void;
  isRandomClipDurationEnabled: boolean;
  setIsRandomClipDurationEnabled: (value: boolean) => void;
  randomClipDurationRange: { min: number; max: number };
  setRandomClipDurationRange: (value: { min: number; max: number }) => void;
  studyVideoProbability: number;
  setStudyVideoProbability: (value: number) => void;
  relaxVideoProbability: number;
  setRelaxVideoProbability: (value: number) => void;
  configLoaded: boolean;
  configSource: 'localStorage' | 'config.json' | 'defaults' | null;
  onSaveConfigFile: () => void;
  onRecalculateTimeRanges: () => void;
  isAppStarted: boolean;
}

const ConfigPage: React.FC<ConfigPageProps> = ({
  clipDurationMinutes,
  setClipDurationMinutes,
  isRandomClipDurationEnabled,
  setIsRandomClipDurationEnabled,
  randomClipDurationRange,
  setRandomClipDurationRange,
  studyVideoProbability,
  setStudyVideoProbability,
  relaxVideoProbability,
  setRelaxVideoProbability,
  configLoaded,
  configSource,
  onSaveConfigFile,
  onRecalculateTimeRanges,
  isAppStarted
}) => {
  return (
    <div className="config-page">
      <div className="config-header">
        <h1>⚙️ Configuration</h1>
        <p>Customize your learning experience settings</p>
      </div>

      <div className="config-content">
        {/* Config Status */}
        <div className="config-status-section">
          <div className="config-status">
            {configLoaded ? (
              <span className="config-loaded">
                {configSource === 'localStorage' && '✅ Config loaded from user preferences (localStorage)'}
                {configSource === 'config.json' && '✅ Config loaded from default config.json'}
                {configSource === 'defaults' && '✅ Config loaded from default values'}
              </span>
            ) : (
              <span className="config-loading">🔄 Loading configuration...</span>
            )}
          </div>
        </div>

        {/* Clip Duration Setting */}
        <div className="config-section">
          <h2>⏱️ Clip Duration Settings</h2>
          <div className="clip-duration-container">
            <label htmlFor="clip-duration-input" className="clip-duration-label">
              Clip Duration (minutes):
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
          </div>
        </div>

        {/* Random Clip Duration Setting */}
        <div className="config-section">
          <h2>🎲 Random Clip Duration</h2>
          <div className="random-clip-duration-container">
            <div className="random-clip-toggle">
              <label className="random-clip-label">
                <input
                  type="checkbox"
                  checked={isRandomClipDurationEnabled}
                  onChange={(e) => setIsRandomClipDurationEnabled(e.target.checked)}
                  className="random-clip-checkbox"
                />
                <span className="random-clip-text">Enable Random Clip Duration</span>
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
                          setRandomClipDurationRange({ ...randomClipDurationRange, min: value });
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
                          setRandomClipDurationRange({ ...randomClipDurationRange, max: value });
                        }
                      }}
                      className="range-input"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Video Probability Settings */}
        <div className="config-section">
          <h2>🎯 Video Probability Settings</h2>
          <p className="probability-description">
            Control the probability of study vs relax videos appearing in the scrolling list
          </p>
          
          <div className="video-probability-container">
            <div className="probability-inputs">
              <div className="probability-input-group">
                <label htmlFor="study-probability" className="probability-label">
                  📚 Study Videos: {studyVideoProbability}%
                </label>
                <input
                  id="study-probability"
                  type="range"
                  min="0"
                  max="100"
                  value={studyVideoProbability}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setStudyVideoProbability(value);
                    // Automatically adjust relax probability to maintain 100% total
                    setRelaxVideoProbability(100 - value);
                  }}
                  className="probability-slider"
                  title="Adjust the probability of study videos appearing"
                />
              </div>
              
              <div className="probability-input-group">
                <label htmlFor="relax-probability" className="probability-label">
                  🎬 Relax Videos: {relaxVideoProbability}%
                </label>
                <input
                  id="relax-probability"
                  type="range"
                  min="0"
                  max="100"
                  value={relaxVideoProbability}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setRelaxVideoProbability(value);
                    // Automatically adjust study probability to maintain 100% total
                    setStudyVideoProbability(100 - value);
                  }}
                  className="probability-slider"
                  title="Adjust the probability of relax videos appearing"
                />
              </div>
            </div>
            
            <div className="probability-summary">
              <span className="total-probability">
                Total: {studyVideoProbability + relaxVideoProbability}%
                {studyVideoProbability + relaxVideoProbability !== 100 && (
                  <span className="warning"> ⚠️ Total should be 100%</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="config-actions">
          <button 
            className="download-config-btn"
            onClick={onSaveConfigFile}
            title="Save current configuration to config.json"
          >
            💾 Save Config
          </button>
          {isAppStarted && (
            <button 
              className="recalculate-ranges-btn"
              onClick={onRecalculateTimeRanges}
              title="Recalculate time ranges with current clip duration settings"
            >
              🔄 Recalculate Ranges
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigPage; 