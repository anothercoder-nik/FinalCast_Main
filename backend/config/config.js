export const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // None for cross-origin in production
    maxAge: 1000 * 60 * 60, // 1 hour
    // Domain setting for cross-subdomain cookies (if needed)
    // domain: process.env.NODE_ENV === "production" ? ".onrender.com" : undefined
}