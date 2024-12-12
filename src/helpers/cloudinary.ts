import { v2 as cloudinary } from 'cloudinary';
import { Request, Response } from 'express';
import fs from 'fs/promises';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImageToCloudinary = async (filePath: string, options = {}): Promise<{ url: string; public_id: string }> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, options);
    await deleteFile(filePath);

    return { url: result.secure_url, public_id: result.public_id };
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error.message);
    throw new Error('Failed to upload image');
  }
};

export async function deleteFile(fileURL) {
  try {
    await fs.unlink(fileURL);
  } catch (error) {
    console.error('Error deleting temp file:', error);
  }
}
