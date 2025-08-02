import twilio from 'twilio';
import crypto from 'crypto';

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Generate a random 6-digit OTP
 */
export const generateSMSOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Send OTP via SMS using Twilio
 */
export const sendSMSOTP = async (phoneNumber, otp) => {
  try {
    const message = await twilioClient.messages.create({
      body: `Your FinalCast verification code is: ${otp}. Valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    
    return {
      success: true,
      messageId: message.sid
    };
  } catch (error) {
    console.error('SMS sending failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Store OTP in database with expiration
 */
export const storeSMSOTP = async (userId, otp) => {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  
  // Store in database (you'd need to add this to your User model)
  await User.findByIdAndUpdate(userId, {
    smsOTP: otp,
    smsOTPExpires: expiresAt
  });
};

/**
 * Verify SMS OTP
 */
export const verifySMSOTP = async (userId, providedOTP) => {
  const user = await User.findById(userId).select('+smsOTP +smsOTPExpires');
  
  if (!user || !user.smsOTP || !user.smsOTPExpires) {
    return false;
  }
  
  // Check if OTP has expired
  if (new Date() > user.smsOTPExpires) {
    // Clear expired OTP
    user.smsOTP = undefined;
    user.smsOTPExpires = undefined;
    await user.save();
    return false;
  }
  
  // Check if OTP matches
  if (user.smsOTP === providedOTP) {
    // Clear used OTP
    user.smsOTP = undefined;
    user.smsOTPExpires = undefined;
    await user.save();
    return true;
  }
  
  return false;
};
