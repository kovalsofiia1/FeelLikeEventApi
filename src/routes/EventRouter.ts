import eventController from "../controllers/EventController";
import express from "express";
import validateBody from "../helpers/validateBody";
import authMiddleware, { notStrictAuthMiddleware } from "../middleware/auth";
import { bookingSchema, commentSchema, eventSchema } from "../schemas/eventSchema";
import upload from "../middleware/upload";

const router = express.Router();

router.get('/cities', eventController.getCities);

//Events CRUD
router.get('/', notStrictAuthMiddleware, eventController.getAllEvents);
router.post('/', authMiddleware, upload.array('images', 1), validateBody(eventSchema), eventController.createEvent);
router.get('/top', eventController.getTopEvents);
router.get('/me', authMiddleware, eventController.getMyEvents);

router.get('/:id', notStrictAuthMiddleware, eventController.getEventById);
router.put('/:id', authMiddleware, upload.array('images', 1), validateBody(eventSchema), eventController.updateEvent);
router.delete('/:id', authMiddleware, eventController.deleteEvent);


//Events comments
router.get('/:id/comments', eventController.getComments);
router.post('/:id/comment', authMiddleware, validateBody(commentSchema), eventController.addComment);
router.delete('/:eventId/comment/:commentId', authMiddleware, eventController.deleteComment);


//Bookings
router.post('/:id/book', authMiddleware, validateBody(bookingSchema), eventController.bookEvent);
router.delete('/:id/book', authMiddleware, eventController.deleteBooking);
router.get('/:id/booked-users', authMiddleware, eventController.getBookedUsers);

//VERIFYING EVENTS FOR ADMIN
router.patch('/:id/verify', authMiddleware, eventController.verifyEvent);
router.patch('/:id/decline', authMiddleware, eventController.declineEvent);

export { router as EventRouter };