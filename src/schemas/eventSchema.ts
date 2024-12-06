import Joi from 'joi';

export const eventSchema = Joi.object({
  name: Joi.string().min(3).required(),
  description: Joi.string().min(10).required(),
  eventType: Joi.string().valid('conference', 'workshop', 'webinar').required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  location: Joi.string().min(3).required(),
  address: Joi.string().min(3).required(),
  image: Joi.string().uri().required(),
  availableSeats: Joi.number().integer().min(1).required(),
  rating: Joi.number().min(1).max(5).required(),
  customFields: Joi.object().optional(), // Adjust this as needed
});

export const commentSchema = Joi.object({
  text: Joi.string().min(1).required(),
});

export const bookingSchema = Joi.object({
  eventId: Joi.string().hex().length(24).required(), // Assuming ObjectId is used
});

