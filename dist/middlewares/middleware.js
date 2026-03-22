import jwt, {} from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/users.js";
import { generateAccessToken } from "../utils/generateToken.js";
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const getAccessToken = (req) => {
    if (!req.cookies || !req.cookies.accessToken) {
        return null;
    }
    return req.cookies.accessToken;
};
const verifyToken = async (req, res, next) => {
    const token = getAccessToken(req);
    if (!JWT_SECRET) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    // Try access token first
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = {
                userId: decoded.userId || decoded.sub || decoded.id,
                email: decoded.email,
                role: decoded.role,
                ...(decoded.iat !== undefined && { iat: decoded.iat }),
                ...(decoded.exp !== undefined && { exp: decoded.exp }),
            };
            next();
            return;
        }
        catch (_err) {
            // Token expired or invalid — fall through to refresh attempt
        }
    }
    // Try to refresh using refresh token
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken || !JWT_REFRESH_SECRET) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user || user.refreshToken !== refreshToken) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const newAccessToken = generateAccessToken(user._id, user.role);
        res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            maxAge: 15 * 60 * 1000,
        });
        req.user = {
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        };
        next();
    }
    catch (_err) {
        res.status(401).json({ message: "Unauthorized" });
    }
};
export { verifyToken };
//# sourceMappingURL=middleware.js.map