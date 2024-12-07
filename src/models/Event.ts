import mongoose, { Document, Schema } from "mongoose";

interface IEvent extends Document {
    name: string;
    description: string;
    tags: mongoose.Types.ObjectId[];
    startDate: Date;
    endDate: Date;
    location: string;
    createdBy: mongoose.Types.ObjectId;
    images: string[];
    totalSeats: number;
    availableSeats: number;
    eventStatus: EventStatus;
    price: number;
    customFields: Record<string, any>;
}

export type EventStatus = 'CREATED' | 'VERIFIED' | 'DECLINED';

const EventSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "EventTag" }],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    location: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    images: { type: [String] },
    totalSeats: { type: Number, required: true },
    availableSeats: { type: Number, required: true },
    eventStatus: {
        type: String,
        enum: ['CREATED', 'VERIFIED', 'DECLINED'],
        default: 'CREATED',
    },
    price: { type: Number },
    customFields: { type: Map, of: Schema.Types.Mixed },
});

export const Event = mongoose.model<IEvent>("Event", EventSchema);
