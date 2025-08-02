import YouTubeStreamingService from '../services/youtube.service.js';
import wrapAsync from '../utils/trycatchwrapper.js';

/**
 * Start YouTube RTMP streaming
 * POST /api/youtube/start-stream
 * @body {
 *   sessionId: string,
 *   rtmpUrl: string,
 *   streamKey: string,
 *   title?: string,
 *   videoConfig?: object
 * }
 */
export const startYouTubeStream = wrapAsync(async (req, res) => {
  const { sessionId, rtmpUrl, streamKey, title, videoConfig, hasVideoCapture } = req.body;
  
  // Validate required fields
  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: 'Session ID is required'
    });
  }

  if (!rtmpUrl || !streamKey) {
    return res.status(400).json({
      success: false,
      message: 'RTMP URL and stream key are required'
    });
  }

  // Validate RTMP URL format
  if (!rtmpUrl.startsWith('rtmp://')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid RTMP URL format. Must start with rtmp://'
    });
  }

  try {
    console.log(`🎥 Received YouTube stream request for session: ${sessionId}`);
    
    const result = await YouTubeStreamingService.startStream({
      sessionId,
      rtmpUrl,
      streamKey,
      title,
      videoConfig,
      hasVideoCapture: hasVideoCapture === true
    });

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ YouTube stream start error:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to start YouTube stream',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Stop YouTube RTMP streaming
 * POST /api/youtube/stop-stream
 * @body { sessionId: string }
 */
export const stopYouTubeStream = wrapAsync(async (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: 'Session ID is required'
    });
  }

  try {
    console.log(`🛑 Received YouTube stream stop request for session: ${sessionId}`);
    
    const result = await YouTubeStreamingService.stopStream(sessionId);

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ YouTube stream stop error:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to stop YouTube stream',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Get YouTube stream status
 * GET /api/youtube/stream-status/:sessionId
 */
export const getStreamStatus = wrapAsync(async (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: 'Session ID is required'
    });
  }

  try {
    const status = YouTubeStreamingService.getStreamStatus(sessionId);

    res.status(200).json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('❌ Get stream status error:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get stream status',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Handle video grid streaming chunk
 * POST /api/youtube/stream-chunk
 * @body FormData with chunk, sessionId, timestamp
 */
export const handleStreamChunk = wrapAsync(async (req, res) => {
  try {
    const { sessionId, timestamp } = req.body;
    const chunk = req.file; // Using multer single upload
    
    if (!sessionId || !chunk) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and chunk are required'
      });
    }

    // Process the chunk through the YouTube service
    const result = await YouTubeStreamingService.processStreamChunk({
      sessionId,
      chunkData: chunk.buffer,
      timestamp: parseInt(timestamp) || Date.now(),
      mimeType: chunk.mimetype
    });

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Stream chunk processing error:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process stream chunk',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Get all active YouTube streams
 * GET /api/youtube/active-streams
 */
export const getActiveStreams = wrapAsync(async (req, res) => {
  try {
    const activeStreams = YouTubeStreamingService.getAllActiveStreams();

    res.status(200).json({
      success: true,
      data: {
        count: activeStreams.length,
        streams: activeStreams
      }
    });

  } catch (error) {
    console.error('❌ Get active streams error:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get active streams',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
