import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import "./db/db";
import AuthRoutes from './routes/AuthRouter';


const app = express();

app.use(morgan("tiny"));
app.use(cors());
app.use(express.json());

app.use('/auth', AuthRoutes);

app.use((_, res) => {
    res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
    const { status = 500, message = 'Server error' } = err;
    res.status(status).json({ message });
});

app.listen(3001, () => console.log('Listening port 3001'))