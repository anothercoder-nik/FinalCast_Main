  import EmailService from '../services/email.service.js';
import wrapAsync from '../utils/trycatchwrapper.js';

/**
 * Send room invitation email
 * POST /api/email/send-invitation
 * @body {
 *   guestEmail: string,
 *   guestName?: string,
 *   roomId: string,
 *   roomTitle: string,
 *   customMessage?: string,
 *   scheduledTime?: Date
 * }
 */
export const sendRoomInvitation = wrapAsync(async (req, res) => {
  const {
    guestEmail,
    guestName,
    roomId,
    roomTitle,
    customMessage,
    scheduledTime
  } = req.body;

  // Validate required fields
  if (!guestEmail || !roomId || !roomTitle) {
    return res.status(400).json({
      success: false,
      message: 'Guest email, room ID, and room title are required'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(guestEmail)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email address format'
    });
  }

  // Get host information from authenticated user
  const hostName = req.user?.name || req.user?.displayName || 'FinalCast Host';
  const hostEmail = req.user?.email || process.env.DEFAULT_HOST_EMAIL || 'host@finalcast.com';

  // Generate authentication URL with room redirect
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const authUrl = `${baseUrl}/auth?redirect=${encodeURIComponent(`/studio/${roomId}`)}`;

  const invitationData = {
    guestEmail,
    guestName,
    hostName,
    hostEmail,
    roomId,
    roomTitle,
    customMessage,
    scheduledTime,
    authUrl
  };

  try {
    console.log(`📧 Sending room invitation from ${hostName} to ${guestEmail}`);
    
    const result = await EmailService.sendRoomInvitation(invitationData);
    
    res.json({
      success: true,
      message: 'Invitation sent successfully',
      messageId: result.messageId,
      previewUrl: result.previewUrl // For development testing
    });

  } catch (error) {
    console.error(`❌ Failed to send invitation to ${guestEmail}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to send invitation email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Send bulk invitations to multiple guests
 * POST /api/email/send-bulk-invitations
 * @body {
 *   guests: [{ email: string, name?: string }],
 *   roomId: string,
 *   roomTitle: string,
 *   customMessage?: string,
 *   scheduledTime?: Date
 * }
 */
export const sendBulkInvitations = wrapAsync(async (req, res) => {
  const {
    guests,
    roomId,
    roomTitle,
    customMessage,
    scheduledTime
  } = req.body;

  // Validate required fields
  if (!guests || !Array.isArray(guests) || guests.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Guests array is required and must not be empty'
    });
  }

  if (!roomId || !roomTitle) {
    return res.status(400).json({
      success: false,
      message: 'Room ID and room title are required'
    });
  }

  // Validate each guest email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmails = guests.filter(guest => !emailRegex.test(guest.email));
  
  if (invalidEmails.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email addresses found',
      invalidEmails: invalidEmails.map(g => g.email)
    });
  }

  // Get host information
  const hostName = req.user?.name || req.user?.displayName || 'FinalCast Host';
  const hostEmail = req.user?.email || process.env.DEFAULT_HOST_EMAIL || 'host@finalcast.com';

  // Generate authentication URL
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const authUrl = `${baseUrl}/auth?redirect=${encodeURIComponent(`/studio/${roomId}`)}`;

  const results = [];
  const errors = [];

  // Send invitations sequentially to avoid rate limiting
  for (const guest of guests) {
    const invitationData = {
      guestEmail: guest.email,
      guestName: guest.name,
      hostName,
      hostEmail,
      roomId,
      roomTitle,
      customMessage,
      scheduledTime,
      authUrl
    };

    try {
      console.log(`📧 Sending bulk invitation to ${guest.email}`);
      const result = await EmailService.sendRoomInvitation(invitationData);
      
      results.push({
        email: guest.email,
        success: true,
        messageId: result.messageId
      });

      // Add small delay between emails to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`❌ Failed to send invitation to ${guest.email}:`, error);
      errors.push({
        email: guest.email,
        error: error.message
      });
    }
  }

  const successCount = results.length;
  const errorCount = errors.length;

  res.json({
    success: errorCount === 0,
    message: `Sent ${successCount} invitation(s) successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
    results,
    errors,
    summary: {
      total: guests.length,
      successful: successCount,
      failed: errorCount
    }
  });
});

/**
 * Test email configuration
 * GET /api/email/test
 */
export const testEmailService = wrapAsync(async (req, res) => {
  try {
    await EmailService.testEmailService();
    res.json({
      success: true,
      message: 'Email service is configured and ready'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Email service configuration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
