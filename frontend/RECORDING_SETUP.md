# Recording System Setup Guide

## Installation

### 1. Backend Dependencies
```bash
cd backend
npm install fluent-ffmpeg
```

### 2. FFmpeg Installation (Required for video processing)

#### Windows:
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Extract to C:\ffmpeg
3. Add C:\ffmpeg\bin to your Windows system PATH environment variable:
   - Right-click "This PC" or "Computer" → Properties
   - Click "Advanced system settings"
   - Click "Environment Variables" button
   - In "System variables" section, find and select "Path", then cli~ck "Edit"
   - Click "New" and add: `C:\ffmpeg\bin`
   - Click "OK" on all dialogs
   - Restart your command prompt/terminal
   - Test by running: `ffmpeg -version`

#### macOS:
```bash
brew install ffmpeg
```

#### Linux:
```bash
sudo apt update
sudo apt install ffmpeg
```

### 3. Environment Variables
Add these to your backend `.env` file:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### How to Get Cloudinary Credentials (2025):
1. **Sign up/Login to Cloudinary**:
   - Go to https://cloudinary.com/
   - Click "Sign Up" for new account or "Login" for existing
   - Free tier includes: 25GB storage, 25GB bandwidth/month

2. **Access Your Dashboard**:
   - After login, you'll be on the Cloudinary Dashboard
   - Look for the "Account Details" or "Product Environment Credentials" section
   - This is usually visible on the main dashboard page

3. **Copy Your Credentials**:
   - **Cloud Name**: Found in the dashboard (e.g., "dz1a2b3c4")
   - **API Key**: 15-digit number (e.g., "123456789012345")
   - **API Secret**: Long string with letters/numbers (e.g., "abcdef123456...")

4. **Alternative Method - Settings Page**:
   - Click your profile icon (top right)
   - Go to "Settings" → "Security" → "Access Keys"
   - Or navigate to: https://console.cloudinary.com/settings/security
   - View/copy your API Key and API Secret

5. **Update Your .env File**:
   ```env
   CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
   CLOUDINARY_API_KEY=123456789012345
   CLOUDINARY_API_SECRET=abcdef123456your_actual_secret
   ```

**⚠️ Security Note**: Never commit your .env file to version control. Add `.env` to your `.gitignore` file.

## How It Works

### 1. Client-Side Recording
- Each participant's `useMediaRecorder` hook records their local video + audio stream
- Records in 3-second chunks using MediaRecorder API
- Uploads each chunk to Cloudinary with session-specific folders
- Tracks chunks in database for reliable merging

### 2. Server-Side Processing
- When recording stops, triggers `/api/merge-chunks` endpoint
- Downloads all chunks for a participant from Cloudinary
- Uses FFmpeg to concatenate chunks into single video file
- Uploads final merged video to `sessions/{sessionId}/final/`
- Cleans up temporary files and original chunks

### 3. Dashboard Integration
- Host can view/download recordings in session details page
- **"Your Content" dashboard page** shows all sessions with recording management
- Lists all final videos for each session with participant information
- Provides direct download links and bulk download options
- Shows recording metadata (duration, file size, creation date)
- Filters sessions by status and search functionality

## Testing

### 1. Start Recording
1. Join a session as host or participant
2. Click the red record button in the control bar
3. Recording should start (button will show red dot and "Recording" status)

### 2. Check Chunk Upload
- Check browser network tab for successful uploads to Cloudinary
- Check backend logs for "Chunk X uploaded successfully" messages
- Verify chunks are saved in database

### 3. Stop Recording & Merge
1. Click record button again to stop
2. Backend will automatically trigger merge process
3. Check backend logs for merge completion
4. Final video should appear in session details page

### 4. Access Recordings in Dashboard
1. Navigate to "Your Content" from the main dashboard
2. Find your session in the list
3. Click "Show Recordings" to expand recording section
4. Download individual videos or use "Download All" option
5. Use search and filter options to find specific sessions

## Folder Structure in Cloudinary
```
sessions/
  ├── {sessionId}/
  │   ├── host/
  │   │   ├── chunk_0_timestamp.webm
  │   │   ├── chunk_1_timestamp.webm
  │   │   └── ...
  │   ├── participant-{userId}/
  │   │   ├── chunk_0_timestamp.webm
  │   │   └── ...
  │   └── final/
  │       ├── host_{participantId}.mp4
  │       └── participant_{participantId}.mp4
```

## Troubleshooting

### Recording Not Starting
- Check browser console for errors
- Verify media stream is available (webcam/mic permissions)
- Check if MediaRecorder API is supported

### Upload Failures
- Verify Cloudinary credentials
- Check network connectivity
- Look for CORS issues in browser console

### Merge Failures
- Ensure FFmpeg is installed and in PATH
- Check temp directory permissions
- Verify Cloudinary chunk downloads are successful

### No Videos in Dashboard
- Check if merge process completed successfully
- Verify database contains FinalRecording entries
- Check Cloudinary for final videos in correct folder

## API Endpoints

- `POST /api/get-upload-url` - Get Cloudinary upload URL for chunk
- `POST /api/chunk-uploaded` - Track uploaded chunk metadata
- `POST /api/merge-chunks` - Merge chunks into final video
- `GET /api/session/{sessionId}/videos` - List final videos for session
- `GET /api/download/{publicId}` - Get download URL for video

## Database Models

### RecordingChunk
- Tracks individual chunk metadata
- Links to session and participant
- Stores Cloudinary publicId and upload info

### FinalRecording
- Stores final merged video information
- Links to session and participant
- Contains download URLs and video metadata
