# YouInsta Changelog

## [Unreleased] - 2024-12-19

### 🎉 Major Features Added

#### 📁 Folder Selection with Directory Persistence
- **Recursive Video Discovery**: Users can now select entire folders instead of individual videos
- **Subfolder Scanning**: Automatically finds all videos in subfolders recursively
- **Video Detection**: Identifies all video file types (mp4, avi, mov, mkv, webm, m4v)
- **Permanent Storage**: Selected directories are saved to localStorage and persist across app restarts
- **Cross-Session Memory**: No need to reselect directories after browser restart

#### 🧠 Smart Memory Management System
- **7-Clip Window Strategy**: Only keeps 7 clips in memory at any time (3 previous + 1 current + 3 next)
- **Pre-calculated Clips**: No ad-hoc loading when scrolling - clips are pre-calculated for smoothness
- **Background Preloading**: Videos needed for the 7-clip window are preloaded in background
- **Memory Cleanup**: Automatic unloading of videos outside the current window
- **Browser Optimization**: Leverages native browser memory management

#### 🎯 Dual Category System (Entertainment & Study)
- **Separate Sections**: Home screen divided into Entertainment (left) and Study (right) sections
- **Independent Directory Management**: Each category has its own directory list and video collection
- **80/20 Content Ratio**: 80% study videos, 20% entertainment videos in random selection
- **Category-Specific Upload Areas**: Separate drag-and-drop zones for each category

#### ⏱️ Virtual 2-Minute Clip System
- **Automatic Clip Generation**: Creates virtual 2-minute clips from all uploaded videos by default
- **Timestamp-Based Clipping**: Uses video timestamps to create clips without file modification
- **Minimum Clip Duration**: Only includes clips that are at least 30 seconds long
- **Random Clip Selection**: Picks random timestamps and videos for variety

### 🔧 Technical Improvements

#### 🎬 Video Player Enhancements
- **Progress Bar Fix**: Progress bar now correctly shows 2-minute duration for clips instead of full video duration
- **Clip Duration Calculation**: Fixed duration calculation to use `endTime - startTime` for clips
- **Async Video Loading**: Proper async handling for video metadata loading
- **Error Handling**: Better error handling for video loading failures

#### 📱 User Interface Improvements
- **Compact Upload Areas**: Smaller upload zones for home screen sections
- **Directory Management UI**: Visual list of selected directories with remove buttons
- **Loading States**: Proper loading indicators during directory processing
- **Responsive Design**: Mobile-friendly layout with proper scaling

#### 🗂️ File Management
- **File System Access API**: Modern browser API for directory access
- **TypeScript Support**: Proper type declarations for File System Access API
- **Error Recovery**: Automatic cleanup of invalid directories
- **Permission Handling**: Proper permission requests and error handling

### 🐛 Bug Fixes

#### 🎵 Audio Issues
- **Fixed Muted Videos**: Removed `muted` attribute that was preventing audio playback
- **Audio Controls**: Removed audio controls as requested (user manages volume via system settings)

#### 🔄 Memory Issues
- **Blob URL Errors**: Fixed `ERR_FILE_NOT_FOUND` errors caused by premature URL revocation
- **Indefinite Loading**: Resolved infinite loading screens when scrolling to clips
- **Memory Leaks**: Implemented proper memory cleanup and management

#### 📊 Progress Bar Issues
- **Incorrect Duration**: Fixed progress bar showing full video duration instead of clip duration
- **Timing Issues**: Resolved issues with duration calculation timing

### 🎨 UI/UX Enhancements

#### 🏠 Home Screen Redesign
- **Dual Section Layout**: Entertainment and Study sections side by side
- **Directory Display**: Shows selected directories with remove options
- **Video Count Display**: Shows total videos from all directories
- **Start Button**: Single button to start the scrolling experience

#### 🎮 Video Feed Improvements
- **Loading States**: Better loading indicators during video transitions
- **Navigation Hints**: Clear instructions for keyboard and touch navigation
- **Error Handling**: Improved error states and retry functionality

#### 🎨 Visual Design
- **Modern Styling**: Gradient buttons and modern UI elements
- **Consistent Theming**: Unified color scheme and design language
- **Responsive Layout**: Works on desktop and mobile devices
- **Smooth Animations**: Hover effects and transitions

### 📋 New Components

#### 📁 Directory Management Components
- **Directory Section**: Displays selected directories with management options
- **Directory List**: Visual list of directories with remove buttons
- **Select Directory Button**: Button to choose new directories
- **Clear All Button**: Option to clear all directories at once

#### 🎬 Enhanced Video Components
- **Smart Video Player**: Enhanced with clip support and progress tracking
- **Memory-Managed Video Feed**: Optimized for smooth scrolling
- **Compact Upload Areas**: Smaller upload zones for section integration

### 🔄 State Management

#### 📊 New State Variables
- `entertainmentDirectories`: Array of selected entertainment directories
- `studyDirectories`: Array of selected study directories
- `isLoadingDirectories`: Loading state for directory operations
- `clipQueue`: Enhanced with preloaded videos tracking

#### 💾 Persistence Layer
- **localStorage Integration**: Automatic saving and loading of directory preferences
- **Cross-Session Recovery**: Restores directory selections on app restart
- **Error Recovery**: Handles invalid directories gracefully

### 🚀 Performance Optimizations

#### ⚡ Memory Management
- **7-Clip Window**: Limits memory usage to only necessary videos
- **Background Preloading**: Non-blocking video preloading
- **Smart Cleanup**: Automatic memory cleanup for unused resources

#### 🎯 Clip Generation
- **Efficient Processing**: Optimized clip generation for large video collections
- **Async Operations**: Non-blocking video duration detection
- **Batch Processing**: Efficient handling of multiple videos

### 📱 Browser Compatibility

#### 🌐 Modern Web APIs
- **File System Access API**: For directory selection and file access
- **localStorage**: For persistent storage of user preferences
- **Blob URLs**: For efficient video file handling

#### 🔧 Fallback Support
- **Graceful Degradation**: Falls back to file selection if directory access fails
- **Error Handling**: Comprehensive error handling for unsupported features
- **User Feedback**: Clear error messages and recovery options

### 📝 Code Quality

#### 🏗️ Architecture Improvements
- **TypeScript Integration**: Full TypeScript support with proper type definitions
- **Component Modularity**: Better separation of concerns
- **Error Boundaries**: Proper error handling throughout the application
- **Code Documentation**: Improved code comments and documentation

#### 🔧 Development Experience
- **Hot Module Replacement**: Fast development with Vite HMR
- **Type Safety**: Comprehensive TypeScript coverage
- **Linting**: Proper ESLint configuration
- **Build Optimization**: Optimized production builds

---

## Previous Versions

### Initial Release
- Basic video upload and playback functionality
- Simple drag-and-drop interface
- Basic video controls
- Single video category support

---

*This changelog documents the evolution of YouInsta from a basic video player to a sophisticated video management and streaming application with advanced features like folder selection, memory management, and dual-category content organization.* 