import ffmpeg from 'fluent-ffmpeg';
import { spawn } from 'child_process';

class YouTubeStreamingService {
  constructor() {
    this.activeStreams = new Map(); // Store active streams by sessionId
  }

  /**
   * Start RTMP streaming to YouTube
   * @param {Object} options - Streaming options
   * @param {string} options.sessionId - Session ID
   * @param {string} options.rtmpUrl - YouTube RTMP URL
   * @param {st    } else {
      // SCREEN CAPTURE: Capture desktop screen for live streaming
      console.log('🖥️ Setting up SCREEN CAPTURE for YouTube stream');
      
      // Get system audio input configuration
      const audioInput = this.getSystemAudioInput();
      
      ffmpegArgs = [
        // SCREEN CAPTURE INPUT - Windows desktop capture
        '-f', 'gdigrab',                // Windows screen capture
        '-framerate', framerate.toString(),
        '-offset_x', '0',               // Start from top-left corner
        '-offset_y', '0',
        '-video_size', `${width}x${height}`, // Capture specific resolution
        '-i', 'desktop',                // Capture entire desktop
        
        // AUDIO CAPTURE - System audio
        ...audioInput,s.streamKey - YouTube stream key
   * @param {string} options.title - Stream title (optional)
   * @param {Object} options.videoConfig - Video configuration
   */
  async startStream(options) {
    // Extract options, including hasVideoCapture flag
    const { sessionId, rtmpUrl, streamKey, title, videoConfig = {}, hasVideoCapture = false } = options;
    
    // Check if stream already exists
    if (this.activeStreams.has(sessionId)) {
      throw new Error(`Stream already active for session ${sessionId}`);
    }

    // Validate required parameters
    if (!rtmpUrl || !streamKey) {
      throw new Error('RTMP URL and stream key are required');
    }

    // Validate RTMP URL format
    if (!rtmpUrl.startsWith('rtmp://')) {
      throw new Error('Invalid RTMP URL format. Must start with rtmp://');
    }

    // Validate stream key format (YouTube stream keys are typically 20+ characters)
    if (streamKey.length < 10) {
      throw new Error('Invalid stream key format. Stream key appears to be too short.');
    }

    // Check if FFmpeg is available
    let ffmpegAvailable = true;
    try {
      await this.checkFFmpegAvailability();
    } catch (error) {
      console.warn(`⚠️ FFmpeg not available: ${error.message}`);
      ffmpegAvailable = false;
      
      // For development/testing, we can continue without FFmpeg
      if (process.env.NODE_ENV === 'development') {
        console.log('📺 Running in development mode - simulating stream without FFmpeg');
        
        // Store a fake stream info for testing
        this.activeStreams.set(sessionId, {
          process: null,
          rtmpUrl: fullRtmpUrl,
          title: title || `Session ${sessionId}`,
          startTime: new Date(),
          status: 'simulated',
          ffmpegAvailable: false
        });
        
        return {
          success: true,
          sessionId,
          message: 'YouTube stream started (simulation mode - FFmpeg not available)',
          streamInfo: {
            title: title || `Session ${sessionId}`,
            rtmpUrl: rtmpUrl,
            startTime: new Date(),
            mode: 'simulation'
          }
        };
      } else {
        throw new Error(`FFmpeg is required for YouTube streaming: ${error.message}. Please install FFmpeg to enable this feature.`);
      }
    }

    // Construct full RTMP URL
    const fullRtmpUrl = `${rtmpUrl}${streamKey}`;
    
    console.log(`🎥 Starting YouTube stream for session ${sessionId}`);
    console.log(`📡 RTMP URL: ${rtmpUrl}`);
    console.log(`🔑 Stream Key: ${streamKey.substring(0, 8)}...`);

    // Test RTMP connection first (temporarily disabled for debugging)
    // if (hasVideoCapture && process.env.NODE_ENV !== 'development') {
    //   try {
    //     console.log('🔍 Testing RTMP connection before starting main stream...');
    //     await this.testRTMPConnection(fullRtmpUrl);
    //     console.log('✅ RTMP connection verified, proceeding with stream');
    //   } catch (testError) {
    //     console.error(`❌ RTMP connection test failed: ${testError.message}`);
    //     throw new Error(`YouTube streaming setup failed: ${testError.message}. Please verify your stream key and ensure your YouTube stream is live.`);
    //   }
    // }
    
    console.log('⚠️ RTMP connection test disabled - proceeding directly to streaming');

    try {
      // Create FFmpeg process for RTMP streaming
      const ffmpegProcess = this.createFFmpegProcess(
        fullRtmpUrl,
        videoConfig,
        hasVideoCapture
      );
      
      // Store stream info
      // Store stream info and original options for potential retries
      this.activeStreams.set(sessionId, {
        process: ffmpegProcess,
        rtmpUrl: fullRtmpUrl,
        title: title || `Session ${sessionId}`,
        startTime: new Date(),
        status: 'starting',
        ffmpegAvailable: true,
        options,
        retryCount: 0      // Count of RTMP bind retries
      });

      // Set up process event handlers
      this.setupProcessHandlers(sessionId, ffmpegProcess);

      // NOTE: Removed automatic frame generation - now using real WebM chunks from frontend
      // if (hasVideoCapture) {
      //   this.startFrameGeneration(sessionId);
      // }

      return {
        success: true,
        sessionId,
        message: 'YouTube stream started successfully',
        streamInfo: {
          title: title || `Session ${sessionId}`,
          rtmpUrl: rtmpUrl,
          startTime: new Date()
        }
      };

    } catch (error) {
      console.error(`❌ Failed to start YouTube stream for session ${sessionId}:`, error);
      // Clean up if we added it to activeStreams
      this.activeStreams.delete(sessionId);
      throw new Error(`Failed to start YouTube stream: ${error.message}`);
    }
  }

  /**
   * Stop RTMP streaming
   * @param {string} sessionId - Session ID
   */
  async stopStream(sessionId) {
    const streamInfo = this.activeStreams.get(sessionId);
    
    if (!streamInfo) {
      throw new Error(`No active stream found for session ${sessionId}`);
    }

    try {
      console.log(`🛑 Stopping YouTube stream for session ${sessionId}`);
      
      // Flush any remaining WebM buffer data before stopping
      if (streamInfo.webmBuffer && streamInfo.webmBuffer.chunks.length > 0 && streamInfo.process && !streamInfo.process.stdin.destroyed) {
        try {
          const finalBuffer = Buffer.concat(streamInfo.webmBuffer.chunks);
          const validatedBuffer = this.validateWebMChunk(finalBuffer);
          if (validatedBuffer) {
            streamInfo.process.stdin.write(validatedBuffer);
            console.log(`📤 Flushed final ${validatedBuffer.length} bytes before stopping stream ${sessionId}`);
          }
        } catch (flushError) {
          console.warn(`⚠️ Failed to flush final buffer for session ${sessionId}:`, flushError.message);
        }
      }
      
      // Gracefully close stdin
      if (streamInfo.process && streamInfo.process.stdin && !streamInfo.process.stdin.destroyed) {
        streamInfo.process.stdin.end();
      }
      
      // Kill FFmpeg process
      if (streamInfo.process) {
        streamInfo.process.kill('SIGTERM');
      }

      // Clean up frame generation interval
      if (streamInfo.frameInterval) {
        clearInterval(streamInfo.frameInterval);
        delete streamInfo.frameInterval;
      }

      // Clean up WebM buffer (legacy)
      if (streamInfo.webmBuffer) {
        streamInfo.webmBuffer.chunks = [];
        streamInfo.webmBuffer.totalSize = 0;
        streamInfo.webmBuffer.hasHeader = false;
        streamInfo.webmBuffer.headerBuffer = null;
        delete streamInfo.webmBuffer;
      }

      // Remove from active streams
      this.activeStreams.delete(sessionId);

      return {
        success: true,
        sessionId,
        message: 'YouTube stream stopped successfully'
      };

    } catch (error) {
      console.error(`❌ Failed to stop YouTube stream for session ${sessionId}:`, error);
      throw new Error(`Failed to stop YouTube stream: ${error.message}`);
    }
  }

  /**
   * Get stream status
   * @param {string} sessionId - Session ID
   */
  getStreamStatus(sessionId) {
    const streamInfo = this.activeStreams.get(sessionId);
    
    if (!streamInfo) {
      return { active: false, sessionId };
    }

    return {
      active: true,
      sessionId,
      title: streamInfo.title,
      rtmpUrl: streamInfo.rtmpUrl.split('/').slice(0, -1).join('/') + '/***', // Hide stream key
      startTime: streamInfo.startTime,
      status: streamInfo.status,
      duration: Date.now() - streamInfo.startTime.getTime()
    };
  }

  /**
   * Get all active streams
   */
  getAllActiveStreams() {
    const activeStreams = [];
    
    for (const [sessionId, streamInfo] of this.activeStreams) {
      activeStreams.push(this.getStreamStatus(sessionId));
    }

    return activeStreams;
  }

  /**
   * Test RTMP connection to YouTube
   * @param {string} rtmpUrl - Full RTMP URL with stream key
   * @private
   */
  async testRTMPConnection(rtmpUrl) {
    return new Promise((resolve, reject) => {
      console.log('🧪 Testing RTMP connection to YouTube...');
      
      // Create a simple test stream with minimal data
      const testArgs = [
        '-f', 'lavfi',
        '-i', 'testsrc2=size=320x240:rate=1:duration=5',
        '-f', 'lavfi', 
        '-i', 'anullsrc=channel_layout=mono:sample_rate=48000',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-b:v', '500k',
        '-c:a', 'aac',
        '-b:a', '64k',
        '-f', 'flv',
        '-timeout', '5000000', // 5 second timeout
        '-y', // Overwrite output
        rtmpUrl
      ];
      
      const testProcess = spawn('ffmpeg', testArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let errorOutput = '';
      
      testProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      testProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ RTMP connection test successful');
          resolve(true);
        } else {
          console.warn(`⚠️ RTMP connection test failed with code ${code}`);
          if (errorOutput.includes('Connection refused') || 
              errorOutput.includes('Error number -10053') ||
              errorOutput.includes('Server returned 4')) {
            reject(new Error('RTMP connection failed: Invalid stream key or YouTube stream not live'));
          } else {
            reject(new Error(`RTMP test failed: ${errorOutput.substring(0, 200)}`));
          }
        }
      });
      
      testProcess.on('error', (error) => {
        reject(new Error(`RTMP test error: ${error.message}`));
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        testProcess.kill();
        reject(new Error('RTMP connection test timed out'));
      }, 10000);
    });
  }

  /**
   * Check if FFmpeg is available on the system
   * @private
   */
  async checkFFmpegAvailability() {
    return new Promise((resolve, reject) => {
      const ffmpegTest = spawn('ffmpeg', ['-version']);
      
      ffmpegTest.on('close', (code) => {
        if (code === 0) {
          console.log('✅ FFmpeg is available');
          resolve(true);
        } else {
          reject(new Error(`FFmpeg test failed with code ${code}`));
        }
      });
      
      ffmpegTest.on('error', (error) => {
        if (error.code === 'ENOENT') {
          reject(new Error('FFmpeg is not installed or not in PATH'));
        } else {
          reject(error);
        }
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        ffmpegTest.kill();
        reject(new Error('FFmpeg availability check timed out'));
      }, 5000);
    });
  }

  /**
   * Get system audio input configuration for screen capture
   * @private
   * @returns {Array} FFmpeg audio input arguments
   */
  getSystemAudioInput() {
    // Try different audio capture methods for Windows
    // Priority: Stereo Mix > WASAPI loopback > Silent audio
    
    console.log('🔊 Configuring system audio capture...');
    
    // Option 1: DirectShow Stereo Mix (most common)
    // Note: User may need to enable "Stereo Mix" in Windows sound settings
    return [
      '-f', 'dshow',
      '-i', 'audio="Stereo Mix"'
    ];
    
    // If Stereo Mix fails, FFmpeg will automatically fall back to no audio
    // Users can enable Stereo Mix in: Control Panel > Sound > Recording > Show Disabled Devices
  }

  /**
   * Create FFmpeg process for RTMP streaming
   * @private
   */
  /**
   * Create FFmpeg process for RTMP streaming
   * @private
   * @param {string} rtmpUrl - Full RTMP URL including stream key
   * @param {Object} videoConfig - Video settings
   * @param {boolean} hasVideoCapture - Whether using WebM input
   * @param {string} [transport='tcp'] - RTMP transport protocol (tcp or udp)
   */
  createFFmpegProcess(rtmpUrl, videoConfig, hasVideoCapture = false, transport = 'tcp') {
    const {
      width = 1280,
      height = 720,
      framerate = 30,
      videoBitrate = '2500k',
      audioBitrate = '128k'
    } = videoConfig;

    let ffmpegArgs;

    if (hasVideoCapture) {
      // VIDEO GRID CAPTURE: Process WebM chunks from frontend
      console.log('🎥 Setting up WebM input processing for video grid streaming');
      
      ffmpegArgs = [
        // WebM INPUT from frontend video grid capture
        '-f', 'webm',                   // Input format: WebM from MediaRecorder
        '-i', 'pipe:0',                 // Read WebM data from stdin
        
        // Video processing for YouTube compatibility
        '-c:v', 'libx264',              // Re-encode to H.264 for YouTube
        '-preset', 'veryfast',          // Fast encoding for live streaming
        '-tune', 'zerolatency',         // Optimize for live streaming
        '-profile:v', 'main',           // Main profile for better compatibility
        '-level', '4.0',                // Level 4.0 for 720p
        '-pix_fmt', 'yuv420p',          // Standard pixel format
        '-r', framerate.toString(),     // Force frame rate
        '-g', '60',                     // GOP size (keyframe every 2 seconds)
        '-keyint_min', '30',            // Minimum GOP size
        '-sc_threshold', '0',           // Disable scene change detection
        '-b:v', videoBitrate,           // Video bitrate
        '-maxrate', videoBitrate,       // Maximum bitrate
        '-bufsize', '5000k',            // Buffer size
        
        // Audio processing
        '-c:a', 'aac',                  // AAC audio codec
        '-b:a', audioBitrate,           // Audio bitrate
        '-ar', '48000',                 // Sample rate
        '-ac', '2',                     // Stereo channels
        
        // Output format for RTMP
        '-f', 'flv',                    // FLV container for RTMP
        '-flvflags', 'no_duration_filesize',
        rtmpUrl
      ];
    } else {
      // SCREEN CAPTURE: Capture desktop screen for live streaming
      console.log('�️ Setting up SCREEN CAPTURE for YouTube stream');
      ffmpegArgs = [
        // SCREEN CAPTURE INPUT - Windows desktop capture
        '-f', 'gdigrab',                // Windows screen capture
        '-framerate', framerate.toString(),
        '-i', 'desktop',                // Capture entire desktop
        
        // AUDIO CAPTURE - Windows system audio
        '-f', 'dshow',
        '-i', 'audio="Stereo Mix"',     // Capture system audio (may need adjustment)
        
        // Video encoding optimized for screen capture
        '-c:v', 'libx264',
        '-preset', 'medium',            // Better quality for screen content
        '-tune', 'zerolatency',         // Low latency for live streaming
        '-profile:v', 'high',           // Higher profile for better quality
        '-level', '4.1',
        '-b:v', videoBitrate,
        '-maxrate', videoBitrate,       // Match target bitrate
        '-bufsize', '5000k',            // Larger buffer for screen content
        '-vf', `scale=${width}:${height}:flags=lanczos,format=yuv420p`, // High-quality scaling
        '-g', '60',                     // Keyframe every 2 seconds
        '-keyint_min', '30',
        '-force_key_frames', 'expr:gte(t,n_forced*2)',
        '-pix_fmt', 'yuv420p',
        
        // Audio encoding for system audio
        '-c:a', 'aac',
        '-b:a', audioBitrate,
        '-ar', '48000',
        '-ac', '2',
        '-aac_coder', 'twoloop',
        
        // Container and streaming options
        '-max_interleave_delta', '0',
        '-avoid_negative_ts', 'make_zero',
        '-fflags', '+genpts',
        
        // FLV output for RTMP
        '-f', 'flv',
        '-flvflags', 'no_duration_filesize',
        rtmpUrl
      ];
    }

    console.log('🔧 Enhanced FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));

    // Spawn FFmpeg process with enhanced error handling
    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
      stdio: hasVideoCapture ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    return ffmpegProcess;
  }

  /**
   * Start continuous frame generation for raw video streaming
   * @param {string} sessionId - Session ID
   */
  startFrameGeneration(sessionId) {
    const streamInfo = this.activeStreams.get(sessionId);
    if (!streamInfo) return;

    console.log(`🎬 Starting frame generation for session ${sessionId}`);
    
    const width = 1280;
    const height = 720;
    const frameSize = width * height * 1.5; // YUV420P format
    let frameCount = 0;
    
    // Generate frames at 30fps (33ms interval)
    const frameInterval = setInterval(() => {
      const currentStreamInfo = this.activeStreams.get(sessionId);
      
      // Stop if stream is no longer active
      if (!currentStreamInfo || 
          currentStreamInfo.status === 'error' || 
          currentStreamInfo.status === 'ended' ||
          !currentStreamInfo.process ||
          !currentStreamInfo.process.stdin ||
          currentStreamInfo.process.stdin.destroyed) {
        clearInterval(frameInterval);
        console.log(`🛑 Stopped frame generation for session ${sessionId}`);
        return;
      }

      try {
        // Create a simple test pattern frame
        const testFrame = this.createTestFrame(width, height, frameCount);
        
        // Write frame to FFmpeg stdin
        const written = currentStreamInfo.process.stdin.write(testFrame);
        
        if (frameCount % 90 === 0) { // Log every 3 seconds
          console.log(`📸 Generated frame ${frameCount} for session ${sessionId}`);
        }
        
        frameCount++;
      } catch (error) {
        console.error(`❌ Frame generation error for session ${sessionId}:`, error);
        clearInterval(frameInterval);
      }
    }, 33); // 30fps = ~33ms per frame
    
    // Store interval reference for cleanup
    streamInfo.frameInterval = frameInterval;
  }

  /**
   * Create a test frame in YUV420P format
   * @param {number} width - Frame width
   * @param {number} height - Frame height  
   * @param {number} frameCount - Current frame number
   * @returns {Buffer} - YUV420P frame data
   */
  createTestFrame(width, height, frameCount) {
    const ySize = width * height;
    const uvSize = (width * height) / 4;
    const frameSize = ySize + uvSize * 2;
    
    const frame = Buffer.alloc(frameSize);
    
    // Create a simple moving pattern
    const offset = (frameCount * 2) % width;
    
    // Y plane (luminance) - creates brightness pattern
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pos = y * width + x;
        // Create moving diagonal stripes
        const value = ((x + offset + y) % 100 < 50) ? 200 : 50;
        frame[pos] = value;
      }
    }
    
    // U and V planes (chrominance) - set to neutral gray
    frame.fill(128, ySize, frameSize);
    
    return frame;
  }

  /**
   * Send video data - COMPLETELY NEW APPROACH
   * Instead of WebM chunks, we'll extract frames and send raw video data
   * @param {string} sessionId - Session ID
   * @param {Buffer} videoData - Video chunk data (ignored in new approach)
   */
  sendVideoData(sessionId, videoData) {
    const streamInfo = this.activeStreams.get(sessionId);
    
    if (!streamInfo) {
      console.warn(`⚠️ No active stream found for session ${sessionId}`);
      return false;
    }

    // Handle simulation mode
    if (streamInfo.status === 'simulated' || !streamInfo.ffmpegAvailable) {
      console.log(`📺 Simulating video data processing for session ${sessionId}, size: ${videoData.length} bytes`);
      return true;
    }

    // Handle real FFmpeg streaming
    if (!streamInfo.process) {
      console.warn(`⚠️ No FFmpeg process found for session ${sessionId}`);
      return false;
    }

    // Check if process has errored or ended
    if (streamInfo.status === 'error' || streamInfo.status === 'ended') {
      console.warn(`⚠️ Stream ${sessionId} is in ${streamInfo.status} state, ignoring chunk`);
      return false;
    }

    // NEW APPROACH: Generate dummy frame data for testing
    // This bypasses all WebM container issues
    try {
      if (!streamInfo.process.stdin || streamInfo.process.stdin.destroyed) {
        console.warn(`⚠️ FFmpeg stdin not available for session ${sessionId}`);
        streamInfo.status = 'error';
        return false;
      }

      // Create a simple test frame (black frame in YUV420P format)
      const width = 1280;
      const height = 720;
      const frameSize = width * height * 1.5; // YUV420P uses 1.5 bytes per pixel
      const testFrame = Buffer.alloc(frameSize, 0); // Black frame
      
      // Write test frame to FFmpeg
      const written = streamInfo.process.stdin.write(testFrame);
      
      if (!written) {
        streamInfo.process.stdin.once('drain', () => {
          console.log(`💧 FFmpeg stdin drained for session ${sessionId}`);
        });
      }
      
      console.log(`📤 Sent test frame ${frameSize} bytes to FFmpeg for session ${sessionId}`);
      return true;

    } catch (writeError) {
      console.error(`❌ Write error for session ${sessionId}:`, writeError.message);
      streamInfo.status = 'error';
      return false;
    }
  }

  /**
   * Validate and fix WebM chunk structure
   * @param {Buffer} buffer - Buffer to validate
   * @returns {Buffer|null} - Fixed buffer or null if invalid
   */
  validateWebMChunk(buffer) {
    if (!buffer || buffer.length < 4) {
      return null;
    }
    
    // Check for EBML signature (0x1A45DFA3)
    const ebmlSignature = Buffer.from([0x1A, 0x45, 0xDF, 0xA3]);
    const segmentSignature = Buffer.from([0x18, 0x53, 0x80, 0x67]);
    
    // If buffer already has EBML header, return as is
    if (buffer.includes(ebmlSignature)) {
      return buffer;
    }
    
    // If it's a segment chunk, it's valid continuation data
    if (buffer.includes(segmentSignature)) {
      return buffer;
    }
    
    // For the first chunk without EBML header, create a minimal WebM container
    if (buffer.length > 100) {
      const webmHeader = this.createMinimalWebMHeader();
      return Buffer.concat([webmHeader, buffer]);
    }
    
    return null; // Reject very small or invalid chunks
  }

  /**
   * Create a minimal WebM container header
   * @returns {Buffer} - Minimal WebM header
   */
  createMinimalWebMHeader() {
    // Minimal WebM EBML header + Segment header
    // This creates a basic WebM container that FFmpeg can parse
    const ebmlHeader = Buffer.from([
      // EBML Header (0x1A45DFA3)
      0x1A, 0x45, 0xDF, 0xA3, // EBML ID
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1F, // Size (31 bytes)
      
      // EBMLVersion (0x4286)
      0x42, 0x86, // EBMLVersion ID
      0x81, // Size (1 byte)
      0x01, // Version 1
      
      // EBMLReadVersion (0x42F7)
      0x42, 0xF7, // EBMLReadVersion ID
      0x81, // Size (1 byte)
      0x01, // Version 1
      
      // EBMLMaxIDLength (0x42F2)
      0x42, 0xF2, // EBMLMaxIDLength ID
      0x81, // Size (1 byte)
      0x04, // 4 bytes max
      
      // EBMLMaxSizeLength (0x42F3)
      0x42, 0xF3, // EBMLMaxSizeLength ID
      0x81, // Size (1 byte)
      0x08, // 8 bytes max
      
      // DocType (0x4282)
      0x42, 0x82, // DocType ID
      0x84, // Size (4 bytes)
      0x77, 0x65, 0x62, 0x6D, // "webm"
      
      // DocTypeVersion (0x4287)
      0x42, 0x87, // DocTypeVersion ID
      0x81, // Size (1 byte)
      0x02, // Version 2
      
      // DocTypeReadVersion (0x4285)
      0x42, 0x85, // DocTypeReadVersion ID
      0x81, // Size (1 byte)
      0x02, // Version 2
      
      // Segment Header (0x18538067)
      0x18, 0x53, 0x80, 0x67, // Segment ID
      0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF // Unknown size (live stream)
    ]);
    
    return ebmlHeader;
  }

  /**
   * Send video frame to active stream (raw YUV420 data)
   * @param {string} sessionId - Session ID
   * @param {Buffer} frameData - Raw YUV420 frame data
   * @param {number} width - Frame width
   * @param {number} height - Frame height
   */
  sendVideoFrame(sessionId, frameData, width, height) {
    const streamInfo = this.activeStreams.get(sessionId);
    
    if (!streamInfo) {
      console.warn(`⚠️ No active stream found for session ${sessionId}`);
      return false;
    }

    // Handle simulation mode (when FFmpeg is not available)
    if (streamInfo.status === 'simulated' || !streamInfo.ffmpegAvailable) {
      console.log(`🎬 Simulating video frame processing for session ${sessionId}, size: ${frameData.length} bytes (${width}x${height})`);
      return true;
    }

    // Handle real FFmpeg streaming
    if (!streamInfo.process) {
      console.warn(`⚠️ No FFmpeg process found for session ${sessionId}`);
      return false;
    }

    try {
      // Write raw frame data to FFmpeg stdin
      if (streamInfo.process.stdin && !streamInfo.process.stdin.destroyed) {
        streamInfo.process.stdin.write(frameData);
        return true;
      } else {
        console.warn(`⚠️ FFmpeg stdin not available for session ${sessionId}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error sending video frame for session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Set up process event handlers
   * @private
   */
  setupProcessHandlers(sessionId, ffmpegProcess) {
    ffmpegProcess.stdout.on('data', (data) => {
      console.log(`📊 FFmpeg stdout [${sessionId}]:`, data.toString());
    });

    ffmpegProcess.stderr.on('data', (data) => {
      const output = data.toString();
      // Retry on RTMP bind error (-10049)
      // RTMP bind error (-10049): retry before failing
      if (output.includes('Error number -10049')) {
        const streamInfo = this.activeStreams.get(sessionId);
        if (streamInfo) {
          const MAX_RTMP_RETRIES = 3;
          streamInfo.retryCount = (streamInfo.retryCount || 0) + 1;
          if (streamInfo.retryCount <= MAX_RTMP_RETRIES) {
            console.error(`� RTMP bind error (-10049) for session ${sessionId}, attempt ${streamInfo.retryCount}/${MAX_RTMP_RETRIES}`);
            // Kill current process
            try { streamInfo.process.kill('SIGTERM'); } catch {}
            // Restart FFmpeg after delay
            setTimeout(() => {
              const newProcess = this.createFFmpegProcess(
                streamInfo.rtmpUrl,
                streamInfo.options.videoConfig,
                streamInfo.options.hasVideoCapture
              );
              streamInfo.process = newProcess;
              streamInfo.status = 'retrying';
              this.setupProcessHandlers(sessionId, newProcess);
              console.log(`✅ Restarted FFmpeg process for session ${sessionId} (retry ${streamInfo.retryCount})`);
            }, 2000);
          } else {
            console.error(`❌ RTMP bind error persists after ${MAX_RTMP_RETRIES} retries for session ${sessionId}`);
            streamInfo.status = 'error';
          }
        }
        return;
      }
      
      // Filter out common non-critical warnings but keep debug info for connection issues
      if (output.includes('Invalid track number') || 
          output.includes('Non-monotonous DTS') ||
          output.includes('Application provided invalid')) {
        console.debug(`🔍 FFmpeg debug [${sessionId}]:`, output.trim());
        return;
      }
      
      // Log deprecation warnings but don't treat as errors
      if (output.includes('-vsync is deprecated')) {
        console.warn(`⚠️ FFmpeg deprecation warning [${sessionId}]:`, output.trim());
        return;
      }
      
      console.log(`📊 FFmpeg stderr [${sessionId}]:`, output);
      
      // Update status based on FFmpeg output
      if (output.includes('Stream mapping:') || output.includes('frame=')) {
        const streamInfo = this.activeStreams.get(sessionId);
        if (streamInfo && streamInfo.status === 'starting') {
          streamInfo.status = 'streaming';
          console.log(`✅ Stream ${sessionId} is now live!`);
        }
      }
      
      // Check for critical errors with more specific handling
      if (output.includes('Error submitting a packet to the muxer') ||
          output.includes('Connection refused') ||
          output.includes('Server returned 4') ||
          output.includes('Error number -10053') ||
          output.includes('Error writing trailer') ||
          output.includes('Task finished with error code') ||
          output.includes('Conversion failed!')) {
        console.error(`🚨 Critical FFmpeg error for session ${sessionId}: Network/Muxer error detected`);
        const streamInfo = this.activeStreams.get(sessionId);
        if (streamInfo) {
          streamInfo.status = 'error';
          
          // Add specific error handling for different error types
          if (output.includes('Error number -10053')) {
            console.error(`🌐 Network connection error (-10053) for session ${sessionId}:`);
            console.error(`   This usually means:`);
            console.error(`   1. YouTube stream is not live/ready`);
            console.error(`   2. Invalid stream key`);
            console.error(`   3. Network connectivity issues`);
            console.error(`   4. YouTube server rejected the connection`);
          } else if (output.includes('Connection refused')) {
            console.error(`🚫 Connection refused for session ${sessionId} - check RTMP URL and stream key`);
          } else if (output.includes('Server returned 4')) {
            console.error(`🔑 Authentication error for session ${sessionId} - check stream key`);
          }
        }
      }
    });

    ffmpegProcess.on('close', (code) => {
      console.log(`🏁 FFmpeg process [${sessionId}] exited with code ${code}`);
      
      const streamInfo = this.activeStreams.get(sessionId);
      if (streamInfo) {
        streamInfo.status = code === 0 ? 'ended' : 'error';
      }
      
      // Clean up after a delay
      setTimeout(() => {
        this.activeStreams.delete(sessionId);
        console.log(`🧹 Cleaned up stream ${sessionId}`);
      }, 5000);
    });

    ffmpegProcess.on('error', (error) => {
      console.error(`❌ FFmpeg process error [${sessionId}]:`, error);
      
      const streamInfo = this.activeStreams.get(sessionId);
      if (streamInfo) {
        streamInfo.status = 'error';
      }
      
      // For ENOENT (command not found), clean up immediately
      if (error.code === 'ENOENT') {
        console.error('💡 FFmpeg is not installed. Please install FFmpeg to enable YouTube streaming.');
        this.activeStreams.delete(sessionId);
      } else {
        // For other errors, delay cleanup to allow for troubleshooting
        setTimeout(() => {
          this.activeStreams.delete(sessionId);
        }, 2000);
      }
    });

    // Handle stdin errors with better recovery
    if (ffmpegProcess.stdin) {
      ffmpegProcess.stdin.on('error', (error) => {
        console.error(`❌ FFmpeg stdin error [${sessionId}]:`, error.message);
        const streamInfo = this.activeStreams.get(sessionId);
        if (streamInfo) {
          if (error.code === 'EOF' || error.code === 'EPIPE') {
            streamInfo.status = 'ended';
            console.warn(`⚠️ FFmpeg stdin closed unexpectedly for session ${sessionId}`);
          } else {
            streamInfo.status = 'error';
          }
        }
      });

      ffmpegProcess.stdin.on('close', () => {
        console.log(`🔒 FFmpeg stdin closed for session ${sessionId}`);
        const streamInfo = this.activeStreams.get(sessionId);
        if (streamInfo && streamInfo.status === 'streaming') {
          streamInfo.status = 'ended';
        }
      });

      // Prevent stdin from throwing uncaught exceptions
      ffmpegProcess.stdin.on('pipe', () => {
        console.log(`🔗 FFmpeg stdin pipe connected for session ${sessionId}`);
      });
    }
  }

  /**
   * Process video grid streaming chunk
   * @param {Object} options - Chunk processing options
   * @param {string} options.sessionId - Session ID
   * @param {Buffer} options.chunkData - Video chunk data
   * @param {number} options.timestamp - Chunk timestamp
   * @param {string} options.mimeType - Chunk MIME type
   */
  async processStreamChunk(options) {
    const { sessionId, chunkData, timestamp, mimeType } = options;
    
    const streamInfo = this.activeStreams.get(sessionId);
    if (!streamInfo) {
      throw new Error(`No active stream found for session ${sessionId}`);
    }

    // Handle simulation mode
    if (streamInfo.status === 'simulated' || !streamInfo.ffmpegAvailable) {
      console.log(`📺 Processing chunk in simulation mode for session ${sessionId}, size: ${chunkData.length} bytes`);
      return {
        success: true,
        sessionId,
        message: 'Chunk processed (simulation mode)',
        chunkSize: chunkData.length
      };
    }

    // Process the chunk for real streaming
    try {
      // If FFmpeg is expecting WebM, send the chunk directly
      if (streamInfo.process && streamInfo.process.stdin && !streamInfo.process.stdin.destroyed) {
        const written = streamInfo.process.stdin.write(chunkData);
        
        if (!written) {
          // Handle backpressure
          await new Promise((resolve) => {
            streamInfo.process.stdin.once('drain', resolve);
          });
        }
        
        console.log(`📤 Processed chunk for session ${sessionId}, size: ${chunkData.length} bytes`);
        
        return {
          success: true,
          sessionId,
          message: 'Chunk processed successfully',
          chunkSize: chunkData.length,
          timestamp
        };
      } else {
        throw new Error('FFmpeg process not available for writing');
      }
      
    } catch (error) {
      console.error(`❌ Error processing chunk for session ${sessionId}:`, error);
      throw new Error(`Failed to process stream chunk: ${error.message}`);
    }
  }
}

// Export singleton instance
export default new YouTubeStreamingService();
