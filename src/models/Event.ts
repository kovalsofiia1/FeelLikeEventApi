import mongoose, { Document, Schema } from "mongoose";

export type AudienceType =
    | 'KIDS'
    | 'TEENS'
    | 'ADULTS'
    | 'SENIORS'
    | 'PROFESSIONALS'
    | 'STUDENTS'
    | 'FAMILIES'
    | 'CORPORATES'
    | 'COMMUNITY'
    | 'GENERAL';

export type EventType =
    | 'CONCERT'
    | 'LECTURE'
    | 'WEBINAR'
    | 'WORKSHOP'
    | 'SEMINAR'
    | 'MEETUP'
    | 'EXHIBITION'
    | 'CONFERENCE'
    | 'FESTIVAL'
    | 'PARTY'
    | 'GALA'
    | 'SPORTS'
    | 'CHARITY';

interface IEvent extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description: string;
    eventType: EventType;
    targetAudience: AudienceType;
    tags: string[];
    startDate: Date;
    endDate: Date;
    isOnline?: string | null;
    location?: {
        country: string;
        city: string;
        address: string;
        place: string;
    };
    createdBy: mongoose.Types.ObjectId;
    images: string[];
    totalSeats: number;
    availableSeats: number;
    eventStatus: EventStatus;
    price: number;
    customFields: Record<string, any>;
}

export type EventStatus = 'CREATED' | 'VERIFIED' | 'DECLINED';

const EventSchema: Schema<IEvent> = new Schema(
    {
        name: { type: String, required: true },
        description: { type: String, required: true },
        targetAudience: {
            type: String,
            enum: [
                'KIDS', 'TEENS', 'ADULTS', 'SENIORS', 'PROFESSIONALS', 'STUDENTS', 'FAMILIES', 'CORPORATES', 'COMMUNITY', 'GENERAL',
            ],
            required: true,
        },
        eventType: {
            type: String,
            enum: [
                'CONCERT', 'LECTURE', 'WEBINAR', 'WORKSHOP', 'SEMINAR', 'MEETUP', 'EXHIBITION', 'CONFERENCE', 'FESTIVAL', 'PARTY', 'GALA', 'SPORTS', 'CHARITY'
            ],
            required: true,
        },
        tags: [{ type: String }],
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        isOnline: { type: String },
        location: {
            country: { type: String, required: false },
            city: { type: String, required: false },
            address: { type: String, required: false },
            place: { type: String, required: false },
        },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        images: { type: [String], default: [] },
        totalSeats: { type: Number, required: true },
        availableSeats: { type: Number, required: true },
        eventStatus: {
            type: String,
            enum: ['CREATED', 'VERIFIED', 'DECLINED'],
            default: 'CREATED',
        },
        price: { type: Number },
        customFields: { type: Map, of: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
);

export const Event = mongoose.model<IEvent>("Event", EventSchema);
