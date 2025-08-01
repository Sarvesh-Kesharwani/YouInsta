import React from 'react';
import './UploadArea.css';

interface UploadAreaProps {
  getRootProps: () => any;
  getInputProps: () => any;
  isDragActive: boolean;
  isUploading: boolean;
  compact?: boolean;
}

const UploadArea: React.FC<UploadAreaProps> = ({
  getRootProps,
  getInputProps,
  isDragActive,
  isUploading,
  compact = false
}) => {
  return (
    <div className={`upload-area ${compact ? 'compact' : ''}`}>
      <div {...getRootProps()} className={`upload-zone ${isDragActive ? 'drag-active' : ''}`}>
        <input {...getInputProps()} />
        
        <div className="upload-content">
          <div className="upload-icon">
            {isUploading ? (
              <div className="loading-spinner"></div>
            ) : (
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
                <path d="M19 15L19.74 12.26L22.5 11.5L19.74 10.74L19 8L18.26 10.74L15.5 11.5L18.26 12.26L19 15Z" fill="currentColor"/>
                <path d="M5 6L5.74 3.26L8.5 2.5L5.74 1.74L5 0L4.26 1.74L1.5 2.5L4.26 3.26L5 6Z" fill="currentColor"/>
              </svg>
            )}
          </div>
          
          <h1 className="upload-title">
            {isUploading ? 'Processing...' : compact ? 'Upload Videos' : 'YouInsta'}
          </h1>
          
          <p className="upload-subtitle">
            {isDragActive 
              ? 'Drop videos here!' 
              : isUploading 
                ? 'Please wait...'
                : compact 
                  ? 'Drag & drop or click to select'
                  : 'Upload a folder of videos to start scrolling'
            }
          </p>
          
          {!isUploading && !compact && (
            <div className="upload-features">
              <div className="feature">
                <span className="feature-icon">📁</span>
                <span>Drag & drop video folder</span>
              </div>
              <div className="feature">
                <span className="feature-icon">🎲</span>
                <span>Random video order</span>
              </div>
              <div className="feature">
                <span className="feature-icon">📱</span>
                <span>Instagram-like scrolling</span>
              </div>
            </div>
          )}
          
          {!isDragActive && !isUploading && (
            <button className="upload-button">
              {compact ? 'Select Videos' : 'Choose Video Files'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadArea; 