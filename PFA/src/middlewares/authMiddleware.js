import jwt from 'jsonwebtoken';
import {logger} from "../utils/logger.js";

export const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided' });
        }

        // Check if JWT_SECRET exists
        if (!process.env.JWT_SECRET) {
            logger.error('[JWT_SECRET] JWT_SECRET is not defined in environment variables');
            return res.status(500).json({ message: 'Internal server error' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Structure user object consistently
        req.user = {
            id: decoded.id,
            email: decoded.email,
            companyName: decoded.companyName || null,
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            logger.warn('[AUTH_SERVICE] Token expired', { error: error.message });
            return res.status(401).json({ message: 'Token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            logger.warn('[AUTH_SERVICE] Invalid token', { error: error.message });
            return res.status(401).json({ message: 'Invalid token' });
        }
        logger.error('[AUTH_SERVICE] Authentication error: ', { error });
        return res.status(401).json({ message: 'Authentication failed' });
    }
};