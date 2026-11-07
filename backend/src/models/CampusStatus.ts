import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type CampusStatusType = 'Pending' | 'Scheduled' | 'Arrived in Campus' | 'Arrived / Reported' | 'Completed' | 'Dropped' | 'Cancelled' | 'Not Applicable';

export interface ICampusStatus extends Document {
  applicationId: Types.ObjectId;
  candidateId: Types.ObjectId;
  applicationNumber: string;
  campusStatus: CampusStatusType;
  arrivalDate?: Date;
  campusLocation?: string;
  reportingBatch?: string;
  remarks?: string;
  updatedBy?: Types.ObjectId | string;
  updatedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CampusStatusSchema = new Schema<ICampusStatus>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      unique: true,
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
      index: true,
    },
    applicationNumber: {
      type: String,
      required: true,
      index: true,
    },
    campusStatus: {
      type: String,
      enum: ['Pending', 'Scheduled', 'Arrived in Campus', 'Arrived / Reported', 'Completed', 'Dropped', 'Cancelled', 'Not Applicable'],
      default: 'Pending',
      index: true,
    },
    arrivalDate: {
      type: Date,
    },
    campusLocation: {
      type: String,
      trim: true,
    },
    reportingBatch: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    updatedBy: {
      type: Schema.Types.Mixed,
    },
    updatedByName: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const CampusStatus: Model<ICampusStatus> = mongoose.model<ICampusStatus>('CampusStatus', CampusStatusSchema);

