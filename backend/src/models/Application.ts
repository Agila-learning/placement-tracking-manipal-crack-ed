import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type ApplicationStatus =
  | 'Registered'
  | 'Documents Pending'
  | 'Referred'
  | 'Awaiting Interview'
  | 'Interview in Progress'
  | 'Selected'
  | 'Rejected'
  | 'Dropped'
  | 'Not Interested'
  | 'On Hold'
  | 'Enrollment Fee Pending'
  | 'Loan Processing'
  | 'Campus Reporting Pending'
  | 'Arrived in Campus';

export type InterviewRoundStatus =
  | 'Yet to Schedule'
  | 'Scheduled'
  | 'Completed'
  | 'Selected'
  | 'Rejected'
  | 'Absent'
  | 'Dropped'
  | 'Not Applicable'
  | 'On Hold';

export type PaymentRoute = 'ROUTE_A_VENDOR_LOAN' | 'ROUTE_B_FULL_PAYMENT';

export interface IInterviewAttempt {
  attemptNumber: number;
  scheduledDate?: Date;
  scheduledTime?: string;
  interviewMode: 'Online' | 'Offline' | 'Telephonic';
  venueOrLink?: string;
  interviewerName?: string;
  status: InterviewRoundStatus;
  result?: 'Selected' | 'Rejected' | 'Absent' | 'On Hold' | 'Pending';
  remarks?: string;
  updatedBy: Types.ObjectId | string;
  updatedByName: string;
  updatedAt: Date;
}

export interface IDynamicRoundData {
  roundId: string;
  roundName: string;
  isMandatory: boolean;
  order: number;
  currentStatus: InterviewRoundStatus;
  scheduledDate?: Date;
  scheduledTime?: string;
  interviewMode?: 'Online' | 'Offline' | 'Telephonic';
  venueOrLink?: string;
  interviewerName?: string;
  result?: string;
  remarks?: string;
  lastUpdated?: Date;
  attempts: IInterviewAttempt[];
}

export interface IApplication extends Document {
  applicationNumber: string; // Unique, indexed e.g. FIC-20250912-A1B2
  candidateId: Types.ObjectId;
  candidateName: string;
  candidateEmail: string;
  candidateMobile: string;
  bankId: Types.ObjectId;
  bankName: string;
  programId: Types.ObjectId;
  programName: string;
  vendorId?: Types.ObjectId;
  vendorName: string; // e.g. Manipal, Crack-ed, Custom
  hrReferenceId?: Types.ObjectId;
  hrReferenceName: string;
  batchNumber?: string;
  paymentRoute: PaymentRoute;
  overallStatus: ApplicationStatus;
  interviewRounds: IDynamicRoundData[];
  commissionStatus?: 'PENDING' | 'COLLECTED' | 'NOT_APPLICABLE';
  commissionAmount?: number;
  commissionCollectedDate?: Date;
  commissionNotes?: string;
  commissionUpdatedBy?: Types.ObjectId | string;
  commissionUpdatedByName?: string;
  commissionUpdatedAt?: Date;
  remarks?: string;
  registrationDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewAttemptSchema = new Schema<IInterviewAttempt>(
  {
    attemptNumber: { type: Number, required: true },
    scheduledDate: { type: Date },
    scheduledTime: { type: String },
    interviewMode: {
      type: String,
      enum: ['Online', 'Offline', 'Telephonic'],
      default: 'Online',
    },
    venueOrLink: { type: String },
    interviewerName: { type: String },
    status: {
      type: String,
      enum: [
        'Yet to Schedule',
        'Scheduled',
        'Completed',
        'Selected',
        'Rejected',
        'Absent',
        'Dropped',
        'Not Applicable',
        'On Hold',
      ],
      default: 'Yet to Schedule',
    },
    result: { type: String },
    remarks: { type: String },
    updatedBy: { type: Schema.Types.Mixed },
    updatedByName: { type: String, default: 'System' },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const DynamicRoundDataSchema = new Schema<IDynamicRoundData>(
  {
    roundId: { type: String, required: true },
    roundName: { type: String, required: true },
    isMandatory: { type: Boolean, default: true },
    order: { type: Number, default: 1 },
    currentStatus: {
      type: String,
      enum: [
        'Yet to Schedule',
        'Scheduled',
        'Completed',
        'Selected',
        'Rejected',
        'Absent',
        'Dropped',
        'Not Applicable',
        'On Hold',
      ],
      default: 'Yet to Schedule',
    },
    scheduledDate: { type: Date },
    scheduledTime: { type: String },
    interviewMode: {
      type: String,
      enum: ['Online', 'Offline', 'Telephonic'],
      default: 'Online',
    },
    venueOrLink: { type: String },
    interviewerName: { type: String },
    result: { type: String },
    remarks: { type: String },
    lastUpdated: { type: Date },
    attempts: [InterviewAttemptSchema],
  },
  { _id: false }
);

const ApplicationSchema = new Schema<IApplication>(
  {
    applicationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      uppercase: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
      index: true,
    },
    candidateName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    candidateEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    candidateMobile: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
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
      index: true,
    },
    programId: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
      index: true,
    },
    programName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    vendorName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    hrReferenceId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    hrReferenceName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    batchNumber: {
      type: String,
      trim: true,
    },
    paymentRoute: {
      type: String,
      enum: ['ROUTE_A_VENDOR_LOAN', 'ROUTE_B_FULL_PAYMENT'],
      default: 'ROUTE_A_VENDOR_LOAN',
      index: true,
    },
    overallStatus: {
      type: String,
      enum: [
        'Registered',
        'Documents Pending',
        'Referred',
        'Awaiting Interview',
        'Interview in Progress',
        'Selected',
        'Rejected',
        'Dropped',
        'Not Interested',
        'On Hold',
        'Enrollment Fee Pending',
        'Loan Processing',
        'Campus Reporting Pending',
        'Arrived in Campus',
      ],
      default: 'Registered',
      index: true,
    },
    interviewRounds: [DynamicRoundDataSchema],
    commissionStatus: {
      type: String,
      enum: ['PENDING', 'COLLECTED', 'NOT_APPLICABLE'],
      default: 'PENDING',
    },
    commissionAmount: {
      type: Number,
      default: 0,
    },
    commissionCollectedDate: {
      type: Date,
    },
    commissionNotes: {
      type: String,
      trim: true,
    },
    commissionUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    commissionUpdatedByName: {
      type: String,
    },
    commissionUpdatedAt: {
      type: Date,
    },
    remarks: {
      type: String,
      trim: true,
    },
    registrationDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast search and filtering
ApplicationSchema.index({ bankName: 1, programName: 1, overallStatus: 1 });
ApplicationSchema.index({ vendorName: 1, overallStatus: 1 });

export const Application: Model<IApplication> = mongoose.model<IApplication>('Application', ApplicationSchema);

