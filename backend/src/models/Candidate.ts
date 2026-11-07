import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ICandidate extends Document {
  fullName: string;
  email: string;
  mobileNumber: string;
  dateOfBirth?: Date;
  state?: string;
  stateCode?: string;
  district?: string;
  districtCode?: string;
  city?: string;
  resumeUrl?: string;
  resumeOriginalName?: string;
  resumeMimeType?: string;
  educationDetails?: {
    highestQualification?: string;
    passingYear?: number;
    college?: string;
    percentageOrCgpa?: string;
  };
  totalApplicationsCount: number;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

const CandidateSchema = new Schema<ICandidate>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    dateOfBirth: {
      type: Date,
    },
    state: {
      type: String,
      trim: true,
    },
    stateCode: {
      type: String,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    districtCode: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    resumeUrl: {
      type: String,
    },
    resumeOriginalName: {
      type: String,
    },
    resumeMimeType: {
      type: String,
    },
    educationDetails: {
      highestQualification: String,
      passingYear: Number,
      college: String,
      percentageOrCgpa: String,
    },
    totalApplicationsCount: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for quick lookups
CandidateSchema.index({ email: 1, mobileNumber: 1 });

export const Candidate: Model<ICandidate> = mongoose.model<ICandidate>('Candidate', CandidateSchema);

