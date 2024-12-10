import express from "express";
import AuthController from '../controllers/AuthController';
import {
    registerSchema,
    loginSchema,
    emailSchema,
    profileSchema
} from '../schemas/userSchemas';
import validateBody from "../helpers/validateBody";
import authMiddleware from "../middleware/auth";

const router = express.Router();

router.post('/login', validateBody(loginSchema), AuthController.login);
router.post('/register', validateBody(registerSchema), AuthController.register);
router.post('/logout', authMiddleware, AuthController.logout);

export default router;