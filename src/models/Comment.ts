import mongoose, { Document, ObjectId } from "mongoose";

// Interface for the Comment document
export interface Comment extends Document {
  user: ObjectId; // Reference to the user who posted the comment
  text: string;
  date: Date; // Defaulted to `Date.now`
  eventId: ObjectId; // Reference to the event this comment belongs to
}

// Comment schema
const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  date: { type: Date, default: Date.now },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
});

export default mongoose.model<Comment>('Comment', commentSchema);
