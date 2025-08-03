export const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 1000 * 60 * 60,
    domain: process.env.NODE_ENV === "production" ? ".onrender.com" : undefined  // <-- Only if frontend & backend are on subdomains of onrender.com
}
