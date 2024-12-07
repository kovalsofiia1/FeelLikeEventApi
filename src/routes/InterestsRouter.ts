import express from 'express';
import TagsController from '../controllers/EventTag';
import authMiddleware from 'middleware/auth';

const router = express.Router();

// Create a new interest
router.post('/', authMiddleware, TagsController.addEventTag);

// Get all interests
router.get('/', TagsController.getEventTags);

// Get a single interest by ID
router.get('/:id', TagsController.getEventTagById);

// Update an interest
router.put('/:id', authMiddleware, TagsController.updateTag);

// Delete an interest
router.delete('/:id', authMiddleware, TagsController.deleteTag);

export default router;
