// Cookie Test Endpoint - Add this to your backend for testing
app.get('/api/test-cookies', (req, res) => {
  console.log('🍪 Cookie Test Endpoint Hit');
  console.log('📋 Request Headers:', {
    origin: req.get('Origin'),
    userAgent: req.get('User-Agent'),
    cookie: req.get('Cookie')
  });
  
  console.log('🔑 Parsed Cookies:', req.cookies);
  
  // Set a test cookie
  res.cookie('testCookie', 'testValue', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    maxAge: 60000 // 1 minute
  });
  
  res.json({
    message: 'Cookie test endpoint',
    environment: process.env.NODE_ENV,
    receivedCookies: req.cookies,
    corsOrigin: req.get('Origin'),
    timestamp: new Date().toISOString()
  });
});

// Add this before your existing routes in app.js
