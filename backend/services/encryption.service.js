/**
 * Backend Encryption Handler
 * Safely handles encrypted podcast data without being able to decrypt it
 * The server stores encrypted chunks but cannot access the content
 */

import crypto from 'crypto';

class EncryptionHandler {
  constructor() {
    this.encryptedSessions = new Map(); // sessionId -> session metadata
    this.encryptedChunks = new Map(); // chunkId -> encrypted chunk data
  }

  /**
   * Initialize encrypted session (stores metadata only, no encryption keys)
   * @param {Object} sessionData - Session metadata
   */
  initializeEncryptedSession(sessionData) {
    const {
      sessionId,
      hostId,
      hostName,
      participantCount,
      algorithm,
      keyLength,
      createdAt
    } = sessionData;

    // Store only metadata - NO ENCRYPTION KEYS
    const sessionMetadata = {
      sessionId,
      hostId,
      hostName,
      participantCount: participantCount || 0,
      algorithm: algorithm || 'AES-GCM',
      keyLength: keyLength || 256,
      encrypted: true,
      createdAt: createdAt || new Date().toISOString(),
      status: 'active',
      chunkCount: 0,
      totalSize: 0,
      participants: [],
      // NO ENCRYPTION KEYS STORED - this is important for privacy
      note: 'Encryption keys are never stored server-side for complete privacy'
    };

    this.encryptedSessions.set(sessionId, sessionMetadata);
    
    console.log(`🔐 Initialized encrypted session ${sessionId} - keys remain client-side only`);
    
    return {
      success: true,
      sessionId,
      encrypted: true,
      message: 'Encrypted session initialized - server cannot decrypt content'
    };
  }

  /**
   * Store encrypted chunk (server cannot decrypt this data)
   * @param {Object} chunkData - Encrypted chunk data
   */
  storeEncryptedChunk(chunkData) {
    const {
      sessionId,
      chunkId,
      participantId,
      participantName,
      data, // This is encrypted data - server cannot decrypt it
      iv,
      algorithm,
      timestamp,
      originalSize,
      mimeType
    } = chunkData;

    // Validate required fields
    if (!sessionId || !chunkId || !data || !iv) {
      throw new Error('Invalid encrypted chunk data');
    }

    const session = this.encryptedSessions.get(sessionId);
    if (!session) {
      throw new Error('Encrypted session not found');
    }

    // Generate unique storage ID
    const storageId = `${sessionId}_${chunkId}_${Date.now()}`;
    
    // Store encrypted chunk (server cannot decrypt this)
    const encryptedChunk = {
      storageId,
      sessionId,
      chunkId,
      participantId,
      participantName,
      encryptedData: data, // This remains encrypted
      iv, // Initialization vector (safe to store)
      algorithm,
      timestamp: timestamp || Date.now(),
      originalSize,
      encryptedSize: data.length,
      mimeType,
      stored: true,
      note: 'This data is encrypted and cannot be decrypted server-side'
    };

    this.encryptedChunks.set(storageId, encryptedChunk);

    // Update session metadata
    session.chunkCount += 1;
    session.totalSize += data.length;
    session.lastChunkAt = new Date().toISOString();

    console.log(`🔒 Stored encrypted chunk ${chunkId} for session ${sessionId} - server cannot decrypt`);

    return {
      success: true,
      storageId,
      chunkId,
      encrypted: true,
      message: 'Encrypted chunk stored safely - content remains private'
    };
  }

  /**
   * Add participant to encrypted session
   * @param {string} sessionId - Session ID
   * @param {Object} participantData - Participant data (no private keys)
   */
  addEncryptedParticipant(sessionId, participantData) {
    const session = this.encryptedSessions.get(sessionId);
    if (!session) {
      throw new Error('Encrypted session not found');
    }

    const {
      userId,
      userName,
      publicKeyFingerprint, // Only store fingerprint, not actual key
      joinedAt
    } = participantData;

    const participant = {
      userId,
      userName,
      publicKeyFingerprint, // Safe to store - used for verification only
      joinedAt: joinedAt || new Date().toISOString(),
      encrypted: true,
      // NO PRIVATE KEYS OR SESSION KEYS STORED
      note: 'Participant keys remain client-side only'
    };

    // Check if participant already exists
    const existingIndex = session.participants.findIndex(p => p.userId === userId);
    if (existingIndex >= 0) {
      session.participants[existingIndex] = participant;
    } else {
      session.participants.push(participant);
      session.participantCount += 1;
    }

    console.log(`👤 Added encrypted participant ${userName} to session ${sessionId}`);

    return {
      success: true,
      participant,
      message: 'Participant added to encrypted session'
    };
  }

  /**
   * Get encrypted session chunks (returns encrypted data only)
   * @param {string} sessionId - Session ID
   * @param {string} requesterId - ID of user requesting chunks
   */
  getEncryptedChunks(sessionId, requesterId) {
    const session = this.encryptedSessions.get(sessionId);
    if (!session) {
      throw new Error('Encrypted session not found');
    }

    // Verify requester is a participant
    const isParticipant = session.participants.some(p => p.userId === requesterId) || 
                         session.hostId === requesterId;
    
    if (!isParticipant) {
      throw new Error('Access denied - not a session participant');
    }

    // Return encrypted chunks (participant must decrypt client-side)
    const sessionChunks = Array.from(this.encryptedChunks.values())
      .filter(chunk => chunk.sessionId === sessionId)
      .sort((a, b) => a.chunkId - b.chunkId);

    console.log(`📦 Returning ${sessionChunks.length} encrypted chunks for session ${sessionId}`);

    return {
      success: true,
      sessionId,
      chunks: sessionChunks,
      totalChunks: sessionChunks.length,
      encrypted: true,
      message: 'Encrypted chunks returned - decrypt client-side with session key'
    };
  }

  /**
   * Get session metadata (safe to return - no encryption keys)
   * @param {string} sessionId - Session ID
   */
  getSessionMetadata(sessionId) {
    const session = this.encryptedSessions.get(sessionId);
    if (!session) {
      throw new Error('Encrypted session not found');
    }

    // Return safe metadata only
    const metadata = {
      sessionId: session.sessionId,
      hostId: session.hostId,
      hostName: session.hostName,
      participantCount: session.participantCount,
      chunkCount: session.chunkCount,
      totalSize: session.totalSize,
      algorithm: session.algorithm,
      keyLength: session.keyLength,
      encrypted: session.encrypted,
      status: session.status,
      createdAt: session.createdAt,
      lastChunkAt: session.lastChunkAt,
      participants: session.participants.map(p => ({
        userId: p.userId,
        userName: p.userName,
        publicKeyFingerprint: p.publicKeyFingerprint,
        joinedAt: p.joinedAt,
        encrypted: p.encrypted
      })),
      privacy: {
        encryptionKeys: 'Never stored server-side',
        contentAccess: 'Only participants can decrypt',
        serverAccess: 'Cannot decrypt any content'
      }
    };

    return metadata;
  }

  /**
   * End encrypted session
   * @param {string} sessionId - Session ID
   * @param {string} hostId - Host user ID
   */
  endEncryptedSession(sessionId, hostId) {
    const session = this.encryptedSessions.get(sessionId);
    if (!session) {
      throw new Error('Encrypted session not found');
    }

    if (session.hostId !== hostId) {
      throw new Error('Only session host can end encrypted session');
    }

    session.status = 'ended';
    session.endedAt = new Date().toISOString();

    console.log(`🛑 Ended encrypted session ${sessionId} - encrypted data preserved`);

    return {
      success: true,
      sessionId,
      status: 'ended',
      chunkCount: session.chunkCount,
      totalSize: session.totalSize,
      encrypted: true,
      message: 'Encrypted session ended - data remains encrypted'
    };
  }

  /**
   * Delete encrypted session and all chunks (for privacy compliance)
   * @param {string} sessionId - Session ID
   * @param {string} requesterId - ID of user requesting deletion
   */
  deleteEncryptedSession(sessionId, requesterId) {
    const session = this.encryptedSessions.get(sessionId);
    if (!session) {
      throw new Error('Encrypted session not found');
    }

    if (session.hostId !== requesterId) {
      throw new Error('Only session host can delete encrypted session');
    }

    // Delete all chunks for this session
    const deletedChunks = [];
    for (const [storageId, chunk] of this.encryptedChunks.entries()) {
      if (chunk.sessionId === sessionId) {
        this.encryptedChunks.delete(storageId);
        deletedChunks.push(storageId);
      }
    }

    // Delete session metadata
    this.encryptedSessions.delete(sessionId);

    console.log(`🗑️ Deleted encrypted session ${sessionId} and ${deletedChunks.length} chunks`);

    return {
      success: true,
      sessionId,
      deletedChunks: deletedChunks.length,
      message: 'Encrypted session and all data permanently deleted'
    };
  }

  /**
   * Get encryption statistics (for admin dashboard - no sensitive data)
   */
  getEncryptionStats() {
    const totalSessions = this.encryptedSessions.size;
    const totalChunks = this.encryptedChunks.size;
    
    let totalEncryptedSize = 0;
    let activeSessions = 0;
    
    for (const session of this.encryptedSessions.values()) {
      totalEncryptedSize += session.totalSize;
      if (session.status === 'active') {
        activeSessions += 1;
      }
    }

    return {
      totalSessions,
      activeSessions,
      totalChunks,
      totalEncryptedSize,
      encryption: {
        algorithm: 'AES-256-GCM',
        keyStorage: 'Client-side only',
        serverAccess: 'Cannot decrypt content',
        privacyLevel: 'Maximum - End-to-end encrypted'
      },
      privacy: {
        keysStored: 0,
        decryptableContent: 0,
        message: 'All content is encrypted - server cannot access'
      }
    };
  }

  /**
   * Generate integrity hash for encrypted data (for verification)
   * @param {string} encryptedData - Encrypted data
   */
  generateIntegrityHash(encryptedData) {
    return crypto.createHash('sha256').update(encryptedData).digest('hex');
  }

  /**
   * Verify encrypted data integrity
   * @param {string} encryptedData - Encrypted data
   * @param {string} expectedHash - Expected hash
   */
  verifyIntegrity(encryptedData, expectedHash) {
    const actualHash = this.generateIntegrityHash(encryptedData);
    return actualHash === expectedHash;
  }
}

export default new EncryptionHandler();
