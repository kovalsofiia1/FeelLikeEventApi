import { Request, RequestHandler, Response } from 'express';
import Event from "../models/Event";
import { EventDocument } from 'types/events/EventTypes';
import mongoose from 'mongoose';
import { isDataURI } from 'class-validator';

export interface UserRequest extends Request {
    user?: {
        id: string,
        email: string
    }
}

const createEvent: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
    const { name, description, eventType, startDate, endDate, location, address, image, availableSeats, rating, customFields } = req.body;

    const userId = req.user?.id;
    try {
        const newEvent = new Event({
            name,
            description,
            eventType,
            startDate,
            endDate,
            location,
            address,
            image,
            availableSeats,
            rating,
            customFields,
            createdBy: userId
        });

        await newEvent.save();
        res.status(201).json({ message: 'Event created successfully', event: newEvent });
    } catch (err: any) {
        res.status(500).json({ message: 'Error creating event', error: err.message });
    }
};

const getAllEvents: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
    try {
        const events = await Event.find()
            // .populate('whoBooked', 'name email')
            // .populate('comments.user', 'name email')
            .exec();

        res.status(200).json(events);

    } catch (err: any) {
        res.status(500).json({ message: 'Error fetching event', error: err.message });
    }
}

const getEventById: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('whoBooked', 'name email')
            .populate('comments.user', 'name email')
            .exec();

        if (!event) {
            res.status(404).json({ message: 'Event not found' });
        } else {
            res.status(200).json(event);
        }
    } catch (err: any) {
        res.status(500).json({ message: 'Error fetching event', error: err.message });
    }
};

const updateEvent: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {

    const { name, description, eventType, startDate, endDate, location, address, image, availableSeats, rating, customFields } = req.body;
    const userId = req.user?.id;
    try {

        const event = await Event.findById(req.params.id);

        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        if (event.createdBy!.toString() !== userId) {
            res.status(403).json({ message: 'You are not authorized to delete this event' });
            return;
        }

        await Event.findByIdAndUpdate(req.params.id, {
            name,
            description,
            eventType,
            startDate,
            endDate,
            location,
            address,
            image,
            availableSeats,
            rating,
            customFields
        }, { new: true });


        res.status(200).json({ message: 'Event updated successfully', event });

    } catch (err: any) {
        res.status(500).json({ message: 'Error updating event', error: err.message });
    }
};

const deleteEvent: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
    try {

        const userId = req.user?.id;

        const event = await Event.findById(req.params.id);

        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        if (event.createdBy!.toString() !== userId) {
            res.status(403).json({ message: 'You are not authorized to delete this event' });
            return;
        }

        await Event.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Event deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ message: 'Error deleting event', error: err.message });
    }
};

const addComment: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
    const eventId = req.params.id;
    const { text } = req.body;
    const userId = req.user?.id;
    try {
        const event = await Event.findById(eventId);
        if (!event) {
            res.status(404).json({ message: 'Event not found' });
        } else {
            const comment = { user: userId, text };
            event.comments.push(comment);
            await event.save();
            res.status(200).json({ message: 'Comment added successfully', event });
        }
    } catch (err: any) {
        res.status(500).json({ message: 'Error adding comment', error: err.message });
    }
};

const deleteComment: RequestHandler = async (req: UserRequest, res: Response) => {
    const { eventId, commentId } = req.params;
    const userId = req.user?.id;

    try {
        // Fetch the event
        const event = await Event.findById(eventId) as EventDocument | null;
        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        // Find the index of the comment
        const commentIndex = event.comments.findIndex((c) => c._id.toString() === commentId);
        if (commentIndex === -1) {
            res.status(404).json({ message: 'Comment not found' });
            return;
        }

        // Authorization check
        if (event.comments[commentIndex].user.toString() !== userId) {
            res.status(403).json({ message: 'You are not authorized to delete this comment' });
            return;
        }

        // Remove the comment from the array
        event.comments.splice(commentIndex, 1);

        // Save the updated event
        await event.save();
        res.status(200).json({ message: 'Comment deleted successfully', event });
    } catch (err: any) {
        res.status(500).json({ message: 'Error deleting comment', error: err.message });
    }
};

//TODO: deal with available sits
//TODO: add number of sits booked by one user
const bookEvent: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
    const eventId = req.params.id;
    const userId = req.user?.id;

    try {
        const event = await Event.findById(eventId);
        if (!event) {
            res.status(404).json({ message: 'Event not found' });
        } else if (event.availableSeats <= 0) {
            res.status(400).json({ message: 'No available seats left' });
        } else {
            event.whoBooked.push(new mongoose.Types.ObjectId(userId));
            event.availableSeats -= 1;
            await event.save();
            res.status(200).json({ message: 'Event booked successfully', event });
        }
    } catch (err: any) {
        res.status(500).json({ message: 'Error booking event', error: err.message });
    }
};


const getBookedUsers: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('whoBooked', 'name email') // Populate with user details
            .exec();

        if (!event) {
            res.status(404).json({ message: 'Event not found' });
        } else {
            res.status(200).json(event.whoBooked); // Return only the booked users
        }
    } catch (err: any) {
        res.status(500).json({ message: 'Error fetching booked users', error: err.message });
    }
};

const deleteBooking: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
    const eventId = req.params.id;
    const userId = new mongoose.Types.ObjectId(req.user?.id);

    try {
        const event = await Event.findById(eventId);

        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        // Check if the user exists in the whoBooked array
        if (!event.whoBooked.includes(userId)) {
            res.status(400).json({ message: 'User has not booked this event' });
            return;
        }

        event.whoBooked = event.whoBooked.filter((bookingUserId) => bookingUserId.toString() !== userId.toString());

        event.availableSeats += 1;

        await event.save();

        res.status(200).json({ message: 'Booking deleted successfully', event });
    } catch (err: any) {
        res.status(500).json({ message: 'Error deleting booking', error: err.message });
    }
};



export default {
    getAllEvents,
    createEvent,
    getEventById,
    addComment,
    bookEvent,
    updateEvent,
    deleteEvent,
    getBookedUsers,
    deleteBooking,
    deleteComment
};
