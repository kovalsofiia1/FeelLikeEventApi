import { Request, RequestHandler, Response } from 'express';
import Interest from '../models/Interests';

// Create a new interest
export const createInterest: RequestHandler = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name } = req.body;

    // Check if interest already exists
    const existingInterest = await Interest.findOne({ name });
    if (existingInterest) {
      return res.status(400).json({ message: 'Interest already exists' });
    }

    const interest = new Interest({ name });
    await interest.save();
    return res.status(201).json(interest);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all interests
export const getInterests: RequestHandler = async (req: Request, res: Response): Promise<any> => {
  try {
    const interests = await Interest.find();
    return res.status(200).json(interests);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single interest by ID
export const getInterestById: RequestHandler = async (req: Request, res: Response): Promise<any> => {
  try {
    const interest = await Interest.findById(req.params.id);
    if (!interest) {
      return res.status(404).json({ message: 'Interest not found' });
    }
    return res.status(200).json(interest);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update an interest
export const updateInterest: RequestHandler = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name } = req.body;
    const updatedInterest = await Interest.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );

    if (!updatedInterest) {
      return res.status(404).json({ message: 'Interest not found' });
    }
    return res.status(200).json(updatedInterest);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete an interest
export const deleteInterest: RequestHandler = async (req: Request, res: Response): Promise<any> => {
  try {
    const interest = await Interest.findByIdAndDelete(req.params.id);
    if (!interest) {
      return res.status(404).json({ message: 'Interest not found' });
    }
    return res.status(200).json({ message: 'Interest deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export default {
  createInterest,
  getInterests,
  getInterestById, updateInterest, deleteInterest
}