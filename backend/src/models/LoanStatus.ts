import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type LoanStatusType = 'Not Sanctioned' | 'Applied' | 'Under Review' | 'Sanctioned' | 'Disbursed' | 'Rejected' | 'Not Applicable';

export interface ILoanStatus extends Document {
  applicationId: Types.ObjectId;
  candidateId: Types.ObjectId;
  applicationNumber: string;
  isLoanRequired: boolean; // Yes / No
  loanStatus: LoanStatusType;
  vendorName?: string; // e.g. Manipal
  sanctionDate?: Date;
  sanctionAmount?: number;
  remarks?: string;
  updatedBy?: Types.ObjectId | string;
  updatedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LoanStatusSchema = new Schema<ILoanStatus>(
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
    isLoanRequired: {
      type: Boolean,
      default: true,
    },
    loanStatus: {
      type: String,
      enum: ['Not Sanctioned', 'Applied', 'Under Review', 'Sanctioned', 'Disbursed', 'Rejected', 'Not Applicable'],
      default: 'Not Sanctioned',
      index: true,
    },
    vendorName: {
      type: String,
      trim: true,
    },
    sanctionDate: {
      type: Date,
    },
    sanctionAmount: {
      type: Number,
      min: 0,
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

export const LoanStatus: Model<ILoanStatus> = mongoose.model<ILoanStatus>('LoanStatus', LoanStatusSchema);

