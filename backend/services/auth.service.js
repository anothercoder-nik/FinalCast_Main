import { createUser, findUserByEmail, findUserByEmailByPassword } from "../DAO/user.dao.js"
import { signToken } from "../utils/helper.js"
import { verifyTOTP, verifyBackupCode } from "./twoFactor.service.js"


export const registerUser = async (name, email, password) => {
    const user = await findUserByEmail(email)
    if(user) throw new Error("User already exists")
    const newUser = await createUser(name, email, password)
    const token = await signToken({id: newUser._id})
    return {token,user}
}

export const loginUser = async (email, password, twoFactorToken, backupCode) => {
    const user = await findUserByEmailByPassword(email)
    if(!user) throw new Error("Invalid email or password")

    const isPasswordValid = await user.comparePassword(password)
    if(!isPasswordValid) throw new Error("Invalid email or password")

    // Check if 2FA is enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
        // If no 2FA token or backup code provided, require 2FA
        if (!twoFactorToken && !backupCode) {
            return {
                requires2FA: true,
                user: { _id: user._id } // Only return minimal user info
            };
        }

        let is2FAValid = false;

        // Verify 2FA token if provided
        if (twoFactorToken) {
            is2FAValid = verifyTOTP(twoFactorToken, user.twoFactorSecret);
        }

        // Verify backup code if provided and 2FA token failed
        if (!is2FAValid && backupCode && user.backupCodes) {
            is2FAValid = verifyBackupCode(backupCode, user.backupCodes);
            if (is2FAValid) {
                // Save the updated backup codes (with used code marked)
                await user.save();
            }
        }

        if (!is2FAValid) {
            throw new Error("Invalid 2FA token or backup code");
        }
    }

    const token = signToken({id: user._id})
    return {token, user}
}