import mongoose, { Document, Schema } from "mongoose";

interface IBooking extends Document {
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tickets: number;
  additionalInformation: {
    name?: string;
    phoneNumber: string;
    comment?: string;
  }
  bookedAt: Date;
}

const BookingSchema: Schema = new Schema<IBooking>({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tickets: { type: Number, required: true },
  additionalInformation: {
    name: { type: String, required: false },
    phoneNumber: { type: String, required: true },
    comment: { type: String, required: false },
  },
  bookedAt: { type: Date, default: Date.now },
});

export const Booking = mongoose.model<IBooking>("Booking", BookingSchema);
