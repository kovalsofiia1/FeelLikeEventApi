import { Request, RequestHandler, Response } from 'express';
import { EventTag } from '../models/EventTag';

interface UserRequest extends Request {
  user?: {
    id: string,
    email: string,
    status: 'ADMIN' | 'USER' | 'VERIFIED_USER';
  }
}

// Create a new interest
export const addEventTag: RequestHandler = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name } = req.body;

    // Check if interest already exists
    const existingInterest = await EventTag.findOne({ name });
    if (existingInterest) {
      return res.status(400).json({ message: 'Interest already exists' });
    }

    const interest = new EventTag({ name });
    await interest.save();
    return res.status(201).json(interest);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all interests
export const getEventTags: RequestHandler = async (req: Request, res: Response): Promise<any> => {
  try {
    const tags = await EventTag.find();
    return res.status(200).json(tags);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single interest by ID
export const getEventTagById: RequestHandler = async (req: Request, res: Response): Promise<any> => {
  try {

    const tag = await EventTag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }
    return res.status(200).json(tag);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update an interest
export const updateTag: RequestHandler = async (req: UserRequest, res: Response): Promise<any> => {
  try {
    const { name } = req.body;
    const user = req.user;
    if (user?.status !== 'ADMIN') {
      return res.status(401).json({ message: 'Not allowed action!' });
    }
    const updatedTag = await EventTag.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );

    if (!updatedTag) {
      return res.status(404).json({ message: 'Tag not found' });
    }
    return res.status(200).json(updatedTag);
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete an interest
export const deleteTag: RequestHandler = async (req: UserRequest, res: Response): Promise<any> => {
  try {
    const user = req.user;
    if (user?.status !== 'ADMIN') {
      return res.status(401).json({ message: 'Not allowed action!' });
    }
    const tag = await EventTag.findByIdAndDelete(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }
    return res.status(200).json({ message: 'Tag deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export default {
  addEventTag,
  getEventTagById,
  getEventTags,
  updateTag,
  deleteTag
}