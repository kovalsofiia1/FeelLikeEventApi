import express from 'express';
import authMiddleware from 'middleware/auth';
import LikeController from '../controllers/LikeController';
const router = express.Router();

router.post('/:eventId', authMiddleware, LikeController.likeEvent);
router.delete('/:eventId', authMiddleware, LikeController.deleteLike);

export { router as LikeRouter };