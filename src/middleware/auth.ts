import jwt from 'jsonwebtoken';
import User from '../models/User';
import HttpErrors from '../helpers/HttpErrors';
import { verifyToken } from 'utils/jwtUtils';

const authMiddleware = async (req, _, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return next(new HttpErrors(401, 'Not authorized'));
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
        return next(new HttpErrors(401, 'Invalid token format'));
    }

    try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id);

        if (!user || user.token !== token) {
            throw new HttpErrors(401, 'Invalid token or user not found');
        }

        // Add user details to the request object
        req.user = {
            id: user._id?.toString(),
            email: user.email,
            status: user.status,
        };

        next();
    } catch (error) {
        next(error);
    }
};

export const notStrictAuthMiddleware = async (req, _, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        next();
        return;
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
        next();
        return;
    }

    try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id);

        if (!user || user.token !== token) {
            next();
            return;
        }

        // Add user details to the request object
        req.user = {
            id: user._id?.toString(),
            email: user.email,
            status: user.status,
        };

        next();
    } catch (error) {
        next(error);
    }
};

export default authMiddleware;
