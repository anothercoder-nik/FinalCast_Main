# Video Grid YouTube Live Streaming

## Overview

The FinalCast platform now supports streaming the entire video grid (all participants) directly to YouTube Live. This feature captures all participant video feeds, arranges them in an optimal grid layout, mixes their audio together, and streams the composite video to YouTube in real-time.

## Features

### ✅ Video Grid Capture
- **Automatic Grid Layout**: Dynamically arranges participant videos in optimal grid layouts (1x1, 2x2, 3x2, 3x3, 4x4)
- **Real-time Composition**: Uses HTML5 Canvas to composite all video feeds in real-time
- **Participant Labels**: Shows participant names on each video tile
- **Live Indicators**: Displays "LIVE" indicator and participant count on stream
- **Responsive Design**: Adapts to different numbers of participants automatically

### ✅ Audio Management
- **Multi-track Audio Mixing**: Combines audio from all participants into a single stream
- **Audio Context Processing**: Uses Web Audio API for professional audio mixing
- **Quality Control**: Maintains 128kbps audio quality for YouTube streaming

### ✅ YouTube Integration
- **RTMP Streaming**: Direct RTMP streaming to YouTube Live
- **FFmpeg Backend**: Server-side video processing and encoding
- **Quality Settings**: 1280x720 resolution at 30fps with 2.5Mbps video bitrate
- **Stream Management**: Start/stop controls with real-time status updates

### ✅ User Interface
- **Stream Controls**: Intuitive "Stream to YouTube" / "Stop Stream" button in top bar
- **Live Status**: Real-time streaming status with animated indicators
- **Modal Configuration**: Easy YouTube RTMP URL and stream key setup
- **Error Handling**: Comprehensive error messages and recovery options

## How It Works

### Frontend (Video Grid Capture)
1. **Canvas Composition**: Creates an offscreen canvas (1280x720) for video composition
2. **Video Processing**: Captures each participant's video element and draws to canvas
3. **Grid Layout**: Calculates optimal grid layouts based on participant count
4. **Stream Generation**: Generates MediaStream from canvas at 30fps
5. **Chunk Processing**: Records video chunks and sends to backend via API

### Backend (RTMP Streaming)
1. **FFmpeg Integration**: Uses FFmpeg for professional video encoding and RTMP streaming
2. **Chunk Processing**: Receives video chunks from frontend via REST API
3. **Stream Management**: Manages active streams and handles reconnection
4. **Quality Control**: Optimizes video/audio encoding for YouTube Live requirements

### Architecture Flow
```
Video Grid → Canvas Capture → MediaRecorder → Chunks → Backend API → FFmpeg → YouTube RTMP
```

## Setup Instructions

### Prerequisites
- **FFmpeg**: Must be installed on the server for video processing
- **YouTube Channel**: Must be verified for live streaming
- **YouTube Stream**: Must be configured in YouTube Studio

### Backend Setup
1. **FFmpeg Installation**: Install FFmpeg on your server
2. **Dependencies**: Ensure multer is installed for chunk processing
3. **Routes**: YouTube streaming routes are already configured in `/api/youtube/`

### Frontend Setup
1. **Video Grid Component**: Enhanced with ref forwarding for capture
2. **Stream Manager**: VideoGridStreamManager handles all streaming logic
3. **UI Controls**: Integrated streaming controls in TopBar component

## Usage

### Starting a Stream
1. **Configure YouTube**: Set up your live stream in YouTube Studio
2. **Get Stream Details**: Copy RTMP URL and stream key from YouTube
3. **Click "Stream to YouTube"**: Opens configuration modal
4. **Enter Details**: Input RTMP URL and stream key
5. **Start Streaming**: Click "Start Streaming" to begin

### During Streaming
- **Live Indicator**: Shows "Streaming to YouTube" status in top bar
- **Participant Management**: Video grid automatically updates as participants join/leave
- **Quality Monitoring**: Backend logs streaming quality and bitrate
- **Error Recovery**: Automatic retry on connection issues

### Stopping a Stream
- **Click "Stop Stream"**: Stops the stream and cleans up resources
- **Automatic Cleanup**: All resources are properly disposed

## Technical Specifications

### Video Settings
- **Resolution**: 1280x720 (720p HD)
- **Frame Rate**: 30fps
- **Video Bitrate**: 2.5 Mbps
- **Video Codec**: H.264 (libx264)
- **Pixel Format**: YUV420P

### Audio Settings
- **Audio Bitrate**: 128 kbps
- **Audio Codec**: AAC
- **Sample Rate**: 48kHz
- **Channels**: Stereo (2 channels)

### Grid Layouts
- **1 Participant**: 1x1 (full screen)
- **2-4 Participants**: 2x2 grid
- **5-6 Participants**: 3x2 grid  
- **7-9 Participants**: 3x3 grid
- **10+ Participants**: 4x4 grid

## Development Mode

### Simulation Mode
When FFmpeg is not available, the system runs in simulation mode:
- **Frontend**: Full video grid capture functionality works
- **Backend**: Simulates chunk processing without actual RTMP streaming
- **Testing**: Allows development and testing without FFmpeg installation

### Debug Features
- **Console Logging**: Comprehensive logging for debugging
- **Status Monitoring**: Real-time streaming status and quality metrics
- **Error Reporting**: Detailed error messages for troubleshooting

## API Endpoints

### POST `/api/youtube/start-stream`
Starts YouTube RTMP streaming
```json
{
  "sessionId": "session_id",
  "rtmpUrl": "rtmp://a.rtmp.youtube.com/live2/",
  "streamKey": "your_stream_key",
  "title": "Stream Title",
  "hasVideoCapture": true,
  "streamType": "video-grid"
}
```

### POST `/api/youtube/stream-chunk`
Processes video chunk for streaming
```
FormData:
- chunk: video chunk blob
- sessionId: session identifier
- timestamp: chunk timestamp
```

### POST `/api/youtube/stop-stream`
Stops YouTube streaming
```json
{
  "sessionId": "session_id"
}
```

## Future Enhancements

### Planned Features
- **Recording Integration**: Save streamed content locally
- **Multiple Platforms**: Support for Twitch, Facebook Live
- **Custom Layouts**: User-configurable grid layouts
- **Advanced Audio**: Individual participant volume controls
- **Stream Analytics**: Detailed streaming metrics and analytics

### Performance Optimizations
- **WebRTC Integration**: Direct participant stream capture
- **GPU Acceleration**: Hardware-accelerated video encoding
- **Adaptive Quality**: Dynamic quality adjustment based on bandwidth
- **Edge Computing**: Distributed streaming servers

## Troubleshooting

### Common Issues
1. **FFmpeg Not Found**: Install FFmpeg and ensure it's in PATH
2. **RTMP Connection Failed**: Verify YouTube stream key and RTMP URL
3. **Audio Issues**: Check participant audio permissions and mixing
4. **Video Quality**: Adjust bitrate settings for network constraints

### Error Codes
- **400**: Invalid request parameters
- **404**: Stream not found
- **500**: Server error (check FFmpeg installation)
- **RTMP -10053**: Network connection error
- **RTMP -10049**: RTMP bind error (retries automatically)

## Support

For technical support or feature requests, please check the project documentation or create an issue in the repository.

---

*This feature represents a significant enhancement to the FinalCast platform, enabling professional-quality multi-participant streaming to YouTube Live with minimal setup and maximum reliability.*
