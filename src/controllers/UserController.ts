import { Request, Response, NextFunction, RequestHandler } from 'express';
import User from '../models/User';
import HttpErrors from '../helpers/HttpErrors';
import { EventTag } from 'models/EventTag';

interface UserRequest extends Request {
  user?: {
    id: string,
    email: string,
    status: 'ADMIN' | 'USER' | 'VERIFIED_USER';
  }
}
// Get the currently authenticated user's data
export const getMyData: RequestHandler = async (req: UserRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?.id).select('-password -token -googleId -verified'); // Exclude password from response
    if (!user) {
      return next(new HttpErrors(404, 'User not found'));
    }
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// Get data of any other user by ID
export const getOtherUserData = async (req: UserRequest, res: Response, next: NextFunction) => {
  const { userId } = req.params; // Extract userId from params
  try {
    const user = await User.findById(userId).select('-password -token -googleId -verified'); // Exclude password from response
    if (!user) {
      return next(new HttpErrors(404, 'User not found'));
    }
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// Update the current user's profile
export const updateProfile = async (req: UserRequest, res: Response, next: NextFunction) => {
  const { name, email, profileDescription, avatarURL, interests } = req.body;

  try {

    if (interests && !Array.isArray(interests)) {
      res.status(400).json({ message: 'Tags must be an array' });
      return;
    }

    // Check if tags are provided in the request
    if (interests && interests.length > 0) {
      // Fetch all tags from the database
      const existingTags = await EventTag.find({ '_id': { $in: interests } });
      // Check if all tags in the request exist in the database
      if (existingTags.length !== interests.length) {
        res.status(400).json({ message: 'One or more interests do not exist in the database' });
        return;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user?.id,
      { name, email, profileDescription, avatarURL, interests },
      { new: true, runValidators: true } // Return updated document and run validations
    ).select('-password -token -googleId -verified'); // Exclude password from response

    if (!updatedUser) {
      return next(new HttpErrors(404, 'User not found'));
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
};

// Change a user's status (only accessible by Admin)
export const changeUserStatus = async (req: UserRequest, res: Response, next: NextFunction) => {
  const { userId } = req.params;
  const { status } = req.body;

  if (status && !['ADMIN', 'USER', 'VERIFIED_USER'].includes(status)) {
    return next(new HttpErrors(400, "Invalid status: should be either of ['ADMIN', 'USER', 'VERIFIED_USER']"));
  }

  try {
    // Check if the logged-in user is an Admin
    if (req.user?.status !== 'ADMIN') {
      return next(new HttpErrors(403, 'Forbidden: Only admins can change the status'));
    }

    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return next(new HttpErrors(404, 'User not found'));
    }

    // Update the user's status
    userToUpdate.status = status;
    await userToUpdate.save();

    res.status(200).json({
      message: 'User status updated successfully',
      user: userToUpdate,
    });
  } catch (error) {
    next(error);
  }
};
