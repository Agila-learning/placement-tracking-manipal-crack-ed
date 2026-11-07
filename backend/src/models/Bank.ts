import mongoose, { Document, Schema, Model } from 'mongoose';

export type MasterStatus = 'ACTIVE' | 'INACTIVE';

export interface IBank extends Document {
  name: string;
  code: string;
  status: MasterStatus;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BankSchema = new Schema<IBank>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Bank: Model<IBank> = mongoose.model<IBank>('Bank', BankSchema);

