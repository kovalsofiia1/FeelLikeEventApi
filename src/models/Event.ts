import mongoose from "mongoose";

import { Document, ObjectId } from "mongoose";

// Interface for the comment sub-document
export interface Comment {
    user: ObjectId; // Reference to the user who posted the comment
    text: string;
    date?: Date; // Optional, defaulted to `Date.now` in schema
}

// Enum for event status
export type EventStatus = 'CREATED' | 'VERIFIED' | 'DECLINED';

// Main event interface
export interface Event extends Document {
    name: string;
    description: string;
    eventType: string;
    startDate: Date;
    endDate: Date;
    location: string;
    address: string;
    image?: string; // Optional
    createdBy: ObjectId; // Reference to the user who created the event
    whoBooked: ObjectId[]; // List of users who booked the event
    totalSeats: number; // Total number of seats for the event
    availableSeats: number; // Available seats remaining
    rating: number; // Range 0-5
    eventStatus: EventStatus; // Enum for event status
    customFields?: Map<string, string>; // Optional custom fields
}


const eventSchema = new mongoose.Schema<Event>({
    name: { type: String, required: true },
    description: { type: String, required: true },
    eventType: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    location: {
        type: String,
        required: true
    },
    address: { type: String, required: true },
    image: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    totalSeats: { type: Number, required: true }, // Total seats
    availableSeats: { type: Number, required: true }, // Available seats
    rating: { type: Number, min: 0, max: 5, default: 0 },
    eventStatus: {
        type: String,
        enum: ['CREATED', 'VERIFIED', 'DECLINED'],
        required: [true, 'Status is required'],
        default: 'CREATED',
    },
    customFields: { type: Map, of: String }
});

export default mongoose.model('Event', eventSchema);
