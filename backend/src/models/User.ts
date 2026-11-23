import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/environment';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'HR_EXECUTIVE' | 'ACCOUNTS';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface IUser extends Document {
  employeeId: string;
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  failedLoginAttempts: number;
  lockUntil?: Date;
  mfaEnabled: boolean;
  mfaSecret?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked(): boolean;
}

const UserSchema = new Schema<IUser>(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Do not return by default
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'ADMIN', 'HR_EXECUTIVE', 'ACCOUNTS'],
      required: true,
      default: 'HR_EXECUTIVE',
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaSecret: {
      type: String,
      select: false,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id?.toString();
        delete ret.passwordHash;
        delete ret.mfaSecret;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id?.toString();
        return ret;
      },
    },
  }
);

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  const cleanCandidate = String(candidatePassword || '');
  // 1. Direct comparison
  if (await bcrypt.compare(cleanCandidate, this.passwordHash)) {
    return true;
  }
  // 2. Comparison without whitespace (e.g. "63810 91552" vs "6381091552")
  const noSpace = cleanCandidate.replace(/\s+/g, '');
  if (noSpace !== cleanCandidate && (await bcrypt.compare(noSpace, this.passwordHash))) {
    return true;
  }
  // 3. Comparison with space between 5-digit segments (e.g. "6381091552" vs "63810 91552")
  if (/^\d{10}$/.test(noSpace)) {
    const spaced = `${noSpace.slice(0, 5)} ${noSpace.slice(5)}`;
    if (spaced !== cleanCandidate && (await bcrypt.compare(spaced, this.passwordHash))) {
      return true;
    }
  }
  return false;
};

UserSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil.getTime() > Date.now());
};

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

