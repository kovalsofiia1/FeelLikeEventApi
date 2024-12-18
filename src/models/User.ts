import mongoose, { Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { EMAIL_PATTERN, USERNAME_PATTERN, PHONE_PATTERN } from '../helpers/constants';

// Define the IUser interface
interface IUser extends Document {
    name: string;
    email: string;
    description?: string;
    dateOfBirth?: string;
    password: string;
    status: 'ADMIN' | 'USER' | 'VERIFIED_USER';
    avatarURL?: string;
    googleId?: string;
    interests: string[]; // Array of ObjectIds referencing EventTag
    verified: boolean;
    token?: string;
    phoneNumber: string; // Add phoneNumber to the IUser interface
    comparePassword(password: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUser>(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            match: [
                USERNAME_PATTERN,
                'Name must contain only letters, numbers, and special characters, and be between 2 and 32 characters long',
            ],
        },

        password: {
            type: String,
            required: [true, 'Password is required'],
        },

        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            match: EMAIL_PATTERN,
        },

        status: {
            type: String,
            enum: ['ADMIN', 'USER', 'VERIFIED_USER'],
            required: [true, 'Status is required'],
            default: 'USER',
        },

        avatarURL: {
            type: String,
            required: false,
        },

        description: {
            type: String,
            required: false,
        },

        dateOfBirth: {
            type: String,
            required: false,
        },

        interests: [{
            type: String,
            required: false,
        }],

        googleId: {
            type: String,
            unique: true,
            required: false,
        },

        verified: {
            type: Boolean,
            default: false,
        },

        token: {
            type: String,
            required: false,
        },

        phoneNumber: {
            type: String,
            required: false,
            match: PHONE_PATTERN, // Use your phone number pattern for validation
        },
    },
    { timestamps: true }
);

// Middleware to hash the password before saving
userSchema.pre<IUser>('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
};

// Create the model with correct typing
const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
