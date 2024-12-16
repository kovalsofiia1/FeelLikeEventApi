declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                status: 'ADMIN' | 'USER' | 'VERIFIED_USER';
            };
        }
    }
}