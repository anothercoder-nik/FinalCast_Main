import crypto from 'crypto';
import emailService from './email.service.js';

class RegistrationOTPService {
  constructor() {
    // In-memory storage for OTPs (in production, use Redis or database)
    this.otpStore = new Map();
    this.OTP_EXPIRY_MINUTES = 10;
    this.MAX_ATTEMPTS = 3;
  }

  /**
   * Generate a 6-digit OTP code
   * @returns {string} - 6-digit OTP
   */
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Send registration OTP to email
   * @param {string} email - User email
   * @param {string} name - User name (optional)
   * @returns {Object} - Success status and OTP ID
   */
  async sendRegistrationOTP(email, name = null) {
    try {
      // Generate OTP
      const otp = this.generateOTP();
      const otpId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Store OTP data
      this.otpStore.set(otpId, {
        email: email.toLowerCase(),
        otp,
        expiresAt,
        attempts: 0,
        verified: false,
        createdAt: new Date()
      });

      // Send email
      await emailService.sendRegistrationOTP({
        email,
        name,
        otp,
        expiresIn: this.OTP_EXPIRY_MINUTES
      });

      console.log(`✅ Registration OTP sent to ${email}, OTP ID: ${otpId}`);

      return {
        success: true,
        otpId,
        expiresAt,
        message: 'OTP sent successfully'
      };
    } catch (error) {
      console.error('❌ Failed to send registration OTP:', error);
      throw new Error(`Failed to send registration OTP: ${error.message}`);
    }
  }

  /**
   * Verify registration OTP
   * @param {string} otpId - OTP ID
   * @param {string} otp - User-provided OTP
   * @param {string} email - User email (for additional verification)
   * @returns {Object} - Verification result
   */
  verifyRegistrationOTP(otpId, otp, email) {
    const otpData = this.otpStore.get(otpId);

    if (!otpData) {
      return {
        success: false,
        message: 'Invalid or expired OTP session'
      };
    }

    // Check if OTP is expired
    if (new Date() > otpData.expiresAt) {
      this.otpStore.delete(otpId);
      return {
        success: false,
        message: 'OTP has expired. Please request a new one'
      };
    }

    // Check if already verified
    if (otpData.verified) {
      return {
        success: false,
        message: 'OTP has already been used'
      };
    }

    // Check email match
    if (otpData.email !== email.toLowerCase()) {
      return {
        success: false,
        message: 'Email mismatch'
      };
    }

    // Check attempts
    if (otpData.attempts >= this.MAX_ATTEMPTS) {
      this.otpStore.delete(otpId);
      return {
        success: false,
        message: 'Too many failed attempts. Please request a new OTP'
      };
    }

    // Increment attempts
    otpData.attempts++;

    // Verify OTP
    if (otpData.otp !== otp) {
      this.otpStore.set(otpId, otpData);
      const remainingAttempts = this.MAX_ATTEMPTS - otpData.attempts;
      
      if (remainingAttempts === 0) {
        this.otpStore.delete(otpId);
        return {
          success: false,
          message: 'Invalid OTP. Maximum attempts exceeded. Please request a new OTP'
        };
      }
      
      return {
        success: false,
        message: `Invalid OTP. ${remainingAttempts} attempts remaining`
      };
    }

    // OTP is valid
    otpData.verified = true;
    otpData.verifiedAt = new Date();
    this.otpStore.set(otpId, otpData);

    console.log(`✅ Registration OTP verified successfully for ${email}`);

    return {
      success: true,
      message: 'OTP verified successfully',
      email: otpData.email
    };
  }

  /**
   * Resend registration OTP
   * @param {string} otpId - Existing OTP ID
   * @param {string} email - User email
   * @param {string} name - User name (optional)
   * @returns {Object} - New OTP details
   */
  async resendRegistrationOTP(otpId, email, name = null) {
    // Remove old OTP
    this.otpStore.delete(otpId);
    
    // Send new OTP
    return await this.sendRegistrationOTP(email, name);
  }

  /**
   * Clean up expired OTPs (call this periodically)
   */
  cleanupExpiredOTPs() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [otpId, otpData] of this.otpStore.entries()) {
      if (now > otpData.expiresAt) {
        this.otpStore.delete(otpId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired OTPs`);
    }
  }

  /**
   * Get OTP status for debugging
   * @param {string} otpId - OTP ID
   * @returns {Object} - OTP status
   */
  getOTPStatus(otpId) {
    const otpData = this.otpStore.get(otpId);
    
    if (!otpData) {
      return { exists: false };
    }

    return {
      exists: true,
      email: otpData.email,
      expiresAt: otpData.expiresAt,
      attempts: otpData.attempts,
      verified: otpData.verified,
      createdAt: otpData.createdAt,
      isExpired: new Date() > otpData.expiresAt
    };
  }

  /**
   * Delete OTP after successful registration
   * @param {string} otpId - OTP ID
   */
  deleteOTP(otpId) {
    this.otpStore.delete(otpId);
  }
}

// Auto-cleanup expired OTPs every 5 minutes
const registrationOTPService = new RegistrationOTPService();
setInterval(() => {
  registrationOTPService.cleanupExpiredOTPs();
}, 5 * 60 * 1000);

export default registrationOTPService;
