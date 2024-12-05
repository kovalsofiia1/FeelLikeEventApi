import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import "./db/db";
import AuthRoutes from './routes/AuthRouter';
import { EventRouter } from "routes/EventRouter";


const app = express();

app.use(morgan("tiny"));
app.use(cors());
app.use(express.json());

app.use('/auth', AuthRoutes);
app.use('/events', EventRouter);

app.use((_, res) => {
    res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
    const { status = 500, message = 'Server error' } = err;
    res.status(status).json({ message });
});

const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Listening port ${port}`))