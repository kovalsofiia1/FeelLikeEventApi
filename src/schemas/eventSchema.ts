import { PHONE_PATTERN, URL_PATTERN } from '../helpers/constants';
import Joi from 'joi';

// Define the eventSchema based on your Mongoose model
export const eventSchema = Joi.object({
  name: Joi.string().min(3).required(), // Name of the event (required, min 3 chars)
  description: Joi.string().min(3).required(), // Description of the event (required, min 10 chars)
  startDate: Joi.date().iso().required(), // Start date in ISO format (required)
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(), // End date must be after start date
  isOnline: Joi.string().pattern(URL_PATTERN).optional(),
  location: Joi.string().optional(), // Location is now an object (required)
  totalSeats: Joi.number().integer().min(1).required(), // Total number of seats (required, at least 1)
  price: Joi.number().min(0).required(), // Price (required, must be greater than 0)
  customFields: Joi.object().optional(), // Custom fields (optional, flexible object)
  tags: Joi.string().optional(), // Tags (array of ObjectIds, optional)
  targetAudience: Joi.string()
    .valid(
      'KIDS',
      'TEENS',
      'ADULTS',
      'SENIORS',
      'PROFESSIONALS',
      'STUDENTS',
      'FAMILIES',
      'CORPORATES',
      'COMMUNITY',
      'GENERAL'
    )
    .required(), // Audience type array (required)
  eventType: Joi.string()
    .valid(
      'CONCERT',
      'LECTURE',
      'WEBINAR',
      'WORKSHOP',
      'SEMINAR',
      'MEETUP',
      'EXHIBITION',
      'CONFERENCE',
      'FESTIVAL',
      'PARTY',
      'GALA',
      'SPORTS',
      'CHARITY'
    )
    .required(), // Event type (required)
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
});


export const recommendationRequest = Joi.object({
  ageGroup: Joi.string()
    .valid(
      'KIDS',
      'TEENS',
      'ADULTS',
      'SENIORS',
      'PROFESSIONALS',
      'STUDENTS',
      'FAMILIES',
      'CORPORATES',
      'COMMUNITY',
      'GENERAL',
      ''
    )
    .required(),
  dateOption: Joi.string().valid(
    'TODAY',
    "TOMORROW",
    "THIS_WEEK",
    "SPECIFIC_DATE",
    ""
  ).required(),
  mood: Joi.string().valid(
    'HAPPY',
    "NEUTRAL",
    "SAD",
    ""
  ).required(),
  location: Joi.string().required(),
  online: Joi.boolean().required(),
  specific_date: Joi.date().iso().allow(null),
  priceOption: Joi.string().valid("FREE", "PAID", "").required()
});