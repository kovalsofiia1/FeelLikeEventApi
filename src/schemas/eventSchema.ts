import { PHONE_PATTERN } from '../helpers/constants';
import Joi from 'joi';

// Define the eventSchema based on your Mongoose model
export const eventSchema = Joi.object({
  name: Joi.string().min(3).required(),  // Name of the event (required, min 3 chars)
  description: Joi.string().min(10).required(),  // Description of the event (required, min 10 chars)
  startDate: Joi.date().iso().required(),  // Start date in ISO format (required)
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),  // End date must be after start date
  location: Joi.string().min(3).required(),  // Location (required, min 3 chars)
  images: Joi.array().items(Joi.string().uri()).optional(),  // Array of image URLs (optional)
  totalSeats: Joi.number().integer().min(1).required(),  // Total number of seats (required, at least 1) 
  price: Joi.number().greater(0).required(),  // Price (required, must be greater than 0)
  customFields: Joi.object().optional(),  // Custom fields (optional, flexible object)
  tags: Joi.array().items(Joi.string().hex().length(24)).optional(),  // Tags (array of ObjectIds, optional)
});

export const commentSchema = Joi.object({
  text: Joi.string().min(1).required(),  // Comment text (required, min 1 char)
});

export const bookingSchema = Joi.object({
  tickets: Joi.number().integer().min(1).required(),
  additionalInformation: Joi.object({
    name: Joi.string().optional(),
    phoneNumber: Joi.string().pattern(PHONE_PATTERN).required(),
    comment: Joi.string().optional(),
  }).required(),
  bookedAt: Joi.date().default(Date.now),
});