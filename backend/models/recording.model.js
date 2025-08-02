import mongoose from 'mongoose';

const recordingSchema = new mongoose.Schema({
  recordingId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  sessionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Session',
    required: true 
  },
  hostId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  title: { 
    type: String,
    default: function() {
      return `Recording ${new Date().toISOString().split('T')[0]}`;
    }
  },
  status: {
    type: String,
    enum: ['recording', 'processing', 'completed', 'failed'],
    default: 'recording'
  },
  startTime: { 
    type: Date, 
    required: true 
  },
  endTime: { 
    type: Date 
  },
  duration: { 
    type: Number // Duration in milliseconds
  },
  participants: [{
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    userName: { 
      type: String, 
      required: true 
    },
    isHost: { 
      type: Boolean, 
      default: false 
    },
    joinedAt: { 
      type: Date, 
      default: Date.now 
    }
  }],
  files: [{
    participantId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    participantName: { 
      type: String, 
      required: true 
    },
    filename: { 
      type: String, 
      required: true 
    },
    originalName: { 
      type: String, 
      required: true 
    },
    fileSize: { 
      type: Number, 
      required: true 
    },
    duration: { 
      type: Number // Duration in milliseconds
    },
    mimeType: { 
      type: String, 
      required: true 
    },
    cloudUrl: { 
      type: String, 
      required: true 
    },
    thumbnailUrl: { 
      type: String 
    },
    uploadedAt: { 
      type: Date, 
      default: Date.now 
    },
    isHost: { 
      type: Boolean, 
      default: false 
    }
  }],
  settings: {
    videoBitsPerSecond: { 
      type: Number, 
      default: 2500000 
    },
    audioBitsPerSecond: { 
      type: Number, 
      default: 128000 
    },
    videoWidth: { 
      type: Number, 
      default: 1280 
    },
    videoHeight: { 
      type: Number, 
      default: 720 
    },
    frameRate: { 
      type: Number, 
      default: 30 
    },
    mimeType: { 
      type: String, 
      default: 'video/webm;codecs=vp9,opus' 
    }
  },
  metadata: {
    totalFileSize: { 
      type: Number, 
      default: 0 
    },
    fileCount: { 
      type: Number, 
      default: 0 
    },
    processingTime: { 
      type: Number // Time taken to process in milliseconds
    },
    cloudProvider: { 
      type: String, 
      default: 'local' // 'local', 'aws', 'gcp', 'azure'
    }
  },
  isDeleted: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true
});

// Indexes for better query performance
recordingSchema.index({ recordingId: 1 });
recordingSchema.index({ sessionId: 1 });
recordingSchema.index({ hostId: 1 });
recordingSchema.index({ status: 1 });
recordingSchema.index({ createdAt: -1 });
recordingSchema.index({ 'participants.userId': 1 });

// Virtual for formatted duration
recordingSchema.virtual('formattedDuration').get(function() {
  if (!this.duration) return '00:00';
  
  const totalSeconds = Math.floor(this.duration / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

// Update total file size and count when files are added
recordingSchema.pre('save', function(next) {
  if (this.files && this.files.length > 0) {
    this.metadata.fileCount = this.files.length;
    this.metadata.totalFileSize = this.files.reduce((total, file) => total + (file.fileSize || 0), 0);
  }
  next();
});

// Method to add a file to the recording
recordingSchema.methods.addFile = function(fileData) {
  this.files.push(fileData);
  this.metadata.fileCount = this.files.length;
  this.metadata.totalFileSize = this.files.reduce((total, file) => total + (file.fileSize || 0), 0);
  return this.save();
};

// Method to update recording status
recordingSchema.methods.updateStatus = function(status, additionalData = {}) {
  this.status = status;
  
  if (status === 'completed' && !this.endTime) {
    this.endTime = new Date();
    this.duration = this.endTime.getTime() - this.startTime.getTime();
  }

  if (additionalData.processingTime) {
    this.metadata.processingTime = additionalData.processingTime;
  }

  return this.save();
};

// Static method to find recordings by user
recordingSchema.statics.findByUser = function(userId, options = {}) {
  const query = {
    $or: [
      { hostId: userId },
      { 'participants.userId': userId }
    ],
    isDeleted: false
  };

  let mongoQuery = this.find(query)
    .populate('sessionId', 'title roomId')
    .populate('hostId', 'userName email')
    .populate('participants.userId', 'userName email')
    .sort({ createdAt: -1 });

  if (options.limit) {
    mongoQuery = mongoQuery.limit(options.limit);
  }

  if (options.skip) {
    mongoQuery = mongoQuery.skip(options.skip);
  }

  return mongoQuery;
};

// Static method to find recordings by session
recordingSchema.statics.findBySession = function(sessionId) {
  return this.find({ 
    sessionId, 
    isDeleted: false 
  })
  .populate('hostId', 'userName email')
  .populate('participants.userId', 'userName email')
  .sort({ createdAt: -1 });
};

const Recording = mongoose.model('Recording', recordingSchema);

// Recording Chunk Schema for individual video chunks
const recordingChunkSchema = new mongoose.Schema({
  sessionId: { 
    type: String, 
    required: true,
    index: true
  },
  participantId: { 
    type: String, 
    required: true,
    index: true
  },
  role: { 
    type: String, 
    enum: ['host', 'participant'], 
    required: true 
  },
  chunkIndex: { 
    type: Number, 
    required: true 
  },
  publicId: { 
    type: String, 
    required: true,
    unique: true
  },
  url: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Number, 
    required: true 
  },
  size: { 
    type: Number, 
    required: true 
  },
  duration: { 
    type: Number, 
    default: 3 
  },
  processed: { 
    type: Boolean, 
    default: false 
  },
  uploadedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true,
  collection: 'recordingchunks'
});

// Indexes for better query performance
recordingChunkSchema.index({ sessionId: 1, participantId: 1, role: 1 });
recordingChunkSchema.index({ sessionId: 1, chunkIndex: 1 });

const RecordingChunk = mongoose.model('RecordingChunk', recordingChunkSchema);

// Final Recording Schema for complete processed videos
const finalRecordingSchema = new mongoose.Schema({
  sessionId: { 
    type: String, 
    required: true,
    index: true
  },
  participantId: { 
    type: String, 
    required: true,
    index: true
  },
  role: { 
    type: String, 
    enum: ['host', 'participant'], 
    required: true 
  },
  publicId: { 
    type: String, 
    required: true,
    unique: true
  },
  url: { 
    type: String, 
    required: true 
  },
  filename: { 
    type: String, 
    required: true 
  },
  displayName: {
    type: String,
    default: function() {
      return this.role === 'host' ? 'Host Recording' : `${this.participantId} Recording`;
    }
  },
  duration: { 
    type: Number, 
    required: true 
  },
  size: { 
    type: Number, 
    required: true 
  },
  format: { 
    type: String, 
    default: 'webm' 
  },
  totalChunks: { 
    type: Number, 
    default: 0 
  },
  uploadedAt: { 
    type: Date, 
    default: Date.now 
  },
  isDeleted: { 
    type: Boolean, 
    default: false 
  }
}, {
  timestamps: true,
  collection: 'finalrecordings'
});

// Indexes for better query performance
finalRecordingSchema.index({ sessionId: 1 });
finalRecordingSchema.index({ participantId: 1 });
finalRecordingSchema.index({ sessionId: 1, role: 1 });

const FinalRecording = mongoose.model('FinalRecording', finalRecordingSchema);

export { Recording as default, RecordingChunk, FinalRecording };
