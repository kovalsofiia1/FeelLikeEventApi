import { getMyData, getOtherUserData, updateProfile, changeUserStatus } from "../controllers/UserController";
import express from "express";
import authMiddleware from "../middleware/auth";
import { profileSchema } from "../schemas/userSchemas";
import validateBody from "../helpers/validateBody";
import upload from "../middleware/upload";

const router = express.Router();

// Get logged-in user's data
router.get('/me', authMiddleware, getMyData);

// Get another user's data by ID
router.get('/:userId', getOtherUserData);

// Update logged-in user's profile
router.put('/me', authMiddleware, upload.array('avatars', 1), validateBody(profileSchema), updateProfile);

// Change another user's status (Admin only)
router.patch('/:userId/status', authMiddleware, changeUserStatus);

export default router;
