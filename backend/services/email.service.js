import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = null;
    this.setupTransporter();
  }

  /**
   * Setup email transporter based on environment configuration
   */
  setupTransporter() {
    const emailConfig = {
      service: process.env.EMAIL_SERVICE || 'gmail', // gmail, outlook, yahoo, etc.
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    };

    // If no email configuration is provided, use a test account
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️ No email configuration found. Using Ethereal test account for development.');
      this.setupTestAccount();
      return;
    }

    try {
      this.transporter = nodemailer.createTransport(emailConfig);
      console.log('✅ Email service configured successfully');
    } catch (error) {
      console.error('❌ Failed to setup email service:', error);
      this.setupTestAccount();
    }
  }

  /**
   * Setup Ethereal test account for development
   */
  async setupTestAccount() {
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('📧 Using Ethereal test account for email development');
      console.log(`Test email credentials: ${testAccount.user} / ${testAccount.pass}`);
      console.log('View emails at: https://ethereal.email/');
    } catch (error) {
      console.error('❌ Failed to setup test email account:', error);
    }
  }

  /**
   * Send room invitation email to guest
   * @param {Object} invitationData - Invitation details
   * @param {string} invitationData.guestEmail - Guest email address
   * @param {string} invitationData.guestName - Guest name (optional)
   * @param {string} invitationData.hostName - Host name
   * @param {string} invitationData.hostEmail - Host email
   * @param {string} invitationData.roomId - Room ID
   * @param {string} invitationData.roomTitle - Room title
   * @param {string} invitationData.customMessage - Custom message from host
   * @param {Date} invitationData.scheduledTime - Scheduled time (optional)
   * @param {string} invitationData.authUrl - Direct authentication URL
   */
  async sendRoomInvitation(invitationData) {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    const {
      guestEmail,
      guestName,
      hostName,
      hostEmail,
      roomId,
      roomTitle,
      customMessage,
      scheduledTime,
      authUrl
    } = invitationData;

    // Generate the email content
    const emailContent = this.generateInvitationEmail(invitationData);

    const mailOptions = {
      from: `"${hostName}" <${process.env.EMAIL_USER || hostEmail}>`,
      to: guestEmail,
      subject: `🎥 You're invited to join "${roomTitle}" on FinalCast`,
      html: emailContent.html,
      text: emailContent.text,
      replyTo: hostEmail
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Invitation email sent successfully:', info.messageId);
      
      // If using Ethereal, provide preview URL
      if (info.preview) {
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: info.preview ? nodemailer.getTestMessageUrl(info) : null
      };
    } catch (error) {
      console.error('❌ Failed to send invitation email:', error);
      throw new Error(`Failed to send invitation email: ${error.message}`);
    }
  }

  /**
   * Generate HTML and text email content for room invitation
   * @param {Object} invitationData - Invitation details
   * @returns {Object} - HTML and text content
   */
  generateInvitationEmail(invitationData) {
    const {
      guestEmail,
      guestName,
      hostName,
      hostEmail,
      roomId,
      roomTitle,
      customMessage,
      scheduledTime,
      authUrl
    } = invitationData;

    const greeting = guestName ? `Hi ${guestName}` : 'Hi there';
    const timeInfo = scheduledTime ? 
      `<p><strong>⏰ Scheduled for:</strong> ${new Date(scheduledTime).toLocaleString()}</p>` : 
      `<p><strong>🕐 Time:</strong> Join anytime when the host is available</p>`;

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>FinalCast Room Invitation</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
            }
            .container {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 15px;
                padding: 30px;
                color: white;
                text-align: center;
                margin-bottom: 20px;
            }
            .content {
                background: white;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                color: #333;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .subtitle {
                font-size: 16px;
                opacity: 0.9;
                margin-bottom: 20px;
            }
            .room-info {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                border-left: 4px solid #667eea;
            }
            .custom-message {
                background: #e8f4f8;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                border-left: 4px solid #17a2b8;
                font-style: italic;
            }
            .join-button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 25px;
                font-weight: bold;
                margin: 20px 0;
                transition: transform 0.2s;
            }
            .join-button:hover {
                transform: translateY(-2px);
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
            .room-id {
                font-family: 'Courier New', monospace;
                background: #f1f3f4;
                padding: 4px 8px;
                border-radius: 4px;
                color: #d63384;
                font-weight: bold;
            }
            .instructions {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">🎥 FinalCast</div>
            <div class="subtitle">Professional Video Conferencing</div>
        </div>

        <div class="content">
            <h2>${greeting}! 👋</h2>
            
            <p><strong>${hostName}</strong> has invited you to join a video conference session.</p>

            <div class="room-info">
                <h3>📋 Session Details</h3>
                <p><strong>🎬 Room Title:</strong> ${roomTitle}</p>
                <p><strong>🆔 Room ID:</strong> <span class="room-id">${roomId}</span></p>
                ${timeInfo}
                <p><strong>👤 Host:</strong> ${hostName} (${hostEmail})</p>
            </div>

            ${customMessage ? `
            <div class="custom-message">
                <h4>💬 Message from ${hostName}:</h4>
                <p>"${customMessage}"</p>
            </div>
            ` : ''}

            <div style="text-align: center;">
                <a href="${authUrl}" class="join-button">
                    🚀 Join Session Now
                </a>
            </div>

            <div class="instructions">
                <h4>📝 How to join:</h4>
                <ol>
                    <li>Click the "Join Session Now" button above</li>
                    <li>Sign in or create your FinalCast account</li>
                    <li>You'll be automatically redirected to the session</li>
                    <li>Allow camera and microphone permissions when prompted</li>
                </ol>
                
                <p><strong>Alternative:</strong> If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;"><a href="${authUrl}">${authUrl}</a></p>
            </div>

            <p><strong>Need help?</strong> Contact the host at <a href="mailto:${hostEmail}">${hostEmail}</a></p>
        </div>

        <div class="footer">
            <p>This invitation was sent through FinalCast Video Conferencing Platform</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
    </body>
    </html>`;

    const text = `
🎥 FinalCast - Room Invitation

${greeting}!

${hostName} has invited you to join a video conference session.

SESSION DETAILS:
🎬 Room Title: ${roomTitle}
🆔 Room ID: ${roomId}
${scheduledTime ? `⏰ Scheduled for: ${new Date(scheduledTime).toLocaleString()}` : '🕐 Time: Join anytime when the host is available'}
👤 Host: ${hostName} (${hostEmail})

${customMessage ? `
MESSAGE FROM ${hostName.toUpperCase()}:
"${customMessage}"
` : ''}

TO JOIN THE SESSION:
1. Click this link: ${authUrl}
2. Sign in or create your FinalCast account
3. You'll be automatically redirected to the session
4. Allow camera and microphone permissions when prompted

Need help? Contact the host at ${hostEmail}

---
This invitation was sent through FinalCast Video Conferencing Platform
If you didn't expect this invitation, you can safely ignore this email.
`;

    return { html, text };
  }

  /**
   * Send registration OTP email
   * @param {Object} otpData - OTP details
   * @param {string} otpData.email - User email address
   * @param {string} otpData.name - User name (optional)
   * @param {string} otpData.otp - 6-digit OTP code
   * @param {number} otpData.expiresIn - OTP expiry time in minutes
   */
  async sendRegistrationOTP(otpData) {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    const { email, name, otp, expiresIn = 10 } = otpData;

    // Generate the email content
    const emailContent = this.generateOTPEmail(otpData);

    const mailOptions = {
      from: `"FinalCast" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `🔐 Verify your FinalCast account - OTP: ${otp}`,
      html: emailContent.html,
      text: emailContent.text
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Registration OTP email sent successfully:', info.messageId);
      
      // If using Ethereal, provide preview URL
      if (info.preview) {
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: info.preview ? nodemailer.getTestMessageUrl(info) : null
      };
    } catch (error) {
      console.error('❌ Failed to send registration OTP email:', error);
      throw new Error(`Failed to send registration OTP email: ${error.message}`);
    }
  }

  /**
   * Generate HTML and text email content for registration OTP
   * @param {Object} otpData - OTP details
   * @returns {Object} - HTML and text content
   */
  generateOTPEmail(otpData) {
    const { email, name, otp, expiresIn = 10 } = otpData;
    const greeting = name ? `Hi ${name}` : 'Hi there';

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>FinalCast - Verify Your Account</title>
        <style>
            body {
                margin: 0;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .logo {
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .subtitle {
                opacity: 0.9;
                font-size: 16px;
            }
            .content {
                padding: 40px 30px;
                line-height: 1.6;
                color: #333;
            }
            .otp-container {
                background: #f8f9fa;
                border: 2px dashed #667eea;
                border-radius: 12px;
                padding: 30px;
                text-align: center;
                margin: 30px 0;
            }
            .otp-code {
                font-size: 42px;
                font-weight: bold;
                color: #667eea;
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
                margin: 20px 0;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
            }
            .otp-label {
                color: #666;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 10px;
            }
            .expiry-info {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                text-align: center;
            }
            .warning {
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                color: #721c24;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
            .steps {
                background: #e7f3ff;
                border-left: 4px solid #007bff;
                padding: 20px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🎥 FinalCast</div>
                <div class="subtitle">Account Verification</div>
            </div>

            <div class="content">
                <h2>${greeting}! 👋</h2>
                
                <p>Welcome to <strong>FinalCast</strong>! To complete your account registration, please verify your email address using the OTP code below.</p>

                <div class="otp-container">
                    <div class="otp-label">Your Verification Code</div>
                    <div class="otp-code">${otp}</div>
                    <p style="margin: 0; color: #666;">Enter this code in the registration form</p>
                </div>

                <div class="expiry-info">
                    <strong>⏰ Important:</strong> This code will expire in <strong>${expiresIn} minutes</strong>
                </div>

                <div class="steps">
                    <h4>📝 Next steps:</h4>
                    <ol>
                        <li>Return to the FinalCast registration page</li>
                        <li>Enter the 6-digit verification code above</li>
                        <li>Complete your account setup</li>
                        <li>Start hosting and joining video conferences!</li>
                    </ol>
                </div>

                <div class="warning">
                    <strong>🔒 Security Notice:</strong> If you didn't request this verification code, please ignore this email. Someone may have mistakenly entered your email address.
                </div>

                <p>Having trouble? Our support team is here to help you get started with FinalCast.</p>
            </div>

            <div class="footer">
                <p>This verification email was sent by FinalCast</p>
                <p>© 2024 FinalCast - Professional Video Conferencing Platform</p>
            </div>
        </div>
    </body>
    </html>`;

    const text = `
🎥 FinalCast - Account Verification

${greeting}!

Welcome to FinalCast! To complete your account registration, please verify your email address using the verification code below.

VERIFICATION CODE: ${otp}

⏰ IMPORTANT: This code will expire in ${expiresIn} minutes

NEXT STEPS:
1. Return to the FinalCast registration page
2. Enter the 6-digit verification code above
3. Complete your account setup
4. Start hosting and joining video conferences!

🔒 SECURITY NOTICE: If you didn't request this verification code, please ignore this email. Someone may have mistakenly entered your email address.

Having trouble? Our support team is here to help you get started with FinalCast.

---
This verification email was sent by FinalCast
© 2024 FinalCast - Professional Video Conferencing Platform
`;

    return { html, text };
  }

  /**
   * Test email configuration
   */
  async testEmailService() {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email service is ready to send emails');
      return true;
    } catch (error) {
      console.error('❌ Email service verification failed:', error);
      throw error;
    }
  }
}

export default new EmailService();
