import express from 'express';
import InterestController from '../controllers/InterestController';

const router = express.Router();

// Create a new interest
router.post('/', InterestController.createInterest);

// Get all interests
router.get('/', InterestController.getInterests);

// Get a single interest by ID
router.get('/:id', InterestController.getInterestById);

// Update an interest
router.put('/:id', InterestController.updateInterest);

// Delete an interest
router.delete('/:id', InterestController.deleteInterest);

export default router;
