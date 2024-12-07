import mongoose, { Document, ObjectId, Schema } from "mongoose";

interface IBooking extends Document {
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tickets: number;
  bookedAt: Date;
}

const BookingSchema: Schema = new Schema<IBooking>({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tickets: { type: Number, required: true },
  bookedAt: { type: Date, default: Date.now },
});

export const Booking = mongoose.model<IBooking>("Booking", BookingSchema);
