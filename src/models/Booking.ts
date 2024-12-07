import mongoose, { Document, ObjectId } from "mongoose";

export interface Booking extends Document {
  event: ObjectId; // Reference to the event
  user: ObjectId; // Reference to the user who booked
  tickets: number; // Number of tickets booked
  bookedAt: Date; // Timestamp of the booking
}

const bookingSchema = new mongoose.Schema<Booking>({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tickets: { type: Number, required: true, min: 1 }, // Minimum 1 ticket
  bookedAt: { type: Date, default: Date.now } // Auto-filled with the current date
});

export default mongoose.model<Booking>('Booking', bookingSchema);
