import { Request, Response, NextFunction, RequestHandler } from 'express';
import User from '../models/User';
import HttpErrors from '../helpers/HttpErrors';
import { EventTag } from '../models/EventTag';
import { uploadImageToCloudinary } from 'helpers/cloudinary';

interface UserRequest extends Request {
  user?: {
    id: string,
    email: string,
    status: 'ADMIN' | 'USER' | 'VERIFIED_USER';
  }
}

export const getUsers: RequestHandler = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 6 } = req.query;
    const pageNumber = parseInt(page as string, 10);
    const pageSizeNumber = parseInt(pageSize as string, 10);

    const totalUsers = await User.countDocuments();
    const totalPages = Math.ceil(totalUsers / pageSizeNumber);

    const users = await User.find()
      .sort({ createdAt: -1 }) // Newer users first
      .skip((pageNumber - 1) * pageSizeNumber)
      .limit(pageSizeNumber)
      .select("-password -token -googleId -verified"); // Exclude sensitive fields

    res.status(200).json({
      users,
      pagination: {
        page: pageNumber,
        pageSize: pageSizeNumber,
        totalUsers,
        totalPages,
      },
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    next(new HttpErrors(500, "Failed to fetch users"));
  }
};

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

    // Handle file uploads with Cloudinary
    let newAvatarURL = avatarURL; // Start with the current avatar URL
    if (req.files) {
      // Type casting to Express.Multer.File[]
      const files = req.files as unknown as Express.Multer.File[];  // Casting `req.files` to the appropriate type

      for (const file of files) {
        try {
          // If using multer with disk storage, file.path will exist
          const uploadResult = await uploadImageToCloudinary(file.path, {
            folder: 'avatars', // Optional folder for organization in Cloudinary
            transformation: { width: 200, height: 200, crop: 'fill' }, // Optional image transformations
          });
          newAvatarURL = uploadResult.url; // Save the URL of the uploaded image
        } catch (error) {
          res.status(500).json({ message: 'Error uploading image to Cloudinary', error: error.message });
          return;
        }
      }
    }

    console.log(newAvatarURL)

    const updatedUser = await User.findByIdAndUpdate(
      req.user?.id,
      {
        name,
        email,
        description,
        phoneNumber,
        dateOfBirth,
        interests: processedTags,
        avatarURL: newAvatarURL,
      },
      { new: true, runValidators: true }
    ).select('-password -token -googleId -verified');

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
