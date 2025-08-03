# YouInsta - Instagram-like Short Video App

A modern web application that allows you to upload a folder of videos and scroll through them in a random order, just like Instagram Reels or YouTube Shorts.

## Features

- 🎬 **Video Upload**: Drag and drop or select multiple video files
- 🎲 **Random Order**: Videos are automatically shuffled for a fresh experience
- 📱 **Instagram-like Scrolling**: Smooth vertical scrolling between videos
- 🎮 **Multiple Controls**: 
  - Mouse wheel scrolling
  - Arrow key navigation
  - Touch/swipe gestures on mobile
  - Spacebar for play/pause
- 🔄 **Auto-loop**: Videos automatically loop when they end
- 📊 **Progress Bar**: Visual progress indicator for each video
- 🎨 **Modern UI**: Beautiful, responsive design with smooth animations
- 📱 **Mobile Friendly**: Optimized for both desktop and mobile devices
- 🧠 **Memorized Clips**: Save and manage favorite video clips
- 📂 **Organized Content**: Support for "relax" and "study" folder structures
- 💾 **File-based Storage**: Export/import memorized clips as JSON files
- 🔄 **Combined Upload**: Load videos and memorized clips with a single button
- ⚙️ **Configuration Persistence**: Automatically save and restore clip duration preferences

## Supported Video Formats

- MP4
- AVI
- MOV
- MKV
- WebM
- M4V

## Configuration File Structure

The `config.json` file contains all user preferences and settings:

```json
{
  "clipDurationMinutes": 5,
  "isRandomClipDurationEnabled": false,
  "randomClipDurationRange": {
    "min": 1,
    "max": 5
  },
  "studyVideoProbability": 80,
  "relaxVideoProbability": 20,
  "version": "1.0.0"
}
```

### Configuration Parameters

- **clipDurationMinutes**: Fixed duration for video clips in minutes (1-60)
- **isRandomClipDurationEnabled**: Enable/disable random clip duration
- **randomClipDurationRange**: Min/max range for random clip duration (in minutes)
- **studyVideoProbability**: Percentage of study videos in the feed (0-100)
- **relaxVideoProbability**: Percentage of relax videos in the feed (0-100)
- **version**: Configuration file version for compatibility

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

### Running the Application

Start the development server:

```bash
npm run dev
```

The application will open automatically in your default browser at `http://localhost:3000`

### Building for Production

To create a production build:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## How to Use

### Basic Video Upload

1. **Upload Videos**: 
   - Drag and drop a folder of videos onto the upload area
   - Or click "Choose Video Files" to select videos manually
   - You can select multiple video files at once

### Advanced Content Management

2. **Organized Directory Structure**:
   - Create a parent directory with two subfolders: "relax" and "study"
   - Place your videos in the appropriate folders
   - Use the "📁 Upload" button to load both folders at once
   - The app will automatically detect and load videos from both folders

3. **Memorized Clips Feature**:
   - While watching videos, click the "🧠" button to memorize the current clip
   - Memorized clips are excluded from random selection
   - View and manage memorized clips in the home screen
   - Save/load memorized clips to/from JSON files for persistence

4. **File-based Storage**:
   - Use "💾 Save to File" to export clips as `clips.json`
   - Place this file in your directory root for automatic loading with "📁 Upload"
   - The clips.json file contains all clip entries with their memorized and watched status

### Configuration Management

5. **Automatic Configuration Loading**:
   - The app automatically loads your preferences on startup
   - **User preferences (localStorage) take priority** over default config.json
   - All your preferred settings are restored automatically
   - No need to reconfigure settings every time you restart the app

6. **Configuration Priority System**:
   - **1st Priority**: User preferences saved in localStorage (your custom settings)
   - **2nd Priority**: Default configuration from `config.json` (fallback)
   - **3rd Priority**: Built-in default values (if no config files exist)
   - Configuration source is displayed in the UI with visual indicators

7. **Configurable Parameters**:
   - **Clip Duration**: Set fixed duration for video clips (1-60 minutes)
   - **Random Clip Duration**: Enable random clip lengths with customizable range
   - **Video Probability**: Control the ratio of study vs relax videos (0-100%)
   - **Study Video Probability**: Percentage of study videos in the feed
   - **Relax Video Probability**: Percentage of relax videos in the feed

8. **Configuration Persistence**:
   - Settings are automatically saved to localStorage when changed
   - Your preferences persist across app restarts
   - Use "💾 Save Config" to download your current settings as `config.json`
   - Place `config.json` in the app's public directory for sharing or backup
   - Configuration status shows the source: "user preferences", "default config.json", or "default values"



2. **Navigate Videos**:
   - **Mouse Wheel**: Scroll up/down to navigate between videos
   - **Arrow Keys**: Use ↑/↓ arrow keys to navigate
   - **Touch/Swipe**: On mobile devices, swipe up/down
   - **Spacebar**: Play/pause the current video

3. **Controls**:
   - Click the play/pause button (▶️/⏸️) to control playback
   - Use the add button (➕) to add more videos
   - Use the clear button (🗑️) to remove all videos and return to upload screen

4. **Video Information**:
   - Video title is displayed at the top
   - Current video number and total count are shown
   - Progress bar at the bottom shows video playback progress
   - Time display shows current time and total duration

## Technical Details

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: CSS with modern features (Grid, Flexbox, CSS Variables)
- **Video Handling**: HTML5 Video API with custom controls
- **File Upload**: React Dropzone for drag-and-drop functionality
- **Responsive Design**: Mobile-first approach with CSS media queries

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Performance Features

- Videos are loaded on-demand
- Object URLs are properly cleaned up to prevent memory leaks
- Smooth scrolling with optimized event handling
- Responsive video sizing for different aspect ratios

## Customization

You can easily customize the app by modifying the CSS files:

- `src/index.css` - Global styles
- `src/App.css` - Main app styles
- `src/components/*.css` - Component-specific styles

## Troubleshooting

### Videos not playing
- Ensure your browser supports the video format
- Check that the video files are not corrupted
- Try refreshing the page and uploading again

### Performance issues
- Large video files may take time to load
- Consider compressing videos for better performance
- Close other browser tabs to free up memory

### Mobile issues
- Ensure you're using a modern mobile browser
- Videos may take longer to load on slower connections

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues and enhancement requests! 