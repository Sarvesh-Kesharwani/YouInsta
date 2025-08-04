# Combined Directory Persistence

## Overview

The Instalearn application now supports persistent combined directory selection. This means that once you select a combined directory (containing both "relax" and "study" folders), the application will remember this selection and automatically reload it when you restart the app.

## How It Works

### 1. Directory Selection
- When you click "📁 Upload Combined Directory" in the Upload page, you can select a directory that contains:
  - A "relax" folder with relaxation videos
  - A "study" folder with study videos
  - Optional JSON files: `clips.json` and `coins_earned.json`

### 2. Persistence Storage
- The directory information is automatically saved to your browser's localStorage
- The saved data includes:
  - Directory name and path
  - Last selected timestamp
  - Note: Directory handles cannot be serialized, so they are re-requested on app restart

### 3. Automatic Reload on Restart
- When you restart the application, it will:
  1. Check if a combined directory was previously selected
  2. If found, prompt you to reselect the same directory (for security reasons)
  3. Automatically load all videos from the relax and study folders
  4. Load any existing clips.json and coins_earned.json files
  5. Restore your previous learning progress

## Benefits

- **One-time Setup**: Select your combined directory once and it's remembered
- **Automatic Progress Recovery**: Your clips and coin data are automatically restored
- **Seamless Experience**: No need to re-select directories every time you use the app
- **Security**: The app still requires permission to access the directory on each restart

## Technical Details

### Storage Location
- Combined directory info: `localStorage.getItem('instalearn_combined_dir')`
- Clips data: `localStorage.getItem('instalearn_clips')`
- Coin data: `localStorage.getItem('instalearn_coin_data')`

### File Structure Expected
```
YourCombinedDirectory/
├── relax/
│   ├── video1.mp4
│   ├── video2.mp4
│   └── ...
├── study/
│   ├── video3.mp4
│   ├── video4.mp4
│   └── ...
├── clips.json (optional - auto-created if missing)
└── coins_earned.json (optional - auto-created if missing)
```

### Error Handling
- If the directory can't be accessed on restart, it's automatically removed from storage
- If JSON files are corrupted, they're ignored and defaults are used
- The app gracefully falls back to individual directory selection if combined directory fails

## Usage

1. **First Time Setup**:
   - Go to Upload page
   - Click "📁 Upload Combined Directory"
   - Select your directory with relax/study folders
   - The app will remember this selection

2. **Subsequent Uses**:
   - Restart the app
   - When prompted, reselect the same directory
   - Your videos and progress will be automatically loaded

3. **Changing Directory**:
   - Remove the current combined directory using the ❌ button
   - Select a new combined directory
   - The new selection will be remembered

## Troubleshooting

- **Directory not found**: The directory may have been moved or deleted. Remove it and select a new one.
- **Permission denied**: Make sure to grant permission when prompted to access the directory.
- **No videos loaded**: Ensure your directory contains "relax" and/or "study" folders with video files.
- **Progress not restored**: Check that clips.json and coins_earned.json files exist in your directory. 