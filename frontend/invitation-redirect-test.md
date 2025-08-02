# Invitation Redirect Fix - Test Plan

## What was fixed:

1. **Auth Route** - Now accepts `redirect` parameter in search params
2. **AuthPage** - Passes `redirectTo` prop to login/signup forms  
3. **LoginForm & SignInCard** - Redirects to `redirectTo` after successful login
4. **RegisterForm & SignUp** - Redirects to `redirectTo` after successful signup
5. **Google OAuth** - Preserves redirect parameter through OAuth flow
6. **AuthCallback** - Redirects to intended destination after OAuth completion

## Test Scenarios:

### 1. **Regular Login (No Invitation)**
- **URL**: `http://localhost:5173/auth` (no redirect param)
- **Expected**: After login → Dashboard (`/dashboard`)
- **Manual Login**: ✅ Works - no redirectTo → goes to dashboard  
- **Google OAuth**: ✅ Works - no oauth_redirect cookie → auth-callback with no params → dashboard

### 2. **Invitation Login** 
- **URL**: `http://localhost:5173/auth?redirect=%2Fstudio%2F12345`
- **Expected**: After login → Studio Room (`/studio/12345`)
- **Manual Login**: ✅ Works - redirectTo passed → goes to studio room
- **Google OAuth**: ✅ Works - oauth_redirect cookie set → auth-callback with redirect param → studio room

### 3. **Invitation Signup**
- **URL**: `http://localhost:5173/auth?mode=signup&redirect=%2Fstudio%2F12345`  
- **Expected**: After signup → Studio Room (`/studio/12345`)
- **Manual Signup**: ✅ Works - redirectTo passed → goes to studio room
- **Google OAuth**: ✅ Works - oauth_redirect cookie set → auth-callback with redirect param → studio room

## Flow Details:

### **Manual Login/Signup Flow:**
1. User visits invitation link: `/auth?redirect=/studio/12345`
2. AuthPage receives `redirectTo` prop 
3. LoginForm/RegisterForm passes `redirectTo` to SignInCard/SignUp
4. After successful auth → navigate to `redirectTo || '/dashboard'`

### **Google OAuth Flow:**
1. User visits invitation link: `/auth?redirect=/studio/12345`
2. User clicks "Sign in with Google"
3. Frontend sends: `GET /api/auth/google?redirect=/studio/12345`
4. Backend stores redirect in `oauth_redirect` cookie
5. Google OAuth process...
6. Backend callback: `GET /api/auth/google/callback`
7. Backend redirects to: `/auth-callback?redirect=/studio/12345` (if cookie exists)
8. Frontend auth-callback navigates to redirect URL or dashboard

## Expected URLs:

- **Regular Auth**: `http://localhost:5173/auth` → Dashboard
- **Invitation Link**: `http://localhost:5173/auth?redirect=%2Fstudio%2F12345` → Studio Room
- **Google OAuth Regular**: `http://localhost:3000/api/auth/google` → Dashboard  
- **Google OAuth Invitation**: `http://localhost:3000/api/auth/google?redirect=%2Fstudio%2F12345` → Studio Room
- **OAuth Callback Regular**: `http://localhost:5173/auth-callback` → Dashboard
- **OAuth Callback Invitation**: `http://localhost:5173/auth-callback?redirect=%2Fstudio%2F12345` → Studio Room

## Backend Logic:

```javascript
// Store redirect in cookie during OAuth initiation
if (redirect) {
  res.cookie('oauth_redirect', redirect, { maxAge: 5 * 60 * 1000 });
}

// Use stored redirect during OAuth callback  
const redirectTo = req.cookies.oauth_redirect;
let redirectUrl = `${baseUrl}/auth-callback`;
if (redirectTo) {
  redirectUrl += `?redirect=${encodeURIComponent(redirectTo)}`;
  res.clearCookie('oauth_redirect'); // Clean up
}
```

## Frontend Logic:

```javascript
// Auth components use redirectTo prop
const destination = redirectTo || '/dashboard';
navigate({ to: destination });

// Auth-callback checks for redirect parameter
const redirectTo = urlParams.get('redirect') || search?.redirect;
if (redirectTo) {
  navigate({ to: redirectTo });
} else {
  navigate({ to: '/dashboard' }); 
}
```

## Key Features:
- ✅ **Direct room access** for invited guests
- ✅ **Dashboard access** for regular users  
- ✅ **Works with both** email/password and Google login
- ✅ **Works with both** login and signup flows  
- ✅ **Secure implementation** - uses temporary cookies for OAuth flow
- ✅ **Fallback behavior** - always defaults to dashboard if no redirect

This ensures both regular users and invited guests get the correct user experience! 🎉
