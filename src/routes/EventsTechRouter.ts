import eventController from "../controllers/EventController";
import express from "express";

const router = express.Router();
router.get('/cities', eventController.getCities);

export { router as EventTechRouter };