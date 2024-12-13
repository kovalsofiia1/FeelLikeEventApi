import Joi from 'joi';
import { EMAIL_PATTERN, NAME_PATTERN, PHONE_PATTERN, USERNAME_PATTERN } from '../helpers/constants';

export const registerSchema = Joi.object({
    firstName: Joi.string().required().pattern(NAME_PATTERN),
    lastName: Joi.string().required().pattern(NAME_PATTERN),
    email: Joi.string().required().pattern(EMAIL_PATTERN),
    password: Joi.string().required().min(6),
});

export const emailSchema = Joi.object({
    email: Joi.string().pattern(EMAIL_PATTERN).required(),
});

export const loginSchema = Joi.object({
    email: Joi.string().required().pattern(EMAIL_PATTERN),
    password: Joi.string().required().min(6),
});

export const profileSchema = Joi.object({
    name: Joi.string()
        .pattern(USERNAME_PATTERN)
        .optional()
        .messages({
            'string.pattern.base': 'Ім\'я має бути від 3 до 30 символів і може містити лише латиницю, цифри та нижнє підкреслення.',
        }),

    email: Joi.string()
        .email()
        .pattern(EMAIL_PATTERN)
        .optional()
        .messages({
            'string.email': 'Невірний формат email.',
            'string.pattern.base': 'Невірний формат email.',
        }),

    description: Joi.string()
        .optional()
        .allow('')
        .messages({
            'string.base': 'Опис має бути рядком.',
        }),

    dateOfBirth: Joi.string()
        .optional()
        .isoDate()
        .messages({
            'string.isoDate': 'Невірний формат дати народження.',
        }),

    phoneNumber: Joi.string()
        .pattern(PHONE_PATTERN)
        .optional()
        .messages({
            'string.pattern.base': 'Невірний формат номера телефону.',
        }),

    interests: Joi.array()
        .items(Joi.string().min(1)) // Array of non-empty strings
        .optional()
        .messages({
            'array.base': 'Інтереси мають бути масивом рядків.',
            'array.items': 'Кожен інтерес має бути рядком.',
        }),

});