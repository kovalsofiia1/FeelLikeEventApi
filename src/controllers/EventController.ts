import { Request, RequestHandler, Response } from 'express';
import { Event, EventStatus } from "../models/Event";
import { EventDocument } from 'types/events/EventTypes';
import mongoose from 'mongoose';
import { isDataURI } from 'class-validator';
import { Comment } from 'models/Comment';
import { Booking } from 'models/Booking';
import { EventTag } from 'models/EventTag';

interface UserRequest extends Request {
    user?: {
        id: string,
        email: string,
        status: 'ADMIN' | 'USER' | 'VERIFIED_USER';
    }
}

const createEvent: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
    const { name, description, tags, startDate, endDate, location, images, totalSeats, price, customFields } = req.body;

    const userId = req.user?.id;
    const isUserVerified = req.user?.status === 'VERIFIED_USER';
    try {
        if (tags && !Array.isArray(tags)) {
            res.status(400).json({ message: 'Tags must be an array' });
            return;
        }

        // Check if tags are provided in the request
        if (tags && tags.length > 0) {
            // Fetch all tags from the database
            const existingTags = await EventTag.find({ '_id': { $in: tags } });

            // Check if all tags in the request exist in the database
            if (existingTags.length !== tags.length) {
                res.status(400).json({ message: 'One or more tags do not exist in the database' });
                return;
            }
        }

        const newEvent = new Event({
            name,
            description,
            tags,
            startDate,
            endDate,
            location,
            images,
            availableSeats: totalSeats,
            totalSeats,
            customFields,
            createdBy: userId,
            eventStatus: isUserVerified ? 'VERIFIED' : 'CREATED'
        });

        await newEvent.save();
        res.status(201).json({ message: 'Event created successfully', event: newEvent });
    } catch (err: any) {
        res.status(500).json({ message: 'Error creating event', error: err.message });
    }
};

const getAllEvents: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
    try {
        const events = await Event.find().exec();

        res.status(200).json(events);

    } catch (err: any) {
        res.status(500).json({ message: 'Error fetching event', error: err.message });
    }
}

const getEventById: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
    try {
        const event = await Event.findById(req.params.id).exec();

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

    const { name, description, tags, startDate, endDate, location, images, totalSeats, price, customFields } = req.body;
    const userId = req.user?.id;
    const userIsAdmin = req.user?.status === 'VERIFIED_USER';

    try {

        const event = await Event.findById(req.params.id);

        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        if (event.createdBy!.toString() !== userId || !userIsAdmin) {
            res.status(403).json({ message: 'You are not authorized to delete this event' });
            return;
        }

        if (tags && !Array.isArray(tags)) {
            res.status(400).json({ message: 'Tags must be an array' });
            return;
        }

        // Check if tags are provided in the request
        if (tags && tags.length > 0) {
            // Fetch all tags from the database
            const existingTags = await EventTag.find({ '_id': { $in: tags } });

            // Check if all tags in the request exist in the database
            if (existingTags.length !== tags.length) {
                res.status(400).json({ message: 'One or more tags do not exist in the database' });
                return;
            }
        }


        await Event.findByIdAndUpdate(req.params.id, {
            name,
            description,
            tags,
            startDate,
            endDate,
            location,
            images,
            availableSeats: (event.availableSeats < event.totalSeats ? event.availableSeats : totalSeats),
            totalSeats,
            customFields,
        }, { new: true });


        res.status(200).json({ message: 'Event updated successfully', event });

    } catch (err: any) {
        res.status(500).json({ message: 'Error updating event', error: err.message });
    }
};

const deleteEvent: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
    try {

        const userId = req.user?.id;
        const userIsAdmin = req.user?.status === 'ADMIN';
        const event = await Event.findById(req.params.id);

        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        if (event.createdBy!.toString() !== userId || !userIsAdmin) {
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
            const comment = new Comment({
                userId,
                text,
                eventId,
            });
            await comment.save();
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
        // Check if the event exists
        const event = await Event.findById(eventId);
        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        // Fetch the comment
        const comment = await Comment.findById(commentId);
        if (!comment) {
            res.status(404).json({ message: 'Comment not found' });
            return;
        }

        // Check if the comment belongs to the specified event
        if (comment.eventId.toString() !== eventId) {
            res.status(400).json({ message: 'Comment does not belong to this event' });
            return;
        }

        // Authorization check
        if (comment.userId.toString() !== userId) {
            res.status(403).json({ message: 'You are not authorized to delete this comment' });
            return;
        }

        // Delete the comment
        await Comment.findByIdAndDelete(commentId);

        res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ message: 'Error deleting comment', error: err.message });
    }
};

const bookEvent: RequestHandler = async (req: UserRequest, res: Response) => {
    const { eventId } = req.params;
    const { tickets } = req.body;
    const userId = req.user?.id;

    try {
        // Fetch the event
        const event = await Event.findById(eventId);
        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        // Check if there are enough seats available
        if (event.availableSeats < tickets) {
            res.status(400).json({ message: 'Not enough seats available' });
            return;
        }

        // Create the booking
        const booking = new Booking({
            eventId,
            userId,
            tickets,
        });
        await booking.save();

        // Update the available seats
        event.availableSeats -= tickets;
        await event.save();

        res.status(201).json({ message: 'Booking created successfully', booking });
    } catch (err: any) {
        res.status(500).json({ message: 'Error creating booking', error: err.message });
    }
};

const getBookedUsers: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check if the event exists
        const event = await Event.findById(req.params.id).exec();
        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        // Fetch bookings related to the event
        const bookings = await Booking.find({ eventId: req.params.id })
            .populate('userId', 'name email') // Populate user details
            .exec();

        if (!bookings.length) {
            res.status(404).json({ message: 'No bookings found for this event' });
        } else {
            // Return the list of booked users
            const bookedUsers = bookings.map((booking) => booking.userId);
            res.status(200).json(bookedUsers);
        }
    } catch (err: any) {
        res.status(500).json({ message: 'Error fetching booked users', error: err.message });
    }
};

const deleteBooking: RequestHandler = async (req: UserRequest, res: Response): Promise<any> => {
    const eventId = req.params.eventId;
    const userId = new mongoose.Schema.Types.ObjectId(req.user?.id!);  // User ID from request (assumed to be added by auth middleware)

    try {
        // Find the booking record for the user and event
        const booking = await Booking.findOne({ eventId, userId });

        if (!booking) {
            return res.status(400).json({ message: 'Booking not found for this user and event' });
        }

        // Find the event and update available seats
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        // Delete the booking
        await Booking.deleteOne({ _id: booking._id });

        event.availableSeats += booking.tickets;

        await event.save();

        res.status(200).json({ message: 'Booking deleted successfully', event });
    } catch (err: any) {
        res.status(500).json({ message: 'Error deleting booking', error: err.message });
    }
};


const changeEventStatus = async (eventId: string, status: EventStatus, res: Response) => {
    try {
        const event = await Event.findById(eventId);

        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        // Update the event's status
        event.eventStatus = status;
        await event.save();

        res.status(200).json({ message: `Event status updated to ${status}`, event });
    } catch (err: any) {
        res.status(500).json({ message: 'Error updating event status', error: err.message });
    }
};

// Verify Event Handler
export const verifyEvent: RequestHandler = async (req: UserRequest, res: Response) => {
    const eventId = req.params.id;
    const userIsAdmin = req.user?.status === 'ADMIN';

    if (!userIsAdmin) {
        res.status(403).json({ message: 'You are not authorized to verify events' });
        return;
    }

    await changeEventStatus(eventId, 'VERIFIED', res);
};

// Decline Event Handler
export const declineEvent: RequestHandler = async (req: UserRequest, res: Response) => {
    const eventId = req.params.id;
    const userIsAdmin = req.user?.status === 'ADMIN';

    if (!userIsAdmin) {
        res.status(403).json({ message: 'You are not authorized to decline events' });
        return;
    }

    await changeEventStatus(eventId, 'DECLINED', res);
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
    deleteComment,
    verifyEvent,
    declineEvent
};
