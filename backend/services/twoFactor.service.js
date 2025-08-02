import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

/**
 * Generate a 2FA secret for a user
 */
export const generateTwoFactorSecret = (userEmail, appName = 'FinalCast') => {
  const secret = speakeasy.generateSecret({
    name: userEmail,
    issuer: appName,
    length: 32
  });

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url
  };
};

/**
 * Generate QR code for 2FA setup
 */
export const generateQRCode = async (otpauthUrl) => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Verify TOTP token
 */
export const verifyTOTP = (token, secret) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2 // Allow 2 steps before/after current time
  });
};

/**
 * Generate backup codes
 */
export const generateBackupCodes = (count = 8) => {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push({
      code: code,
      used: false
    });
  }
  return codes;
};

/**
 * Verify backup code
 */
export const verifyBackupCode = (providedCode, backupCodes) => {
  const codeIndex = backupCodes.findIndex(
    bc => bc.code === providedCode.toUpperCase() && !bc.used
  );
  
  if (codeIndex !== -1) {
    // Mark code as used
    backupCodes[codeIndex].used = true;
    return true;
  }
  
  return false;
};

/**
 * Check if user has unused backup codes
 */
export const hasUnusedBackupCodes = (backupCodes) => {
  return backupCodes.some(bc => !bc.used);
};
