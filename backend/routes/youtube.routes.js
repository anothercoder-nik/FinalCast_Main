import express from 'express';
import multer from 'multer';
import {
  startYouTubeStream,
  stopYouTubeStream,
  getStreamStatus,
  getActiveStreams,
  handleStreamChunk
} from '../controllers/youtubeController.js';
import { authenticateToken} from '../middleware/auth.js';

const router = express.Router();

// Configure multer for handling video chunks
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for chunks
  }
});

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   POST /api/youtube/start-stream
 * @desc    Start YouTube RTMP streaming for a session
 * @access  Private (Host only)
 * @body    {
 *   sessionId: string,
 *   rtmpUrl: string,
 *   streamKey: string,
 *   title?: string,
 *   videoConfig?: {
 *     width?: number,
 *     height?: number,
 *     framerate?: number,
 *     videoBitrate?: string,
 *     audioBitrate?: string
 *   }
 * }
 */
router.post('/start-stream', startYouTubeStream);

/**
 * @route   POST /api/youtube/stop-stream
 * @desc    Stop YouTube RTMP streaming for a session
 * @access  Private (Host only)
 * @body    { sessionId: string }
 */
router.post('/stop-stream', stopYouTubeStream);

/**
 * @route   POST /api/youtube/stream-chunk
 * @desc    Handle video grid streaming chunk
 * @access  Private
 * @body    FormData with chunk, sessionId, timestamp
 */
router.post('/stream-chunk', upload.single('chunk'), handleStreamChunk);

/**
 * @route   GET /api/youtube/stream-status/:sessionId
 * @desc    Get YouTube stream status for a session
 * @access  Private
 * @params  sessionId - Session ID
 */
router.get('/stream-status/:sessionId', getStreamStatus);

/**
 * @route   GET /api/youtube/active-streams
 * @desc    Get all active YouTube streams
 * @access  Private (Admin/Host only)
 */
router.get('/active-streams', getActiveStreams);

export default router;
