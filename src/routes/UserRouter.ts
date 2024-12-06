import AuthController from "controllers/AuthController";
import { getMyData, getOtherUserData, updateProfile, changeUserStatus } from "controllers/UserController";
import express from "express";
import validateBody from "helpers/validateBody";
import authMiddleware from "middleware/auth";
import { profileSchema } from "schemas/userSchemas";

const router = express.Router();

router.patch(
  '/',
  authMiddleware,
  validateBody(profileSchema),
  AuthController.updateProfile
);

// Get logged-in user's data
router.get('/me', authMiddleware, getMyData);

// Get another user's data by ID
router.get('/:userId', getOtherUserData);

// Update logged-in user's profile
router.put('/me', authMiddleware, updateProfile);

// Change another user's status (Admin only)
router.put('/:userId/status', authMiddleware, changeUserStatus);

export default router;
