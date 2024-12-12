import { v2 as cloudinary } from 'cloudinary';
import { Request, Response } from 'express';
import fs from 'fs';

// Ініціалізація Cloudinary (використовуйте свої ключі)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload image to Cloudinary and delete local file
export const uploadImageToCloudinary = async (filePath: string, options = {}): Promise<{ url: string; public_id: string }> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, options);

    // Delete the local file after successful upload to Cloudinary
    await fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting local file:', err.message);
      } else {
        console.log('Local file deleted after upload to Cloudinary');
      }
    });

    return { url: result.secure_url, public_id: result.public_id };
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error.message);
    throw new Error('Failed to upload image');
  }
};

