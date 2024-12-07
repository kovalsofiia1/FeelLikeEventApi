import mongoose, { Document, Schema } from "mongoose";

interface IBookmark extends Document {
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  date: Date;
}

const BookmarkSchema: Schema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  date: { type: Date, default: Date.now },
});

export const Bookmark = mongoose.model<IBookmark>("Bookmark", BookmarkSchema);
