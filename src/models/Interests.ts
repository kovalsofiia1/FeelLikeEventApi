import mongoose, { Document, Model } from 'mongoose';

interface IInterest extends Document {
  name: string;
}

const interestSchema = new mongoose.Schema<IInterest>({
  name: {
    type: String,
    required: [true, 'Interest name is required'],
    unique: true,
  },
}, { timestamps: true });

const Interest: Model<IInterest> = mongoose.model<IInterest>('Interest', interestSchema);

export default Interest;
