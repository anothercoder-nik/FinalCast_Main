export const cookieOptions = {
    httpOnly: true,
    secure: true,                    // Always secure because Render uses HTTPS
    sameSite: 'None',                // Required for cross-origin cookies
    maxAge: 1000 * 60 * 60,          // 1 hour
    domain: '.onrender.com'          // Hardcoded for Render subdomains
};
