import { Request, Response, NextFunction, RequestHandler } from 'express';
import User from '../models/User';
import HttpErrors from '../helpers/HttpErrors';
import { EventTag } from '../models/EventTag';

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
    console.log(error)
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
  const { name, email, description, phoneNumber, dateOfBirth, avatarURL, interests } = req.body;

  try {

    const tagsProc = interests && JSON.parse(interests)?.map((tag: string) => tag.toLowerCase().trim()) || [];

    if (!Array.isArray(tagsProc)) {
      res.status(400).json({ message: 'Tags must be an array' });
      return;
    }

    const processedTags: string[] = [];

    for (const tag of tagsProc) {
      // Check if the tag exists in the database (case insensitive)
      const existingTag = await EventTag.findOne({ name: tag.toLowerCase() });

      if (existingTag) {
        processedTags.push(existingTag.name as string); // Use the existing tag's ID
      } else {
        // Add the new tag to the database
        const newTag = new EventTag({ name: tag.toLowerCase() });
        await newTag.save();
        processedTags.push(newTag.name as string); // Use the new tag's ID
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user?.id,
      {
        name,
        email,
        description,
        avatarURL,
        phoneNumber,
        dateOfBirth,
        interests: processedTags
      },
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
