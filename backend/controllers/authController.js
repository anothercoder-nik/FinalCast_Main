import { cookieOptions } from "../config/config.js";
import { loginUser, registerUser } from "../services/auth.service.js";
import wrapAsync from "../utils/trycatchwrapper.js";
import User from "../models/user.model.js";
import passport from "passport";
import { 
  generateTwoFactorSecret, 
  generateQRCode, 
  verifyTOTP, 
  generateBackupCodes,
  verifyBackupCode 
} from "../services/twoFactor.service.js";
import { signToken } from "../utils/helper.js";
import registrationOTPService from "../services/registrationOtp.service.js";

// Send Registration OTP
export const send_registration_otp = wrapAsync(async (req, res) => {
  const { email, name, redirectTo } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  // Check if email is already registered
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({ message: "Email is already registered" });
  }

  try {
    const result = await registrationOTPService.sendRegistrationOTP(email, name);
    
    res.status(200).json({
      message: "OTP sent successfully",
      otpId: result.otpId,
      expiresAt: result.expiresAt,
      email: email.toLowerCase(),
      redirectTo: redirectTo || null // Pass through redirect parameter
    });
  } catch (error) {
    console.error('Error sending registration OTP:', error);
    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
});

// Verify Registration OTP
export const verify_registration_otp = wrapAsync(async (req, res) => {
  const { otpId, otp, email, redirectTo } = req.body;

  if (!otpId || !otp || !email) {
    return res.status(400).json({ message: "OTP ID, OTP code, and email are required" });
  }

  try {
    const isValid = await registrationOTPService.verifyRegistrationOTP(otpId, otp, email);
    
    if (isValid) {
      res.status(200).json({
        message: "Email verified successfully",
        verified: true,
        redirectTo: redirectTo || null // Pass through redirect parameter
      });
    } else {
      res.status(400).json({
        message: "Invalid or expired OTP",
        verified: false
      });
    }
  } catch (error) {
    console.error('Error verifying registration OTP:', error);
    res.status(500).json({ message: "Failed to verify OTP. Please try again." });
  }
});

// Resend Registration OTP
export const resend_registration_otp = wrapAsync(async (req, res) => {
  const { otpId, email, name, redirectTo } = req.body;

  if (!otpId || !email) {
    return res.status(400).json({ message: "OTP ID and email are required" });
  }

  // Check if email is already registered
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return res.status(400).json({ message: "Email is already registered" });
  }

  try {
    const result = await registrationOTPService.resendRegistrationOTP(otpId, email, name);
    
    res.status(200).json({
      message: "New OTP sent successfully",
      otpId: result.otpId,
      expiresAt: result.expiresAt,
      email: email.toLowerCase(),
      redirectTo: redirectTo || null // Pass through redirect parameter
    });
  } catch (error) {
    console.error('Error resending registration OTP:', error);
    res.status(500).json({ message: "Failed to resend OTP. Please try again." });
  }
});

export const register_user = wrapAsync( async (req, res) => {
    const {name, email, password, otpId, redirectTo} = req.body
    
    // Verify that OTP was verified before allowing registration
    if (!otpId) {
        return res.status(400).json({ message: "Email verification required" });
    }
    
    const otpStatus = registrationOTPService.getOTPStatus(otpId);
    if (!otpStatus.exists || !otpStatus.verified || otpStatus.email !== email.toLowerCase()) {
        return res.status(400).json({ message: "Invalid or unverified email verification" });
    }
    
    const {token,user} = await registerUser(name, email, password)
    
    // Clean up the OTP after successful registration
    registrationOTPService.deleteOTP(otpId);
    
    req.user = user
    res.cookie("accessToken", token, cookieOptions)
    
    // Handle invitation redirect
    if (redirectTo) {
        res.status(200).json({
            user: user,
            message: "register success",
            redirectTo: redirectTo
        });
    } else {
        res.status(200).json({
            user: user,
            message: "register success"
        });
    }
})

export const login_user = wrapAsync( async (req, res) => {
    const {email, password, twoFactorToken, backupCode, redirectTo} = req.body
    const {token, user, requires2FA} = await loginUser(email, password, twoFactorToken, backupCode)
    
    if (requires2FA) {
        return res.status(200).json({
            requires2FA: true,
            message: "2FA verification required",
            tempUserId: user._id, // Temporary identifier for 2FA verification
            redirectTo: redirectTo // Pass redirect through 2FA flow
        });
    }
    
    req.user = user
    res.cookie("accessToken", token, cookieOptions)
    
    // Handle invitation redirect
    if (redirectTo) {
        res.status(200).json({
            user: user,
            message: "login success",
            redirectTo: redirectTo
        });
    } else {
        res.status(200).json({
            user: user,
            message: "login success"
        });
    }
})
export const logout_user = wrapAsync( async (req, res) => {
    res.clearCookie("accessToken", cookieOptions)
    res.status(200).json({message:"logout success"})
})

export const delete_user = wrapAsync(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  
  const { _id } = req.user; // Use _id instead of id
  await User.findByIdAndDelete(_id);
  res.clearCookie("accessToken", cookieOptions);
  res.status(200).json({ message: "User deleted successfully" });
});



export const get_current_user = wrapAsync(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  
  res.status(200).json(req.user);
});

export const google_user = wrapAsync(async (req, res, next) => {
  // Store redirect parameter in session or as state parameter
  const redirectTo = req.query.redirect;
  if (redirectTo) {
    res.cookie('oauth_redirect', redirectTo, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000 // 10 minutes
    });
  }
  
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// 2FA Setup - Generate secret and QR code
export const setup_2fa = wrapAsync(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.twoFactorEnabled) {
    return res.status(400).json({ message: "2FA is already enabled" });
  }

  const { secret, otpauthUrl } = generateTwoFactorSecret(user.email, 'FinalCast');
  const qrCode = await generateQRCode(otpauthUrl);

  // Store secret temporarily (not enabled yet)
  user.twoFactorSecret = secret;
  await user.save();

  res.status(200).json({
    secret,
    qrCode,
    message: "Scan the QR code with your authenticator app"
  });
});

// 2FA Enable - Verify setup and enable 2FA
export const enable_2fa = wrapAsync(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: "2FA token is required" });
  }

  const user = await User.findById(req.user._id).select('+twoFactorSecret');
  if (!user || !user.twoFactorSecret) {
    return res.status(400).json({ message: "2FA setup not initiated" });
  }

  const isValid = verifyTOTP(token, user.twoFactorSecret);
  if (!isValid) {
    return res.status(400).json({ message: "Invalid 2FA token" });
  }

  // Generate backup codes
  const backupCodes = generateBackupCodes();

  // Enable 2FA
  user.twoFactorEnabled = true;
  user.backupCodes = backupCodes;
  await user.save();

  res.status(200).json({
    message: "2FA enabled successfully",
    backupCodes: backupCodes.map(bc => bc.code)
  });
});

// 2FA Disable
export const disable_2fa = wrapAsync(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  const { password, token } = req.body;
  if (!password) {
    return res.status(400).json({ message: "Password is required to disable 2FA" });
  }

  const user = await User.findById(req.user._id).select('+password +twoFactorSecret');
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: "Invalid password" });
  }

  // If 2FA is enabled, verify token
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!token) {
      return res.status(400).json({ message: "2FA token is required" });
    }
    
    const isValid = verifyTOTP(token, user.twoFactorSecret);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid 2FA token" });
    }
  }

  // Disable 2FA
  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  user.backupCodes = [];
  await user.save();

  res.status(200).json({
    message: "2FA disabled successfully"
  });
});

// Get 2FA Status
export const get_2fa_status = wrapAsync(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.status(200).json({
    twoFactorEnabled: user.twoFactorEnabled,
    hasBackupCodes: user.backupCodes && user.backupCodes.length > 0,
    unusedBackupCodes: user.backupCodes ? user.backupCodes.filter(bc => !bc.used).length : 0
  });
});

// Regenerate Backup Codes
export const regenerate_backup_codes = wrapAsync(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ message: "Password is required" });
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!user.twoFactorEnabled) {
    return res.status(400).json({ message: "2FA is not enabled" });
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: "Invalid password" });
  }

  // Generate new backup codes
  const backupCodes = generateBackupCodes();
  user.backupCodes = backupCodes;
  await user.save();

  res.status(200).json({
    message: "Backup codes regenerated successfully",
    backupCodes: backupCodes.map(bc => bc.code)
  });
});

