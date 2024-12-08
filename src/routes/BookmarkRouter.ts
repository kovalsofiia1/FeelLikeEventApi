import express from 'express';
import authMiddleware from 'middleware/auth';
import LikeController from '../controllers/LikeController';
import BookmarkController from 'controllers/BookmarkController';
const router = express.Router();

router.post(':eventId', authMiddleware, BookmarkController.saveEvent);
router.delete(':eventId', authMiddleware, BookmarkController.unsaveEvent);

export { router as BookmarkRouter };