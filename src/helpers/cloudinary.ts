import { v2 as cloudinary } from 'cloudinary';
import { Request, Response } from 'express';

// Ініціалізація Cloudinary (використовуйте свої ключі)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Функція для завантаження одного зображення
export const uploadImageToCloudinary = async (filePath: string, options = {}): Promise<{ url: string; public_id: string }> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, options);
    return { url: result.secure_url, public_id: result.public_id };
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error.message);
    throw new Error('Failed to upload image');
  }
};


// import { v2 as cloudinary } from 'cloudinary';

// (async function () {

//   // Configuration
//   cloudinary.config({
//     cloud_name: 'dxqlhfkt5',
//     api_key: '939293774914657',
//     api_secret: process.env.API_SECRET
//   });

//   // Upload an image
//   const uploadResult = await cloudinary.uploader
//     .upload(
//       'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
//       public_id: 'shoes',
//     }
//     )
//     .catch((error) => {
//       console.log(error);
//     });

//   console.log(uploadResult);

//   // Optimize delivery by resizing and applying auto-format and auto-quality
//   const optimizeUrl = cloudinary.url('shoes', {
//     fetch_format: 'auto',
//     quality: 'auto'
//   });

//   console.log(optimizeUrl);

//   // Transform the image: auto-crop to square aspect_ratio
//   const autoCropUrl = cloudinary.url('shoes', {
//     crop: 'auto',
//     gravity: 'auto',
//     width: 500,
//     height: 500,
//   });

//   console.log(autoCropUrl);
// })();