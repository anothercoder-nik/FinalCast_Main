import wrapAsync from "../utils/trycatchwrapper.js";
import * as recordingService from "../services/recording.service.js";
import { createUploadMiddleware, cloudStorage, getStorageConfig } from "../config/cloudStorage.js";
import path from 'path';
import fs from 'fs';

// Upload middleware for recording files
export const uploadMiddleware = createUploadMiddleware({
  maxFileSize: process.env.MAX_RECORDING_FILE_SIZE || 500 * 1024 * 1024, // 500MB
  allowedMimeTypes: (process.env.ALLOWED_RECORDING_FORMATS || 'video/mp4,video/webm,video/quicktime,audio/mp4,audio/mpeg').split(',')
});

// Create a new recording session
export const createRecording = wrapAsync(async (req, res) => {
  const { recordingId, sessionId, participants, settings, startTime } = req.body;
  
  const recording = await recordingService.createRecordingService({
    recordingId,
    sessionId,
    participants,
    settings,
    startTime
  }, req.user._id);
  
  res.status(201).json({
    success: true,
    message: 'Recording session created successfully',
    recording
  });
});

// Upload a participant's recording file
export const uploadRecordingFile = wrapAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  const {
    recordingId,
    sessionId,
    participantId,
    participantName,
    isHost,
    duration,
    size
  } = req.body;

  const fileData = {
    participantId,
    participantName,
    filename: req.file.filename,
    originalName: req.file.originalname,
    fileSize: parseInt(size) || req.file.size,
    duration: parseInt(duration) || 0,
    mimeType: req.file.mimetype,
    cloudUrl: req.file.path || `/uploads/recordings/${req.file.filename}`,
    isHost: isHost === 'true'
  };

  const result = await recordingService.addRecordingFileService(
    recordingId,
    fileData,
    req.user._id
  );

  res.json({
    success: true,
    message: 'File uploaded successfully',
    file: result.file,
    recording: result.recording
  });
});

// Finalize a recording session
export const finalizeRecording = wrapAsync(async (req, res) => {
  const { recordingId } = req.params;
  const { duration, endTime, status, fileCount } = req.body;

  const recording = await recordingService.finalizeRecordingService(
    recordingId,
    {
      duration,
      endTime,
      status,
      fileCount
    },
    req.user._id
  );

  res.json({
    success: true,
    message: 'Recording finalized successfully',
    recording
  });
});

// Get all recordings for the authenticated user
export const getUserRecordings = wrapAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  
  const result = await recordingService.getUserRecordingsService(
    req.user._id,
    {
      page: parseInt(page),
      limit: parseInt(limit)
    }
  );

  res.json({
    success: true,
    recordings: result.recordings,
    pagination: result.pagination
  });
});

// Get a specific recording by ID
export const getRecording = wrapAsync(async (req, res) => {
  const { recordingId } = req.params;
  
  const recording = await recordingService.getRecordingService(
    recordingId,
    req.user._id
  );

  res.json({
    success: true,
    recording
  });
});

// Get recordings for a specific session
export const getSessionRecordings = wrapAsync(async (req, res) => {
  const { sessionId } = req.params;
  
  const recordings = await recordingService.getSessionRecordingsService(
    sessionId,
    req.user._id
  );

  res.json({
    success: true,
    recordings
  });
});

// Download a specific recording file
export const downloadRecordingFile = wrapAsync(async (req, res) => {
  const { recordingId, fileId } = req.params;
  
  const fileInfo = await recordingService.getRecordingFileService(
    recordingId,
    fileId,
    req.user._id
  );

  // Set headers for file download
  res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.originalName}"`);
  res.setHeader('Content-Type', fileInfo.mimeType);
  
  // Handle different storage providers
  try {
    if (fileInfo.cloudUrl.startsWith('http')) {
      // For cloud URLs (Cloudinary, S3 public URLs), redirect
      res.redirect(fileInfo.cloudUrl);
    } else {
      // For local files or signed URLs
      const filePath = path.resolve(fileInfo.cloudUrl);
      
      if (fs.existsSync(filePath)) {
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
      } else {
        res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Download failed'
    });
  }
});

// Delete a recording
export const deleteRecording = wrapAsync(async (req, res) => {
  const { recordingId } = req.params;
  
  const result = await recordingService.deleteRecordingService(
    recordingId,
    req.user._id
  );

  res.json({
    success: true,
    message: 'Recording deleted successfully',
    recording: result
  });
});

// Update recording metadata
export const updateRecording = wrapAsync(async (req, res) => {
  const { recordingId } = req.params;
  const { title, metadata } = req.body;
  
  const recording = await recordingService.updateRecordingService(
    recordingId,
    { title, metadata },
    req.user._id
  );

  res.json({
    success: true,
    message: 'Recording updated successfully',
    recording
  });
});

// Get storage configuration info
export const getStorageConfiguration = wrapAsync(async (req, res) => {
  const config = getStorageConfig();
  
  res.json({
    success: true,
    storage: {
      provider: config.provider,
      configured: config.isConfigured[config.provider],
      available_providers: Object.keys(config.isConfigured).filter(
        key => config.isConfigured[key]
      )
    }
  });
});
