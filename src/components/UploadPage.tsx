import React from 'react';
import { useDropzone } from 'react-dropzone';
import UploadArea from './UploadArea';
import './UploadPage.css';

interface VideoFile {
  id: string;
  file: File;
  url: string;
  name: string;
  startTime?: number;
  endTime?: number;
  isClip?: boolean;
}

interface DirectoryInfo {
  path: string;
  name: string;
  lastSelected: number;
  handle?: any;
}

interface UploadPageProps {
  relaxVideos: VideoFile[];
  studyVideos: VideoFile[];
  relaxDirectories: DirectoryInfo[];
  studyDirectories: DirectoryInfo[];
  combinedDirectory: DirectoryInfo | null;
  isLoadingDirectories: boolean;
  isUploading: boolean;
  onDropRelax: (acceptedFiles: File[]) => void;
  onDropStudy: (acceptedFiles: File[]) => void;
  onSelectDirectory: (category: 'relax' | 'study') => void;
  onSelectCombinedDirectory: () => void;
  onRemoveDirectory: (path: string, category: 'relax' | 'study') => void;
  onRemoveCombinedDirectory: () => void;
  onClearDirectories: () => void;
}

const UploadPage: React.FC<UploadPageProps> = ({
  relaxVideos,
  studyVideos,
  relaxDirectories,
  studyDirectories,
  combinedDirectory,
  isLoadingDirectories,
  isUploading,
  onDropRelax,
  onDropStudy,
  onSelectDirectory,
  onSelectCombinedDirectory,
  onRemoveDirectory,
  onRemoveCombinedDirectory,
  onClearDirectories
}) => {
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

  return (
    <div className="upload-page">
      <div className="upload-header">
        <h1>📤 Video Upload</h1>
        <p>Upload videos or select directories for your learning experience</p>
      </div>

      {/* Combined Directory Section */}
      {combinedDirectory && (relaxVideos.length > 0 || studyVideos.length > 0) && (
        <div className="combined-directory-section">
          <h2>📁 Combined Directory</h2>
          <div className="directory-info">
            <span className="directory-name">{combinedDirectory.name}</span>
            <button 
              className="remove-directory-btn"
              onClick={onRemoveCombinedDirectory}
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

      <div className="upload-content">
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
                        onClick={() => onRemoveDirectory(dir.path, 'relax')}
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
                onClick={() => onSelectDirectory('relax')}
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
                        onClick={() => onRemoveDirectory(dir.path, 'study')}
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
                onClick={() => onSelectDirectory('study')}
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
        
        {/* Combined Directory Button */}
        {!combinedDirectory && (
          <div className="combined-directory-button-container">
            <button 
              className="select-combined-directory-btn"
              onClick={onSelectCombinedDirectory}
              disabled={isLoadingDirectories}
            >
              📁 Upload Combined Directory
            </button>
          </div>
        )}

        {/* Clear All Directories Button */}
        <div className="clear-directories-container">
          <button 
            className="clear-all-btn"
            onClick={onClearDirectories}
            disabled={(relaxDirectories.length === 0 && studyDirectories.length === 0) && !combinedDirectory}
          >
            🗑️ Clear All Directories
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadPage; 