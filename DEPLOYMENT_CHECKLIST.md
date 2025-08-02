# 🚀 FinalCast Deployment Checklist

## ✅ Pre-Deployment Setup

### 1. Environment Variables Updated
- [x] **Frontend .env** - Created with production API URL placeholder
- [x] **Backend .env** - Updated with production URLs and MongoDB Atlas connection

### 2. Key Configuration Changes Needed

#### Frontend (.env):
```bash
# Update this to your actual backend URL
VITE_API_URL=https://your-backend-domain.com
```

#### Backend (.env):
```bash
# Update these to your actual domains
FRONTEND_URL=https://your-frontend-domain.com
BACKEND_URL=https://your-backend-domain.com
GOOGLE_CALLBACK_URL=https://your-backend-domain.com/api/auth/google/callback
```

### 3. Google OAuth Setup
- [ ] Update Google Cloud Console with production callback URL
- [ ] Add production domain to authorized origins
- [ ] Verify `GOOGLE_CALLBACK_URL` matches exactly

### 4. Database
- [x] MongoDB Atlas connection string configured
- [ ] Verify database access from production servers
- [ ] Create production database collections if needed

### 5. Cloudinary Setup
- [x] Cloudinary credentials configured
- [ ] Verify upload permissions work in production

### 6. Email Service
- [x] Gmail SMTP configured
- [ ] Verify email sending works in production environment

## 🚀 Deployment Steps

### Option 1: Railway Deployment
1. **Backend on Railway:**
   ```bash
   # Deploy backend
   railway login
   railway new # Create new project
   railway add # Add backend files
   railway deploy
   ```

2. **Frontend on Vercel:**
   ```bash
   # Deploy frontend
   vercel login
   vercel --prod
   ```

3. **Update Environment Variables:**
   ```bash
   # Backend .env
   FRONTEND_URL=https://your-app.vercel.app
   BACKEND_URL=https://your-backend.up.railway.app
   
   # Frontend .env
   VITE_API_URL=https://your-backend.up.railway.app
   ```

### Option 2: Heroku Deployment
1. **Deploy Backend:**
   ```bash
   heroku create your-backend-app
   git subtree push --prefix=backend heroku master
   ```

2. **Deploy Frontend:**
   ```bash
   heroku create your-frontend-app
   git subtree push --prefix=frontend heroku master
   ```

### Option 3: Custom Server/VPS
1. **Setup Backend:**
   ```bash
   cd backend
   npm install --production
   pm2 start app.js --name "finalcast-backend"
   ```

2. **Setup Frontend:**
   ```bash
   cd frontend
   npm run build
   # Serve dist/ folder with nginx/apache
   ```

## 🔧 Post-Deployment Verification

### Test These Features:
- [ ] User registration with email OTP
- [ ] User login (email/password)
- [ ] Google OAuth login
- [ ] Session creation
- [ ] Joining sessions via invitation links
- [ ] Video/audio streaming
- [ ] Screen sharing
- [ ] Recording functionality
- [ ] YouTube streaming
- [ ] File uploads to Cloudinary

### URLs to Update in Google Cloud Console:
- **Authorized JavaScript origins:**
  - `https://your-frontend-domain.com`
- **Authorized redirect URIs:**
  - `https://your-backend-domain.com/api/auth/google/callback`

## 🚨 Security Considerations

### Before Production:
- [ ] Change JWT_SECRET to a more secure random string
- [ ] Add SESSION_SECRET for cookie security
- [ ] Enable HTTPS on both frontend and backend
- [ ] Configure proper CORS origins
- [ ] Review and secure all API endpoints
- [ ] Enable rate limiting if needed

## 📱 Testing Checklist

### Invitation Flow:
- [ ] Normal user signup → dashboard
- [ ] Normal user login → dashboard  
- [ ] Invitation signup → meeting room
- [ ] Invitation login → meeting room
- [ ] Google OAuth normal → dashboard
- [ ] Google OAuth invitation → meeting room

### WebRTC Features:
- [ ] Video/audio connection between users
- [ ] Screen sharing works
- [ ] Recording saves to Cloudinary
- [ ] Download links work properly

Your app is now ready for deployment! 🎉
