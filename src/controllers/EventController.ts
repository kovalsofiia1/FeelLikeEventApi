import { Request, RequestHandler, Response } from 'express';
import { AudienceType, Event, EventStatus, EventType } from "../models/Event";
import mongoose from 'mongoose';
import { Comment } from '../models/Comment';
import { Booking } from '../models/Booking';
import { EventTag, EventTagI } from '../models/EventTag';
import { Like } from '../models/Like';
import { Bookmark } from '../models/Bookmark';
import { uploadImageToCloudinary } from '../helpers/cloudinary';
import multer from 'multer';

interface UserRequest extends Request {
    files?: Express.Multer.File[];
    user?: {
        id: string,
        email: string,
        status: 'ADMIN' | 'USER' | 'VERIFIED_USER';
    }
}

interface UserRequestWithFiles extends Request {
    files?: Express.Multer.File[];
    user?: {
        id: string,
        email: string,
        status: 'ADMIN' | 'USER' | 'VERIFIED_USER';
    }
}

const getAllEvents: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        // Get pagination parameters (default values)
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const pageSize = Math.max(1, parseInt(req.query.pageSize as string) || 10);
        const skip = (page - 1) * pageSize;

        // Get filter parameters from query (if any)
        const searchQuery = req.query.searchQuery as string || '';
        const timeFilter = req.query.timeFilter as string || '';
        const locationFilters = (req.query.locationFilter as string || '').split(',').filter(Boolean);
        const eventTypeFilters = (req.query.eventType as string || '').split(',').filter(Boolean);
        const targetAudienceFilters = (req.query.targetAudience as string || '').split(',').filter(Boolean);
        const savedOnly = req.query.saved === 'true'; // Check if only saved events are requested

        // Initialize an array to hold all conditions for $and
        const andConditions: any[] = [];

        // Retrieve saved events if requested
        let savedEventIds: string[] = [];
        if (savedOnly) {
            if (!userId) {
                res.status(401).json({ message: 'User must be logged in to view saved events' });
                return;
            }

            // Get saved event IDs for the user
            const savedEvents = await Bookmark.find({ userId }).select('eventId').lean();
            savedEventIds = savedEvents.map((bookmark) => bookmark.eventId.toString());

            if (savedEventIds.length === 0) {
                res.status(200).json({
                    events: [],
                    pagination: { page, pageSize, totalPages: 0, totalEvents: 0 },
                });
                return
            }

            // Add condition to filter only saved events
            andConditions.push({ _id: { $in: savedEventIds } });
        }

        // Filter by search query (event name)
        if (searchQuery) {
            andConditions.push({ name: { $regex: searchQuery, $options: 'i' } });
        }

        // Filter by time (today, future, past)
        if (timeFilter) {
            const now = new Date();
            if (timeFilter === 'today') {
                const startOfDay = new Date(now.setHours(0, 0, 0, 0));
                const endOfDay = new Date(now.setHours(23, 59, 59, 999));
                andConditions.push({ startDate: { $gte: startOfDay, $lte: endOfDay } });
            } else if (timeFilter === 'future') {
                andConditions.push({ startDate: { $gte: now } });
            } else if (timeFilter === 'past') {
                andConditions.push({ startDate: { $lt: now } });
            }
        }

        // Filter by event types
        if (eventTypeFilters.length > 0) {
            andConditions.push({ eventType: { $in: eventTypeFilters } });
        }

        // Filter by target audience
        if (targetAudienceFilters.length > 0) {
            andConditions.push({ targetAudience: { $in: targetAudienceFilters } });
        }

        // Filter by location (online or specific cities)
        if (locationFilters.length > 0) {
            const locationFiltersObj: any[] = [];
            if (locationFilters.includes('online')) {
                locationFiltersObj.push({ isOnline: true });
            }

            const cityFilters = locationFilters.filter(location => location !== 'online');
            if (cityFilters.length > 0) {
                locationFiltersObj.push({ 'location.city': { $in: cityFilters } });
            }

            if (locationFiltersObj.length > 0) {
                andConditions.push({ $or: locationFiltersObj });
            }
        }

        // Combine all conditions into a single filter object
        const filterConditions = andConditions.length > 0 ? { $and: andConditions } : {};

        // Fetch the events with filters, sorted by createdAt (newest first)
        const events = await Event.find(filterConditions)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .exec();

        // Get the total count of filtered events for pagination metadata
        const totalEvents = savedOnly
            ? savedEventIds.length // Use savedEventIds length when filtering saved events
            : await Event.countDocuments(filterConditions);

        res.status(200).json({
            events,
            pagination: {
                page,
                pageSize,
                totalPages: Math.ceil(totalEvents / pageSize),
                totalEvents,
            },
        });
    } catch (err: any) {
        console.error('Error fetching events:', err);
        res.status(500).json({ message: 'Error fetching events', error: err.message });
    }
};


const getEventById: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    try {
        const event = await Event.findById(req.params.id)
            .populate('createdBy', '_id name avatarURL')
            .populate('tags', '_id name')
            .exec();

        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        // Check if the user is logged in
        if (userId) {
            // Fetch liked and saved event IDs for the user
            const like = await Like.findOne({ userId, eventId: event._id }).exec();
            const bookmark = await Bookmark.findOne({ userId, eventId: event._id }).exec();
            const booking = await Booking.findOne({ userId, eventId: event._id }).exec();
            const updatedEvent = {
                ...event.toObject(),
                isLiked: !!like,
                isSaved: !!bookmark,
                booking: booking && {
                    bookingId: booking._id,
                    tickets: booking.tickets
                }
            }
            res.status(200).json(updatedEvent);
        } else {
            // If the user is not logged in, return events without modifications
            res.status(200).json(event);
        }

    } catch (err: any) {
        res.status(500).json({ message: 'Error fetching event', error: err.message });
    }
};

const createEvent: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
    const { name, description, eventType, targetAudience, tags, startDate, endDate, location, totalSeats, isOnline, price, customFields } = req.body;
    const userId = req.user?.id;
    const isUserVerified = req.user?.status === 'VERIFIED_USER';

    console.log('in controller')
    try {

        const locationProc = location ? JSON.parse(location) : '';
        const tagsProc = JSON.parse(tags)?.map((tag: string) => tag.toLowerCase().trim()) || [];

        if (!Array.isArray(tagsProc)) {
            res.status(400).json({ message: 'Tags must be an array' });
            return;
        }

        const processedTags: string[] = [];

        for (const tag of tagsProc) {
            // Check if the tag exists in the database (case insensitive)
            const existingTag = await EventTag.findOne({ name: tag.toLowerCase() });

            if (existingTag) {
                processedTags.push(existingTag.name as string); // Use the existing tag's ID
            } else {
                // Add the new tag to the database
                const newTag = new EventTag({ name: tag.toLowerCase() });
                await newTag.save();
                processedTags.push(newTag.name as string); // Use the new tag's ID
            }
        }

        // Handle file uploads with Cloudinary
        const uploadedImages: string[] = [];
        if (req.files) {
            // Type casting to Express.Multer.File[]
            const files = req.files as unknown as Express.Multer.File[];  // Casting `req.files` to the appropriate type

            for (const file of files) {
                try {
                    // If using multer with disk storage, file.path will exist
                    const uploadResult = await uploadImageToCloudinary(file.path, {
                        folder: 'events', // Optional folder for organization in Cloudinary
                        transformation: { width: 800, height: 600, crop: 'fill' }, // Optional image transformations
                    });
                    uploadedImages.push(uploadResult.url); // Save the URL of the uploaded image
                } catch (error) {
                    res.status(500).json({ message: 'Error uploading image to Cloudinary', error: error.message });
                    return;
                }
            }
        }

        // Створюємо подію
        const newEvent = new Event({
            name,
            description,
            tags: processedTags,
            startDate,
            endDate,
            isOnline,
            eventType,
            price,
            targetAudience,
            location: locationProc,
            images: uploadedImages,
            availableSeats: totalSeats,
            totalSeats,
            customFields,
            createdBy: userId,
            eventStatus: isUserVerified ? 'VERIFIED' : 'CREATED',
        });

        await newEvent.save();
        res.status(201).json({ message: 'Event created successfully', event: newEvent });
    } catch (err: any) {
        res.status(500).json({ message: 'Error creating event', error: err.message });
    }
};

const updateEvent: RequestHandler = async (req: UserRequestWithFiles, res: Response): Promise<void> => {
    const { name, description, eventType, targetAudience, tags, startDate, endDate, location, totalSeats, isOnline, price, customFields } = req.body;
    const userId = req.user?.id;
    const userIsAdmin = req.user?.status === 'ADMIN';

    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        if (event.createdBy!.toString() !== userId && !userIsAdmin) {
            res.status(403).json({ message: 'You are not authorized to update this event' });
            return;
        }

        const locationProc = location ? JSON.parse(location) : undefined;

        const tagsProc = JSON.parse(tags)?.map((tag: string) => tag.toLowerCase().trim()) || [];

        if (!Array.isArray(tagsProc)) {
            res.status(400).json({ message: 'Tags must be an array' });
            return;
        }

        const processedTags: string[] = [];

        for (const tag of tagsProc) {
            // Check if the tag exists in the database (case insensitive)
            const existingTag = await EventTag.findOne({ name: tag.toLowerCase() });

            if (existingTag) {
                processedTags.push(existingTag.name as string); // Use the existing tag's ID
            } else {
                // Add the new tag to the database
                const newTag = new EventTag({ name: tag.toLowerCase() });
                await newTag.save();
                processedTags.push(newTag.name as string); // Use the new tag's ID
            }
        }

        // Handle file uploads with Cloudinary
        const uploadedImages: string[] = []; // Retain existing images
        if (req.files) {

            const files = req.files as unknown as Express.Multer.File[];

            for (const file of files) {
                try {
                    const uploadResult = await uploadImageToCloudinary(file.path, {
                        folder: 'events',
                        transformation: { width: 800, height: 600, crop: 'fill' },
                    });
                    uploadedImages.push(uploadResult.url);
                } catch (error) {
                    res.status(500).json({ message: 'Error uploading image to Cloudinary', error: error.message });
                    return;
                }
            }
        }

        const updatedEvent = await Event.findByIdAndUpdate(req.params.id, {
            name,
            description,
            tags: processedTags,
            startDate,
            endDate,
            isOnline: isOnline ? isOnline : null,
            eventType,
            price,
            targetAudience,
            location: locationProc,
            images: uploadedImages,
            availableSeats: totalSeats - (totalSeats - event.availableSeats),
            totalSeats,
            customFields,
        }, { new: true });

        res.status(200).json({ message: 'Event updated successfully', event: updatedEvent });

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


        console.log(event.createdBy!.toString() !== userId)

        if (event.createdBy!.toString() !== userId && !userIsAdmin) {
            res.status(403).json({ message: 'You are not authorized to delete this event' });
            return;
        }

        await Event.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Event deleted successfully' });
    } catch (err: any) {
        res.status(500).json({ message: 'Error deleting event', error: err.message });
    }
};

const getComments: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
    const eventId = req.params.id;
    try {
        const event = await Event.findById(eventId);
        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        const comments = await Comment.find({ eventId })
            .populate('userId', '_id name email avatarURL')
            .sort({ date: -1 })
            .exec();
        res.status(200).json(comments);

    } catch (err) {
        res.status(500).json({ message: 'Error fetching comments', error: err.message });
    }
}

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
            const populatedComment = await Comment.findById(comment._id)
                .populate('userId', '_id name email avatarURL');
            res.status(200).json({ message: 'Comment added successfully', comment: populatedComment });
        }
    } catch (err: any) {
        res.status(500).json({ message: 'Error adding comment', error: err.message });
    }
};

const deleteComment: RequestHandler = async (req: UserRequest, res: Response) => {
    const { eventId, commentId } = req.params;
    const userId = req.user?.id;

    console.log(eventId, commentId)
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
    const { id } = req.params;
    const tickets = req.body.tickets || 1;
    const userId = req.user?.id;
    const additionalInformation = req.body.additionalInformation;

    try {
        // Fetch the event
        const event = await Event.findById(id);
        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        const exBooking = await Booking.findOne({ eventId: id, userId })

        if (exBooking) {
            res.status(400).json({ message: 'You have already booked this event' });
            return;
        }

        // Check if there are enough seats available
        if (event.availableSeats < tickets) {
            res.status(400).json({ message: 'Not enough seats available' });
            return;
        }

        // Create the booking
        const booking = new Booking({
            eventId: id,
            userId,
            tickets,
            additionalInformation
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

const getBookedUsers: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
    const user = req.user;

    try {
        // Check if the event exists
        const event = await Event.findById(req.params.id).exec();
        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }

        // Authorization check
        if (event.createdBy.toString() !== user?.id && user?.status !== 'ADMIN') {
            res.status(403).json({ message: 'You are not authorized to get users who booked this event!' });
            return;
        }

        // Fetch bookings related to the event
        const bookings = await Booking.find({ eventId: req.params.id })
            .populate('userId', 'name email avatarURL') // Populate user details
            .exec();

        const bookedUsers = bookings.map((booking) => booking.userId);
        res.status(200).json(bookings);
    } catch (err: any) {
        res.status(500).json({ message: 'Error fetching booked users', error: err.message });
    }
};

const deleteBooking: RequestHandler = async (req: UserRequest, res: Response): Promise<any> => {
    const eventId = req.params.id;
    const userId = new mongoose.Types.ObjectId(req.user?.id!);

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

export const getCities: RequestHandler = async (req: Request, res: Response) => {
    try {
        console.log("Fetching all events to extract unique cities...");

        // Retrieve all events from the database
        const events = await Event.find().exec();

        // Use a Set to store unique cities
        const citiesSet = new Set<string>();

        // Iterate over all events and add each city to the Set
        events.forEach((event) => {
            if (event.location && event.location.city) {
                citiesSet.add(event.location.city);
            }
        });

        // Convert the Set to an array and sort alphabetically
        const citiesArray = Array.from(citiesSet).sort();

        // Send the unique cities as a response
        res.status(200).json(citiesArray);
    } catch (err) {
        console.error('Error fetching cities:', err);
        // Return a structured error response
        res.status(500).json({
            message: 'Error fetching cities',
            error: err.message
        });
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
    deleteComment,
    verifyEvent,
    declineEvent,
    getComments,
    getCities
};
