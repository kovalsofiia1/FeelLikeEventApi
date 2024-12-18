import mongoose, { Document, Schema } from "mongoose";

interface IComment extends Document {
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  text: string;
  date: Date;
}

const CommentSchema: Schema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  text: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

export const Comment = mongoose.model<IComment>("Comment", CommentSchema);
