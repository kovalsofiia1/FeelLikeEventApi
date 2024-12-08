import { RequestHandler, Response, Request } from "express"
import { Event } from '../models/Event';
import { Like } from "models/Like";
interface UserRequest extends Request {
  user?: {
    id: string,
    email: string,
    status: 'ADMIN' | 'USER' | 'VERIFIED_USER';
  }
}


const likeEvent: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
  const { eventId } = req.params;
  const userId = req.user?.id;

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    const existingLike = await Like.findOne({ userId, eventId });
    if (existingLike) {
      res.status(400).json({ message: 'User has already liked this event' });
      return;
    }

    const like = new Like({
      userId,
      eventId,
    });
    await like.save();
    res.status(200).json({ message: 'Like added successfully', like });

  } catch (err: any) {
    res.status(500).json({ message: 'Error adding like', error: err.message });
  }
}

const deleteLike: RequestHandler = async (req: UserRequest, res: Response): Promise<void> => {
  const { eventId } = req.params;
  const userId = req.user?.id;

  try {
    // Check if the like exists
    const like = await Like.findOneAndDelete({ userId, eventId });
    if (!like) {
      res.status(404).json({ message: 'Like not found or user has not liked this event' });
      return;
    }

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: 'Error removing like', error: err.message });
  }
};


export default {
  likeEvent,
  deleteLike
}