import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

const eventSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    eventType: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    location: {
        type: String,
        required: true
    },
    address: { type: String, required: true },
    image: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    whoBooked: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    availableSeats: { type: Number, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    comments: [commentSchema],

    customFields: { type: Map, of: String }
});

export default mongoose.model('Event', eventSchema);
