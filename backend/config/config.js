export const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 1000 * 60 * 60, // 1 hour
    domain: process.env.NODE_ENV === "production" ? ".onrender.com" : undefined  // <--- Important dynamic check
}
