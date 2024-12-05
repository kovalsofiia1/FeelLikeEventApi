import jwt from 'jsonwebtoken';
import User from '../models/User';
import HttpErrors from '../helpers/HttpErrors';
import { verifyToken } from 'utils/jwtUtils';

const authMiddleware = async (req, _, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return next(new HttpErrors(401, 'Authorization header missing'));
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

        req.user = {
            id: user._id,
            name: user.name,
            email: user.email,
        };
        next();
    } catch (error) {
        next(error);
    }
};

export default authMiddleware;