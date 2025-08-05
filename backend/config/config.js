export const cookieOptions = {
    httpOnly: true,
    secure: true,
    domain: ".finalcast.tech",   // IMPORTANT: subdomain-aware cookie
    sameSite: 'None',            // Required for cross-site requests
    maxAge: 7 * 24 * 60 * 60 * 1000 
}
