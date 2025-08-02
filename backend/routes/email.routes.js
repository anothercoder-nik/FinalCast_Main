import express from 'express';
import { sendRoomInvitation, sendBulkInvitations, testEmailService } from '../controllers/emailController.js';
import { attachuser } from '../utils/attachUser.js';

const router = express.Router();

// Apply authentication middleware to all email routes
router.use(attachuser);

// Check if user is authenticated for protected routes
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required to send invitations'
    });
  }
  next();
};

// Test email service configuration
router.get('/test', testEmailService);

// Send single room invitation
router.post('/send-invitation', requireAuth, sendRoomInvitation);

// Send bulk room invitations
router.post('/send-bulk-invitations', requireAuth, sendBulkInvitations);

export default router;
