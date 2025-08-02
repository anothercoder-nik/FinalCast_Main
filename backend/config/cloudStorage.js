/**
 * Cloud Storage Configuration
 * Supports multiple cloud providers: AWS S3, Google Cloud, Cloudinary, and local storage
 */

import AWS from 'aws-sdk';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cloud storage providers enum
export const STORAGE_PROVIDERS = {
  AWS_S3: 'aws_s3',
  GOOGLE_CLOUD: 'google_cloud',
  CLOUDINARY: 'cloudinary',
  LOCAL: 'local'
};

// Get current storage provider from environment
const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || STORAGE_PROVIDERS.LOCAL;

/**
 * AWS S3 Configuration
 * Free tier: 5GB storage, 20,000 GET requests, 2,000 PUT requests per month
 * Cost after free tier: ~$0.023 per GB per month
 */
let s3Client = null;

if (STORAGE_PROVIDER === STORAGE_PROVIDERS.AWS_S3) {
  // Configure AWS
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  });

  s3Client = new AWS.S3();
  
  console.log('📦 AWS S3 storage configured');
}

/**
 * Cloudinary Configuration  
 * Free tier: 25GB storage, 25GB bandwidth per month
 * Great for video processing and optimization
 */
if (STORAGE_PROVIDER === STORAGE_PROVIDERS.CLOUDINARY) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  
  console.log('☁️ Cloudinary storage configured');
}

/**
 * Local Storage Configuration (Development/Fallback)
 */
const uploadsDir = path.join(__dirname, '../../uploads/recordings');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Multer Storage Configuration Factory
 */
export const createStorageConfig = (provider = STORAGE_PROVIDER) => {
  switch (provider) {
    case STORAGE_PROVIDERS.AWS_S3:
      return multerS3({
        s3: s3Client,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        key: (req, file, cb) => {
          const { recordingId, participantId } = req.body;
          const timestamp = Date.now();
          const extension = path.extname(file.originalname);
          const filename = `recordings/${recordingId}/${participantId}_${timestamp}${extension}`;
          cb(null, filename);
        },
        metadata: (req, file, cb) => {
          cb(null, {
            recordingId: req.body.recordingId,
            participantId: req.body.participantId,
            uploadedAt: new Date().toISOString()
          });
        },
        contentType: multerS3.AUTO_CONTENT_TYPE
      });

    case STORAGE_PROVIDERS.LOCAL:
    default:
      return multer.diskStorage({
        destination: (req, file, cb) => {
          const { recordingId } = req.body;
          const recordingDir = path.join(uploadsDir, recordingId);
          
          if (!fs.existsSync(recordingDir)) {
            fs.mkdirSync(recordingDir, { recursive: true });
          }
          
          cb(null, recordingDir);
        },
        filename: (req, file, cb) => {
          const { participantId } = req.body;
          const timestamp = Date.now();
          const extension = path.extname(file.originalname);
          const filename = `${participantId}_${timestamp}${extension}`;
          cb(null, filename);
        }
      });
  }
};

/**
 * File Upload Middleware Factory
 */
export const createUploadMiddleware = (options = {}) => {
  const {
    maxFileSize = 500 * 1024 * 1024, // 500MB default
    allowedMimeTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo', // .avi
      'audio/mp4',
      'audio/mpeg',
      'audio/wav'
    ]
  } = options;

  return multer({
    storage: createStorageConfig(),
    limits: {
      fileSize: maxFileSize
    },
    fileFilter: (req, file, cb) => {
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`), false);
      }
    }
  });
};

/**
 * Cloud Storage Service Class
 */
export class CloudStorageService {
  constructor(provider = STORAGE_PROVIDER) {
    this.provider = provider;
  }

  /**
   * Upload file to cloud storage
   */
  async uploadFile(filePath, destination, metadata = {}) {
    try {
      switch (this.provider) {
        case STORAGE_PROVIDERS.AWS_S3:
          return await this.uploadToS3(filePath, destination, metadata);
        
        case STORAGE_PROVIDERS.CLOUDINARY:
          return await this.uploadToCloudinary(filePath, destination, metadata);
        
        case STORAGE_PROVIDERS.LOCAL:
        default:
          return await this.uploadToLocal(filePath, destination, metadata);
      }
    } catch (error) {
      console.error('❌ Cloud upload failed:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Upload to AWS S3
   */
  async uploadToS3(filePath, destination, metadata) {
    const fileContent = fs.readFileSync(filePath);
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: destination,
      Body: fileContent,
      Metadata: metadata,
      ServerSideEncryption: 'AES256'
    };

    const result = await s3Client.upload(params).promise();
    
    return {
      url: result.Location,
      key: result.Key,
      etag: result.ETag,
      provider: STORAGE_PROVIDERS.AWS_S3
    };
  }

  /**
   * Upload to Cloudinary
   */
  async uploadToCloudinary(filePath, destination, metadata) {
    const result = await cloudinary.uploader.upload(filePath, {
      public_id: destination.replace(/\.[^/.]+$/, ''), // Remove extension
      resource_type: 'video',
      tags: ['recording', metadata.recordingId],
      context: metadata
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      duration: result.duration,
      provider: STORAGE_PROVIDERS.CLOUDINARY
    };
  }

  /**
   * Upload to local storage (development)
   */
  async uploadToLocal(filePath, destination, metadata) {
    const destinationPath = path.join(uploadsDir, destination);
    const destinationDir = path.dirname(destinationPath);
    
    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }
    
    fs.copyFileSync(filePath, destinationPath);
    
    return {
      url: `/uploads/recordings/${destination}`,
      path: destinationPath,
      provider: STORAGE_PROVIDERS.LOCAL
    };
  }

  /**
   * Delete file from cloud storage
   */
  async deleteFile(fileKey) {
    try {
      switch (this.provider) {
        case STORAGE_PROVIDERS.AWS_S3:
          await s3Client.deleteObject({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileKey
          }).promise();
          break;
        
        case STORAGE_PROVIDERS.CLOUDINARY:
          await cloudinary.uploader.destroy(fileKey, { resource_type: 'video' });
          break;
        
        case STORAGE_PROVIDERS.LOCAL:
        default:
          const fullPath = path.join(uploadsDir, fileKey);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
          break;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Cloud delete failed:', error);
      return false;
    }
  }

  /**
   * Get signed URL for private file access (S3 only)
   */
  async getSignedUrl(fileKey, expiresIn = 3600) {
    if (this.provider === STORAGE_PROVIDERS.AWS_S3) {
      return s3Client.getSignedUrl('getObject', {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: fileKey,
        Expires: expiresIn
      });
    }
    
    return null;
  }

  /**
   * Get storage stats
   */
  async getStorageStats() {
    // Implementation depends on provider
    return {
      provider: this.provider,
      totalFiles: 0,
      totalSize: 0
    };
  }
}

// Export singleton instance
export const cloudStorage = new CloudStorageService();

// Export configuration info
export const getStorageConfig = () => ({
  provider: STORAGE_PROVIDER,
  isConfigured: {
    aws_s3: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET_NAME),
    cloudinary: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
    local: true
  }
});

console.log('☁️ Cloud storage system initialized:', getStorageConfig());
