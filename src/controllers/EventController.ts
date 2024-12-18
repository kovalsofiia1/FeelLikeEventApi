import { Request, RequestHandler, Response, Express } from 'express';
import { Event, EventStatus } from "../models/Event";
import mongoose, { SortOrder } from 'mongoose';
import { Comment } from '../models/Comment';
import { Booking } from '../models/Booking';
import { EventTag } from '../models/EventTag';
import { Like } from '../models/Like';
import { Bookmark } from '../models/Bookmark';
import { uploadImageToCloudinary } from '../helpers/cloudinary';
import { evaluateEvent } from '../helpers/evaluateEvents';

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

        const locationFilters = (req.query.locationFilter as string || '').split(',').filter(Boolean);
        const eventTypeFilters = (req.query.eventType as string || '').split(',').filter(Boolean);
        const targetAudienceFilters = (req.query.targetAudience as string || '').split(',').filter(Boolean);
        const savedOnly = req.query.saved === 'true'; // Check if only saved events are requested
        const status = req.query.status as string || 'VERIFIED';
        const timeFilter = req.query.timeFilter as string || (savedOnly ? '' : 'future');
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

        //Filter by status - 'VERIFIED' show users || 'ALL' for admin
        if (status !== 'ALL') {
            andConditions.push({ eventStatus: status });
        }


        const sortCondition: { [key: string]: SortOrder } =
            status === 'ALL' ? { createdAt: -1 as SortOrder } : { startDate: 1 as SortOrder };

        // Combine all conditions into a single filter object
        const filterConditions = andConditions.length > 0 ? { $and: andConditions } : {};

        // Fetch the events with filters, sorted by createdAt (newest first)
        const events = await Event.find(filterConditions)
            .sort(sortCondition)
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

            let bookings;

            if (userId === event.createdBy._id.toString()) {
                bookings = await Booking.find({ eventId: req.params.id })
                    .populate('userId', 'name email avatarURL') // Populate user details
                    .exec();
            }

            const updatedEvent = {
                ...event.toObject(),
                isLiked: !!like,
                isSaved: !!bookmark,
                booking: booking && {
                    bookingId: booking._id,
                    tickets: booking.tickets
                },
                ...(bookings ? { bookings } : {}),
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

        const moodScore = evaluateEvent(req.body);

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
            moodScore,
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
        const moodScore = evaluateEvent(req.body);

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
            moodScore,
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

        res.status(200).json(bookings);
    } catch (err: any) {
        res.status(500).json({ message: 'Error fetching booked users', error: err.message });
    }
};

const deleteBooking: RequestHandler = async (req: UserRequest, res: Response): Promise<any> => {
    const eventId = req.params.id;
    const userId = new mongoose.Types.ObjectId(req.user?.id);

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

export const getTopEvents: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { limit = 5 } = req.query; // Default to top 5 events
        const limitNumber = parseInt(limit as string, 10);

        // Aggregate bookings to calculate total tickets booked per event
        const bookingsAggregation = await Booking.aggregate([
            {
                $lookup: {
                    from: "events", // Name of the events collection
                    localField: "eventId",
                    foreignField: "_id",
                    as: "eventDetails",
                },
            },
            { $unwind: "$eventDetails" }, // Flatten the event details array
            {
                $match: {
                    "eventDetails.startDate": { $gt: new Date() }, // Only future events
                    "eventDetails.eventStatus": "VERIFIED", // Only verified events
                },
            },
            {
                $group: {
                    _id: "$eventId", // Group by event ID
                    totalTickets: { $sum: "$tickets" }, // Sum the tickets
                    eventDetails: { $first: "$eventDetails" }, // Include event details
                },
            },
            {
                $addFields: {
                    bookedSeats: {
                        $subtract: [
                            "$eventDetails.totalSeats", // Total seats
                            "$eventDetails.availableSeats", // Available seats
                        ],
                    },
                },
            },
            { $sort: { bookedSeats: -1 } }, // Sort by booked seats (totalSeats - availableSeats)
            { $limit: limitNumber }, // Limit the number of results
        ]);

        // Format the response
        const topEvents = bookingsAggregation.map((entry) => ({
            eventId: entry._id,
            totalTickets: entry.totalTickets,
            ...entry.eventDetails,
        }));

        res.status(200).json({ topEvents });
    } catch (error) {
        console.error("Error fetching top events:", error);
        res.status(500).json({ message: "Failed to fetch top events" });
    }
};

export const getMyEvents: RequestHandler = async (req: UserRequest, res: Response) => {
    try {
        const userId = req.user?.id; // Assuming userId is passed from the authenticated user (req.user.id)

        // Fetch bookings for the user
        const eventsAggregation = await Booking.aggregate([
            {
                $match: { userId: new mongoose.Types.ObjectId(userId) }, // Match userId in bookings
            },
            {
                $lookup: {
                    from: "events", // Lookup from events collection
                    localField: "eventId", // Join on eventId
                    foreignField: "_id", // Match against _id of events
                    as: "eventDetails", // Alias the event details
                },
            },
            { $unwind: "$eventDetails" }, // Flatten the event details
            {
                $project: {
                    eventId: 1,
                    tickets: 1, // Number of tickets booked
                    // Flatten the event fields to be at the root level
                    name: "$eventDetails.name",
                    description: "$eventDetails.description",
                    startDate: "$eventDetails.startDate",
                    endDate: "$eventDetails.endDate",
                    isOnline: "$eventDetails.isOnline",
                    location: "$eventDetails.location",
                    totalSeats: "$eventDetails.totalSeats",
                    availableSeats: "$eventDetails.availableSeats",
                    eventType: "$eventDetails.eventType",
                    tags: "$eventDetails.tags",
                    images: "$eventDetails.images",
                    createdBy: "$eventDetails.createdBy",
                    customFields: "$eventDetails.customFields",
                },
            },
            {
                $facet: {
                    // Get future booked events
                    bookedEvents: [
                        {
                            $match: {
                                startDate: { $gt: new Date() }, // Future events only
                            },
                        },
                    ],
                    // Get past visited events
                    visitedEvents: [
                        {
                            $match: {
                                startDate: { $lt: new Date() }, // Past events only
                            },
                        },
                    ],
                },
            },
        ]);

        // Fetch events created by the user
        const createdEventsAggregation = await Event.aggregate([
            {
                $match: { createdBy: new mongoose.Types.ObjectId(userId) }, // Filter by createdBy field
            },
            { $sort: { startDate: 1 } }, // Sort by event start date
            {
                $project: {
                    eventId: "$_id", // Use _id as eventId
                    name: 1,
                    description: 1,
                    startDate: 1,
                    endDate: 1,
                    isOnline: 1,
                    location: 1,
                    totalSeats: 1,
                    availableSeats: 1,
                    eventType: 1,
                    tags: 1,
                    images: 1,
                    createdBy: 1,
                    customFields: 1,
                },
            },
        ]);

        // Format the response
        const bookedEvents = eventsAggregation[0]?.bookedEvents || [];
        const visitedEvents = eventsAggregation[0]?.visitedEvents || [];
        const createdEvents = createdEventsAggregation || [];

        res.status(200).json({
            bookedEvents,
            visitedEvents,
            createdEvents,
        });
    } catch (error) {
        console.error("Error fetching user's events:", error);
        res.status(500).json({ message: "Failed to fetch user's events" });
    }
};

export const getEventEvaluation: RequestHandler = async (req: Request, res: Response) => {
    const result = evaluateEvent(req.body);

    res.status(200).json(result);
}

export const getRecommendations: RequestHandler = async (req: UserRequest, res: Response) => {
    try {
        const {
            ageGroup,
            dateOption,
            mood,
            location,
            online,
            specificDate,
            priceOption,
        } = req.query;

        // Prepare the filter conditions array
        const andConditions: any[] = [];

        console.log(ageGroup,
            dateOption,
            mood,
            location,
            online,
            specificDate,
            priceOption)
        // Age Group filter
        if (ageGroup !== undefined) {
            andConditions.push({ targetAudience: { $in: [ageGroup] } });
        }

        const moodRanges: { [key: string]: [number, number] } = {
            'HAPPY': [0, 100],
            'NEUTRAL': [-5, 5],
            'SAD': [-100, 0],
        };

        // Mood filter
        if (mood && moodRanges[mood as string]) {
            const [min, max] = moodRanges[mood as string];
            andConditions.push({ moodScore: { $gte: min, $lte: max } });
        }
        console.log(andConditions)

        // Location filter (online or specific location)
        if (location !== undefined) {
            if (location === 'online') {
                andConditions.push({ isOnline: true });
            } else {
                andConditions.push({ 'location.city': { $in: [location] } });
            }
        }

        // Online filter
        if (online !== undefined) {
            if (online === 'true') {
                // Assuming `isOnline` is a non-null string when true
                andConditions.push({ isOnline: { $ne: null } }); // This will check if `isOnline` is not null
            } else {
                // Assuming `isOnline` is null when false
                andConditions.push({ isOnline: null });
            }
        }

        // Specific Date filter
        if (specificDate !== undefined) {
            // Parse the specific date (assuming the format is YYYY-MM-DD)
            const startOfDay = new Date(specificDate as string);
            startOfDay.setHours(0, 0, 0, 0); // Set to midnight

            // Get the start of the next day
            const endOfDay = new Date(startOfDay);
            endOfDay.setDate(startOfDay.getDate() + 1); // Move to the next day and set time to midnight

            // Push the filter condition to match events that start within that day
            andConditions.push({ startDate: { $gte: startOfDay, $lt: endOfDay } });

        } else if (dateOption !== undefined) {
            const now = new Date();
            if (dateOption === 'TODAY') {
                const startOfDay = new Date(now.setHours(0, 0, 0, 0));
                const endOfDay = new Date(now.setHours(23, 59, 59, 999));
                andConditions.push({ startDate: { $gte: startOfDay, $lte: endOfDay } });
            } else if (dateOption === 'TOMORROW') {
                const tomorrow = new Date();
                tomorrow.setDate(now.getDate() + 1);
                andConditions.push({ startDate: { $gte: tomorrow.setHours(0, 0, 0, 0) } });
            } else if (dateOption === 'THIS_WEEK') {
                const startOfWeek = new Date(now.setDate(now.getDate())); // Start of the week (Sunday)
                const endOfWeek = new Date(now.setDate(now.getDate() + 7)); // End of the week (Saturday)
                andConditions.push({ startDate: { $gte: startOfWeek, $lte: endOfWeek } });
            }
        }

        // Price Option filter
        if (priceOption !== undefined) {
            if (priceOption === "FREE") {
                andConditions.push({ price: 0 });
            } else if (priceOption === "PAID") {
                andConditions.push({ price: { $gt: 0 } });
            }
        }


        andConditions.push({ eventStatus: 'VERIFIED' });
        // Combine all conditions into a single filter object
        const filterConditions = andConditions.length > 0 ? { $and: andConditions } : {};

        console.log(filterConditions)
        // Fetch recommended events with filters
        const events = await Event.find(filterConditions)
            .sort({ startDate: 1 }) // Assuming you want to sort events by start date
            .exec();

        if (!events || events.length === 0) {
            res.status(404).json({ message: 'No events found matching your criteria' });
            return;
        }

        res.status(200).json({ events });
    } catch (err: any) {
        console.error('Error fetching recommendations:', err);
        res.status(500).json({ message: 'Error fetching recommendations', error: err.message });
    }


}


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
    getCities,
    getTopEvents,
    getMyEvents,
    getEventEvaluation,
    getRecommendations
};
