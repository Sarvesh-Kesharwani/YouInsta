# Troubleshooting Guide

## Upload Button Not Loading JSON File

If the "📁 Upload" button is not loading the `memorized_clips.json` file, here are the most common causes and solutions:

### 1. No JSON File Present
**Problem**: The `memorized_clips.json` file doesn't exist in your directory.

**Solution**: 
- Use the "📝 Create Sample File" button to generate a template
- Or use the "💾 Save to File" button after memorizing some clips
- Place the generated file in the root of your directory (same level as "relax" and "study" folders)

### 2. Incorrect File Structure
**Problem**: The file structure is not what the app expects.

**Expected Structure**:
```
YourDirectory/
├── relax/
│   ├── video1.mp4
│   └── video2.mp4
├── study/
│   ├── video3.mp4
│   └── video4.mp4
└── memorized_clips.json
```

**Solution**: Ensure your directory has this exact structure.

### 3. JSON File Format Issues
**Problem**: The `memorized_clips.json` file has incorrect format.

**Correct Format**:
```json
[
  {
    "id": "unique_id",
    "videoName": "video_file_name.mp4",
    "startTime": 10,
    "endTime": 30,
    "category": "relax",
    "timestamp": 1234567890
  }
]
```

**Solution**: Use the "📝 Create Sample File" button to generate a properly formatted file.

### 4. Browser Console Debugging
**Problem**: You want to see what's happening during the upload process.

**Solution**: 
1. Open browser developer tools (F12)
2. Go to the Console tab
3. Click the "📁 Upload" button
4. Look for console messages that show:
   - Selected directory name
   - Files found in the directory
   - Whether `memorized_clips.json` was found
   - Any error messages

### 5. File Permissions
**Problem**: Browser can't access the files due to permissions.

**Solution**:
- Ensure you're using a modern browser (Chrome, Firefox, Edge)
- Grant file system permissions when prompted
- Try refreshing the page and selecting the directory again

## Common Console Messages

### When Upload Works:
```
Selected directory: YourDirectoryName
Found memorized_clips.json file
File content length: 123
Successfully loaded 2 memorized clips from memorized_clips.json
Found relax folder
Found 5 video files in relax folder
Found study folder
Found 3 video files in study folder
```

### When JSON File is Missing:
```
Selected directory: YourDirectoryName
No memorized_clips.json file found in the selected directory
To create a memorized_clips.json file, use the "💾 Save to File" button in the Memorized Clips section
Found relax folder
Found 5 video files in relax folder
```

### When Directory Structure is Wrong:
```
Selected directory: YourDirectoryName
No "relax" or "study" folders found in the selected directory. Please ensure your directory contains "relax" and/or "study" folders with video files.
```

## Step-by-Step Testing

1. **Create a Test Directory**:
   ```
   TestVideos/
   ├── relax/
   │   └── test_video.mp4
   ├── study/
   │   └── test_video2.mp4
   └── memorized_clips.json
   ```

2. **Generate Sample JSON**:
   - Click "📝 Create Sample File"
   - Save it as `memorized_clips.json` in your test directory

3. **Test Upload**:
   - Click "📁 Upload"
   - Select your test directory
   - Check console for debug messages

4. **Verify Results**:
   - You should see videos loaded from both folders
   - You should see the sample memorized clip loaded
   - The success message should mention both videos and memorized clips

## Still Having Issues?

If you're still experiencing problems:

1. **Check Browser Console**: Look for any error messages
2. **Verify File Structure**: Ensure your directory matches the expected structure
3. **Try Different Browser**: Test with Chrome, Firefox, or Edge
4. **Clear Browser Cache**: Refresh the page or clear browser data
5. **Check File Names**: Ensure no special characters in file names

## Getting Help

If none of the above solutions work:
1. Check the browser console for specific error messages
2. Note the exact file structure you're using
3. Try with a minimal test case (1 video in each folder)
4. Report the issue with console output and file structure details 