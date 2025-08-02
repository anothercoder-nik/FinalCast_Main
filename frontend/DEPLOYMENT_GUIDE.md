# FinalCast Deployment Guide

## Environment Configuration

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory with these variables:

```bash
# Production API URL (your backend domain)
VITE_API_URL=https://your-backend-domain.com

# YouTube RTMP URL (optional - defaults to YouTube's official RTMP)
VITE_YOUTUBE_RTMP_URL=rtmp://a.rtmp.youtube.com/live2/

# WebRTC STUN Server (optional - defaults to Google's STUN server)
VITE_STUN_SERVER=stun:stun.l.google.com:19302

# WebRTC TURN Server (optional - for better NAT traversal)
VITE_TURN_SERVER=turn:your-turn-server.com:3478
VITE_TURN_USERNAME=your-turn-username
VITE_TURN_CREDENTIAL=your-turn-password
```

### Backend Environment Variables

Create a `.env` file in the `backend/` directory with these variables:

```bash
# Deployment Configuration
NODE_ENV=production
PORT=3000

# CORS & URL Configuration
FRONTEND_URL=https://your-frontend-domain.com
BACKEND_URL=https://your-backend-domain.com

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/finalcast

# Authentication
JWT_SECRET=your-super-secure-jwt-secret
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-backend-domain.com/api/auth/google/callback

# Cloud Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email Service (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@your-domain.com

# Session Configuration
SESSION_SECRET=your-session-secret
```

## Deployment Steps

### 1. Frontend Deployment

```bash
# Build the frontend
cd frontend
npm run build

# Deploy the dist/ folder to your hosting service (Vercel, Netlify, etc.)
```

### 2. Backend Deployment

```bash
# Deploy backend to your server (Railway, Heroku, AWS, etc.)
cd backend
npm install --production
npm start
```

### 3. DNS Configuration

- Point your frontend domain to your frontend hosting service
- Point your backend domain to your backend hosting service
- Ensure CORS is properly configured in the backend

## Automatic Environment Detection

The application automatically detects the environment and uses appropriate URLs:

- **Development**: Uses `http://localhost:3000` for API calls
- **Production**: Uses the configured `VITE_API_URL` or smart domain detection

## Verification

After deployment, verify:

1. ✅ Frontend loads correctly
2. ✅ Socket.IO connection establishes
3. ✅ User authentication works
4. ✅ Session creation/joining works
5. ✅ Media permissions are granted
6. ✅ Video/audio streaming works between participants

## Troubleshooting

### CORS Issues
- Ensure `FRONTEND_URL` in backend matches your frontend domain exactly
- Check that both HTTP and HTTPS protocols are handled correctly

### WebRTC Connection Issues
- Configure TURN servers for better NAT traversal
- Ensure ICE servers are accessible from your deployment

### API Connection Issues
- Verify `VITE_API_URL` points to the correct backend domain
- Check that backend is running and accessible

## Security Considerations

- Use HTTPS for both frontend and backend in production
- Keep JWT secrets secure and rotate regularly
- Configure proper CORS origins
- Use environment variables for all sensitive data
- Enable rate limiting and security headers in production
