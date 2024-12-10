import { RequestHandler, Response, Request } from "express"
import { Event } from '../models/Event';
import { Bookmark } from "../models/Bookmark";
interface UserRequest extends Request {
  user?: {
    id: string,
    email: string,
    status: 'ADMIN' | 'USER' | 'VERIFIED_USER';
  }
}


const saveEvent: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
  const { eventId } = req.params;
  const userId = req.user?.id;

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    const existingBookmark = await Bookmark.findOne({ userId, eventId });
    if (existingBookmark) {
      res.status(400).json({ message: 'User has already saved this event' });
      return;
    }

    const bookmark = new Bookmark({
      userId,
      eventId,
    });
    await bookmark.save();
    res.status(200).json({ message: 'Event saved successfully', bookmark });

  } catch (err: any) {
    res.status(500).json({ message: 'Error saving event', error: err.message });
  }
}

const unsaveEvent: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
  const { eventId } = req.params;
  const userId = req.user?.id;

  try {
    // Check if the like exists
    const bookmark = await Bookmark.findOneAndDelete({ userId, eventId });
    if (!bookmark) {
      res.status(404).json({ message: 'User hasn`t saved this event' });
      return;
    }

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: 'Error unsaving event', error: err.message });
  }
};


export default {
  saveEvent,
  unsaveEvent
}