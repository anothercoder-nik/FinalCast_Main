import express from "express";
import { 
  logout_user, 
  delete_user, 
  login_user, 
  register_user, 
  google_user, 
  get_current_user,
  setup_2fa,
  enable_2fa,
  disable_2fa,
  get_2fa_status,
  regenerate_backup_codes,
  send_registration_otp,
  verify_registration_otp,
  resend_registration_otp
} from "../controllers/authController.js";
import { authenticateToken } from "../middleware/auth.js";
import passport from "passport";
import { signToken } from "../utils/helper.js";
import { cookieOptions } from "../config/config.js";

const router = express.Router();

// Registration OTP routes
router.post("/registration/send-otp", send_registration_otp);
router.post("/registration/verify-otp", verify_registration_otp);
router.post("/registration/resend-otp", resend_registration_otp);

router.post("/register", register_user);
router.post("/login", login_user);
router.post("/logout", authenticateToken, logout_user);
router.post("/delete", authenticateToken, delete_user);
router.get("/me", authenticateToken, get_current_user);

// 2FA routes
router.get("/2fa/status", authenticateToken, get_2fa_status);
router.post("/2fa/setup", authenticateToken, setup_2fa);
router.post("/2fa/enable", authenticateToken, enable_2fa);
router.post("/2fa/disable", authenticateToken, disable_2fa);
router.post("/2fa/backup-codes", authenticateToken, regenerate_backup_codes);

router.get('/google', google_user);

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/auth` 
  }),
  async (req, res) => {
    try {
      const token = signToken({id: req.user._id});
      res.cookie("accessToken", token, cookieOptions);
      
      // Check for redirect parameter from stored cookie
      const redirectTo = req.cookies.oauth_redirect;
      
      // Clear the redirect cookie
      if (redirectTo) {
        res.clearCookie('oauth_redirect');
      }
      
      // Construct the redirect URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      let redirectUrl;
      
      if (redirectTo) {
        // If there's a redirect (invitation), go directly to the studio room
        redirectUrl = `${baseUrl}${redirectTo}`;
        console.log('🎯 Google OAuth redirecting to invitation:', redirectUrl);
      } else {
        // If no redirect (regular login), go to dashboard
        redirectUrl = `${baseUrl}/dashboard`;
        console.log('🎯 Google OAuth redirecting to dashboard:', redirectUrl);
      }
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Error in Google OAuth callback:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth?error=oauth_failed`);
    }
  }
);

export default router;
