import mongoose, { Document, Schema, Model } from 'mongoose';
import { MasterStatus } from './Bank';

export interface IVendor extends Document {
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  status: MasterStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
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
    contactPerson: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Vendor: Model<IVendor> = mongoose.model<IVendor>('Vendor', VendorSchema);

