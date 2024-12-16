import { Request, RequestHandler, Response } from "express";
import User from '../models/User';
import { generateToken } from "../utils/jwtUtils";
import controllerWrapper from "../helpers/controllerWrapper";
import HttpErrors from "../helpers/HttpErrors";

const login: RequestHandler = controllerWrapper(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email }).exec();
    if (!existingUser) {
        throw new HttpErrors(400, 'Email or password is wrong');
    }

    const isPasswordValid = await existingUser.comparePassword(password);
    if (!isPasswordValid) {
        throw new HttpErrors(400, 'Email or password is wrong');
    }

    const token = generateToken(existingUser.email, existingUser._id);

    await User.findByIdAndUpdate(existingUser._id, { token });

    res.status(200).json({ user: { id: existingUser._id, name: existingUser.name, email: existingUser.email, status: existingUser.status }, token })

})


const register: RequestHandler = controllerWrapper(async (req: Request, res: Response): Promise<void> => {
    const { email, password, firstName, lastName } = req.body;

    const emailInLowerCase = email.toLowerCase();
    const existingUser = await User.findOne({ email: emailInLowerCase }).exec();
    if (existingUser) {
        res.status(400).json({ message: 'User already exists!' });
        return;
    }

    const newUser = await User.create({
        name: `${firstName} ${lastName}`,
        email: emailInLowerCase,
        password
    });

    const token = generateToken(newUser.email, newUser._id);

    newUser.token = token;
    await newUser.save();

    res.status(201).json({
        token,
        user: {
            name: newUser.name,
            email: newUser.email,
            status: newUser.status
        },
    });
})


const logout: RequestHandler = controllerWrapper(async (req, res: Response): Promise<void> => {
    const { id } = req.user;
    console.log(id);
    await User.findByIdAndUpdate(id, { token: null });
    res.status(204).end();
})

export default {
    login,
    register,
    logout,
};
