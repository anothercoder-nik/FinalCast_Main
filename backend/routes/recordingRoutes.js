import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { RecordingChunk, FinalRecording } from '../models/recording.model.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

console.log('🎥 Recording routes - Cloudinary configured:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : 'NOT_SET',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT_SET'
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for memory storage with larger limits
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 150 * 1024 * 1024, // Increased to 150MB limit for high-quality recordings
    fieldSize: 10 * 1024 * 1024   // 10MB field size limit
  }
});

/**
 * Upload chunk directly to Cloudinary via backend
 */
router.post('/upload-chunk', upload.single('chunk'), async (req, res) => {
  try {
    const { sessionId, role, participantId, chunkIndex, timestamp } = req.body;

    if (!sessionId || !role || !participantId || chunkIndex === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: sessionId, role, participantId, chunkIndex' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No chunk file provided' });
    }

    // Generate unique public_id for this chunk with proper folder structure
    const publicId = `sessions/${sessionId}/${role}/chunk_${chunkIndex}_${timestamp}`;

    console.log('📤 Uploading chunk to Cloudinary:', {
      publicId,
      fileSize: req.file.size,
      sessionId,
      participantId,
      role,
      chunkIndex
    });

    // Upload directly to Cloudinary using upload_stream
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: 'video', // Change back to 'video' to make chunks playable
        format: 'webm',
        folder: `sessions/${sessionId}/${role}` // Explicit folder specification
      },
      async (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          if (!res.headersSent) {
            return res.status(500).json({ error: 'Failed to upload to Cloudinary', details: error.message });
          }
          return;
        }

        console.log('✅ Cloudinary upload successful:', {
          publicId: result.public_id,
          url: result.secure_url,
          size: result.bytes
        });

        try {
          // Save chunk metadata to database
          const chunk = new RecordingChunk({
            sessionId,
            participantId,
            role,
            publicId: result.public_id,
            chunkIndex: parseInt(chunkIndex),
            timestamp: parseInt(timestamp),
            uploadedAt: new Date(),
            size: result.bytes,
            duration: result.duration || 3,
            url: result.secure_url
          });

          await chunk.save();
          console.log('✅ Chunk saved to database:', result.public_id);

          if (!res.headersSent) {
            res.json({ 
              success: true,
              publicId: result.public_id,
              url: result.secure_url,
              size: result.bytes
            });
          }
        } catch (dbError) {
          console.error('❌ Database error:', dbError);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to save chunk metadata', details: dbError.message });
          }
        }
      }
    );

    // Write the buffer to the upload stream
    uploadStream.write(req.file.buffer);
    uploadStream.end();

  } catch (error) {
    console.error('❌ Upload chunk error:', error);
    res.status(500).json({ error: 'Failed to upload chunk' });
  }
});

/**
 * Track uploaded chunks
 */
router.post('/chunk-uploaded', async (req, res) => {
  try {
    const { sessionId, participantId, role, publicId, chunkIndex, timestamp, size } = req.body;

    if (!sessionId || !participantId || !publicId || chunkIndex === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }

    // Save chunk metadata to database
    const chunk = new RecordingChunk({
      sessionId,
      participantId,
      role,
      chunkIndex,
      publicId,
      timestamp,
      size
    });

    await chunk.save();

    console.log(`Chunk ${chunkIndex} tracked for session ${sessionId}, participant ${participantId}`);
    res.json({ success: true, message: 'Chunk tracked successfully' });

  } catch (error) {
    console.error('Error tracking chunk:', error);
    res.status(500).json({ error: 'Failed to track chunk' });
  }
});

/**
 * Upload complete video (combined from chunks) to Cloudinary
 */
router.post('/upload-complete-video', upload.single('video'), async (req, res) => {
  try {
    const { sessionId, role, participantId, participantName, duration } = req.body;

    if (!sessionId || !role || !participantId) {
      return res.status(400).json({ 
        error: 'Missing required fields: sessionId, role, participantId' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    console.log('📤 Uploading complete video to Cloudinary:', {
      sessionId,
      participantId,
      role,
      fileSize: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
      fileSizeBytes: req.file.size,
      duration,
      mimeType: req.file.mimetype
    });

    // Generate public_id for the final video with clear naming
    const timestamp = Date.now();
    const publicId = `sessions/${sessionId}/${role}-${participantId}-${timestamp}`;

    // Upload directly to Cloudinary using upload_stream with timeout handling
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: 'video',
        format: 'webm',
        folder: `sessions/${sessionId}`,
        quality: 'auto:good', // Reduced from 'auto:best' to avoid timeout
        flags: 'progressive', // Enable progressive download
        timeout: 300000, // 5 minutes timeout (300 seconds)
        chunk_size: 20000000, // 20MB chunks for large files
        tags: [`session-${sessionId}`, `role-${role}`, `participant-${participantId}`, 'high-quality']
      },
      async (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          if (!res.headersSent) {
            return res.status(500).json({ error: 'Failed to upload to Cloudinary', details: error.message });
          }
          return;
        }

        console.log('✅ Cloudinary upload successful:', {
          publicId: result.public_id,
          url: result.secure_url,
          size: result.bytes,
          duration: result.duration
        });

        try {
          // Save final recording to database with descriptive filename
          const finalRecording = new FinalRecording({
            sessionId,
            participantId,
            role,
            publicId: result.public_id,
            url: result.secure_url,
            filename: `${role}-recording.webm`,
            displayName: role === 'host' ? 'Host Recording' : `${participantName || participantId} Recording`,
            duration: result.duration || duration,
            size: result.bytes,
            format: 'webm',
            totalChunks: 1, // Since we're uploading as one complete video
            uploadedAt: new Date()
          });

          await finalRecording.save();
          console.log('✅ Final recording saved to database:', result.public_id);

          if (!res.headersSent) {
            res.json({ 
              success: true,
              publicId: result.public_id,
              url: result.secure_url,
              size: result.bytes,
              duration: result.duration,
              message: 'Video uploaded successfully'
            });
          }
        } catch (dbError) {
          console.error('❌ Database error:', dbError);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to save video metadata', details: dbError.message });
          }
        }
      }
    );

    // Write the buffer to the upload stream
    uploadStream.end(req.file.buffer);

  } catch (error) {
    console.error('❌ Upload complete video error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to upload video' });
    }
  }
});

/**
 * Merge chunks into final video
 */
router.post('/merge-chunks', async (req, res) => {
  try {
    const { sessionId, participantId, role } = req.body;

    if (!sessionId || !participantId || !role) {
      return res.status(400).json({ 
        error: 'Missing required fields: sessionId, participantId, role' 
      });
    }

    // Get chunks from database
    const chunks = await RecordingChunk.find({
      sessionId,
      participantId,
      role,
      processed: false
    }).sort({ chunkIndex: 1 });

    if (!chunks || chunks.length === 0) {
      return res.status(404).json({ error: 'No chunks found for merging' });
    }

    console.log(`Starting merge for session ${sessionId}, participant ${participantId}, role ${role} with ${chunks.length} chunks`);

    // Create temporary directory for processing
    const tempDir = path.join(__dirname, '../temp', sessionId);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Download all chunks from Cloudinary
    const downloadPromises = chunks.map(async (chunk, index) => {
      const tempFilePath = path.join(tempDir, `chunk_${index}.webm`);
      const downloadUrl = cloudinary.url(chunk.publicId, {
        resource_type: 'video',
        secure: true
      });

      const response = await fetch(downloadUrl);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(tempFilePath, Buffer.from(buffer));
      
      return tempFilePath;
    });

    const downloadedFiles = await Promise.all(downloadPromises);

    // Create file list for FFmpeg
    const fileListPath = path.join(tempDir, 'filelist.txt');
    const fileListContent = downloadedFiles
      .map(filePath => `file '${filePath}'`)
      .join('\n');
    fs.writeFileSync(fileListPath, fileListContent);

    // Merge using FFmpeg
    const outputPath = path.join(tempDir, `${role}.mp4`);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(fileListPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy'])
        .output(outputPath)
        .on('end', async () => {
          try {
            console.log(`Merge completed for session ${sessionId}, participant ${participantId}, role ${role}`);

            // Upload final video to Cloudinary
            const finalPublicId = `sessions/${sessionId}/final/${role}_${participantId}`;
            const uploadResult = await cloudinary.uploader.upload(outputPath, {
              resource_type: 'video',
              public_id: finalPublicId,
              folder: `sessions/${sessionId}/final`
            });

            // Save final recording to database
            const finalRecording = new FinalRecording({
              sessionId,
              participantId,
              role,
              publicId: finalPublicId,
              url: uploadResult.secure_url,
              filename: `${role}_${participantId}.mp4`,
              duration: uploadResult.duration,
              size: uploadResult.bytes,
              format: 'mp4',
              totalChunks: chunks.length
            });

            await finalRecording.save();

            // Mark chunks as processed
            await RecordingChunk.updateMany(
              { sessionId, participantId, role },
              { processed: true }
            );

            // Clean up temporary files
            downloadedFiles.forEach(file => {
              if (fs.existsSync(file)) fs.unlinkSync(file);
            });
            if (fs.existsSync(fileListPath)) fs.unlinkSync(fileListPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

            // Delete original chunks from Cloudinary to save space
            const deletePromises = chunks.map(chunk => 
              cloudinary.uploader.destroy(chunk.publicId, { resource_type: 'video' })
            );
            await Promise.all(deletePromises);

            console.log(`Final video uploaded: ${uploadResult.secure_url}`);
            
            res.json({
              success: true,
              finalVideoUrl: uploadResult.secure_url,
              publicId: finalPublicId,
              duration: uploadResult.duration,
              size: uploadResult.bytes
            });

            resolve();
          } catch (uploadError) {
            console.error('Error uploading final video:', uploadError);
            reject(uploadError);
          }
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        })
        .run();
    });

  } catch (error) {
    console.error('Error merging chunks:', error);
    res.status(500).json({ error: 'Failed to merge chunks' });
  }
});

/**
 * List final videos for a session
 */
router.get('/session/:sessionId/videos', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Get final recordings from database
    const recordings = await FinalRecording.find({ sessionId })
      .populate('participantId', 'name email')
      .sort({ createdAt: -1 });

    const videos = recordings.map(recording => ({
      publicId: recording.publicId,
      url: recording.url,
      filename: recording.filename,
      duration: recording.duration,
      size: recording.size,
      createdAt: recording.createdAt,
      format: recording.format,
      role: recording.role,
      participant: recording.participantId
    }));

    res.json({ videos });

  } catch (error) {
    console.error('Error fetching session videos:', error);
    res.status(500).json({ error: 'Failed to fetch session videos' });
  }
});

/**
 * Generate download link for a specific video
 */
router.get('/download/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({ error: 'Public ID is required' });
    }

    // Generate a temporary download URL (valid for 1 hour)
    const downloadUrl = cloudinary.url(publicId, {
      resource_type: 'video',
      secure: true,
      sign_url: true,
      type: 'authenticated',
      expires_at: Math.round(Date.now() / 1000) + 3600 // 1 hour
    });

    res.json({ downloadUrl });

  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

/**
 * Get all recordings for a specific session (for both host and participants)
 */
router.get('/session-recordings/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    console.log(`📋 Fetching all recordings for session: ${sessionId}`);

    // Get all final recordings for this session
    const recordings = await FinalRecording.find({
      sessionId
    }).sort({ uploadedAt: -1 }); // Sort by newest first

    console.log(`✅ Found ${recordings.length} recordings for session ${sessionId}`);

    res.json({
      success: true,
      recordings: recordings.map(recording => ({
        id: recording._id,
        sessionId: recording.sessionId,
        participantId: recording.participantId,
        role: recording.role,
        filename: recording.filename,
        displayName: recording.displayName || `${recording.role} Recording`,
        url: recording.url,
        size: recording.size,
        duration: recording.duration,
        format: recording.format,
        uploadedAt: recording.uploadedAt
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching session recordings:', error);
    res.status(500).json({ error: 'Failed to fetch session recordings' });
  }
});

/**
 * Get all recordings for a user (for dashboard)
 */
router.get('/recordings/:participantId', async (req, res) => {
  try {
    const { participantId } = req.params;

    if (!participantId) {
      return res.status(400).json({ error: 'Participant ID is required' });
    }

    console.log(`📋 Fetching recordings for participant: ${participantId}`);

    // Get all final recordings for this participant
    const recordings = await FinalRecording.find({
      participantId
    }).sort({ uploadedAt: -1 }); // Sort by newest first

    console.log(`✅ Found ${recordings.length} recordings for participant ${participantId}`);

    res.json({
      success: true,
      recordings: recordings.map(recording => ({
        id: recording._id,
        sessionId: recording.sessionId,
        role: recording.role,
        filename: recording.filename,
        url: recording.url,
        size: recording.size,
        duration: recording.duration,
        format: recording.format,
        uploadedAt: recording.uploadedAt
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching recordings:', error);
    res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

/**
 * Generate download URL for a recording
 */
router.get('/download/:recordingId', async (req, res) => {
  try {
    const { recordingId } = req.params;

    if (!recordingId) {
      return res.status(400).json({ error: 'Recording ID is required' });
    }

    console.log(`📥 Generating download URL for recording: ${recordingId}`);

    // Find the recording
    const recording = await FinalRecording.findById(recordingId);
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    // Generate Cloudinary download URL with forced attachment
    let downloadUrl = recording.url;
    if (downloadUrl.includes('cloudinary.com')) {
      // Add fl_attachment to force download instead of viewing
      downloadUrl = downloadUrl.replace('/upload/', '/upload/fl_attachment/');
    }

    res.json({
      success: true,
      downloadUrl,
      filename: recording.filename,
      size: recording.size
    });

  } catch (error) {
    console.error('❌ Error generating download URL:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

export default router;
