import eventController from "controllers/EventController";
import express from "express";
import validateBody from "helpers/validateBody";
// import eventController from '../controllers/eventController';
import authMiddleware from "middleware/auth";
import { bookingSchema, commentSchema, eventSchema } from "schemas/eventSchema";

const router = express.Router();


//Events CRUD
router.get('/', eventController.getAllEvents);
router.post('/', authMiddleware, validateBody(eventSchema), eventController.createEvent);
router.get('/:id', eventController.getEventById);
router.put('/:id', authMiddleware, validateBody(eventSchema), eventController.updateEvent);
router.delete('/:id', authMiddleware, eventController.deleteEvent);


//Events comments
router.post('/:id/comment', authMiddleware, validateBody(commentSchema), eventController.addComment);
router.delete('/:eventId/comment/:commentId', authMiddleware, eventController.addComment);

//Bookings
router.post('/:id/book', authMiddleware, validateBody(bookingSchema), eventController.bookEvent);
router.delete('/:id/book', authMiddleware, eventController.deleteBooking);
router.get('/:id/booked-users', authMiddleware, eventController.getBookedUsers);




export { router as EventRouter };