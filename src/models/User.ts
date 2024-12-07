import mongoose, { Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { EMAIL_PATTERN, USERNAME_PATTERN } from 'helpers/constants';

// Define an interface for the User document
interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    status: 'ADMIN' | 'USER' | 'VERIFIED_USER';
    token: string;
    avatarURL?: string;
    googleId?: string;
    interests: mongoose.Types.ObjectId[];
    description?: string,
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

        token: {
            type: String,
            default: null,
        },

        avatarURL: {
            type: String,
            required: false,
        },

        description: {
            type: String,
            required: false,
        },

        interests: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Interest', // Reference the Interest model
            required: false,
        }],

        googleId: {
            type: String,
            unique: true,
            default: null,
        },
        // verify: {
        //     type: Boolean,
        //     default: false,
        // },

        // verificationToken: {
        //     type: String,
        //     required: [true, 'Verify token is required'],
        // },
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

// Create the model
const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
