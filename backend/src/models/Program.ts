import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import { MasterStatus } from './Bank';

export interface IInterviewRoundConfig {
  roundId: string;
  roundName: string; // e.g. "L1", "L2", "Mock", "Panel", "HR"
  isMandatory: boolean;
  order: number;
  defaultMode?: 'Online' | 'Offline' | 'Telephonic';
}

export type PaymentTrigger = 'BEFORE_INTERVIEW' | 'AFTER_SELECTION';

export interface IProgram extends Document {
  bankId: Types.ObjectId;
  bankName: string;
  name: string;
  code: string;
  designation?: string;
  salaryPackage?: string;
  location?: string;
  vendorAvailability: string[]; // Vendor IDs or Names e.g. ["Manipal", "Crack-ed"]
  interviewRoundsConfig: IInterviewRoundConfig[];
  enrollmentFeeAmount: number;
  paymentTrigger: PaymentTrigger;
  isRefundable: boolean;
  loanAvailable: boolean;
  campusApplicable: boolean;
  batchNumber?: string;
  status: MasterStatus;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewRoundConfigSchema = new Schema<IInterviewRoundConfig>(
  {
    roundId: { type: String, required: true },
    roundName: { type: String, required: true },
    isMandatory: { type: Boolean, default: true },
    order: { type: Number, required: true, default: 1 },
    defaultMode: {
      type: String,
      enum: ['Online', 'Offline', 'Telephonic'],
      default: 'Online',
    },
  },
  { _id: false }
);

const ProgramSchema = new Schema<IProgram>(
  {
    bankId: {
      type: Schema.Types.ObjectId,
      ref: 'Bank',
      required: true,
      index: true,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
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
    designation: {
      type: String,
      trim: true,
    },
    salaryPackage: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    vendorAvailability: [
      {
        type: String,
        trim: true,
      },
    ],
    interviewRoundsConfig: {
      type: [InterviewRoundConfigSchema],
      default: [
        { roundId: 'r_l1', roundName: 'L1', isMandatory: true, order: 1, defaultMode: 'Online' },
        { roundId: 'r_l2', roundName: 'L2', isMandatory: true, order: 2, defaultMode: 'Online' },
        { roundId: 'r_mock', roundName: 'Mock', isMandatory: false, order: 3, defaultMode: 'Online' },
      ],
    },
    enrollmentFeeAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    paymentTrigger: {
      type: String,
      enum: ['BEFORE_INTERVIEW', 'AFTER_SELECTION'],
      default: 'AFTER_SELECTION',
    },
    isRefundable: {
      type: Boolean,
      default: true,
    },
    loanAvailable: {
      type: Boolean,
      default: true,
    },
    campusApplicable: {
      type: Boolean,
      default: true,
    },
    batchNumber: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ProgramSchema.index({ bankId: 1, name: 1 }, { unique: true });

export const Program: Model<IProgram> = mongoose.model<IProgram>('Program', ProgramSchema);

