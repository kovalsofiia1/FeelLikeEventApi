import { Document, Types } from "mongoose";

export interface Comment {
    date: Date;
    text: string;
    user: Types.ObjectId;
}

export interface EventDocument extends Document {
    name: string;
    description: string;
    eventType: string;
    startDate: Date;
    endDate: Date;
    location: string;
    address: string;
    whoBooked: Types.ObjectId[];
    comments: Types.DocumentArray<Comment>;
}