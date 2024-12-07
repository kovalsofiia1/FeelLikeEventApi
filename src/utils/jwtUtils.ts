import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.ACCESS_TOKEN_SECRET;

export const generateToken = (email: string, userId) => {
    return jwt.sign({ email, id: userId }, SECRET_KEY, { expiresIn: '24h' });
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, SECRET_KEY);
};
