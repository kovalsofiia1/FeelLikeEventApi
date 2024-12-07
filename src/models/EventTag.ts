import mongoose, { Document, Schema } from "mongoose";

interface IEventTag extends Document {
  name: string;
}

const EventTagSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
});

export const EventTag = mongoose.model<IEventTag>("EventTag", EventTagSchema);
