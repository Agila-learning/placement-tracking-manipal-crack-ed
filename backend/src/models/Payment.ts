import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import { PaymentRoute } from './Application';

export type PaymentStatus =
  | 'Pending'
  | 'Partially Paid'
  | 'Paid'
  | 'Refund Pending'
  | 'Refunded'
  | 'Not Applicable';

export type PaymentMode = 'NEFT/RTGS' | 'UPI' | 'NetBanking' | 'Credit Card' | 'Debit Card' | 'Cheque' | 'Cash';

export interface IPaymentTransaction {
  _id?: Types.ObjectId;
  transactionId: string;
  amount: number;
  paymentMode: PaymentMode;
  paymentDate: Date;
  referenceNotes?: string;
  receiptNumber?: string;
  recordedBy: Types.ObjectId | string;
  recordedByName: string;
  isVerified: boolean;
  verifiedBy?: Types.ObjectId | string;
  verifiedByName?: string;
  verifiedAt?: Date;
  createdAt: Date;
}

export interface IInstallment {
  _id?: Types.ObjectId;
  installmentNumber: number;
  name: string;
  amount: number;
  dueDate?: Date;
  paidAmount: number;
  status: 'Pending' | 'Partially Paid' | 'Paid';
  paymentDate?: Date;
  receiptNumber?: string;
  transactionReference?: string;
  remarks?: string;
}

export interface IRefundDetails {
  isRefundable: boolean;
  refundAmount: number;
  refundStatus: 'NONE' | 'REQUESTED' | 'APPROVED' | 'PROCESSED' | 'REJECTED';
  reason?: string;
  transactionReference?: string;
  requestedAt?: Date;
  processedAt?: Date;
  processedBy?: Types.ObjectId | string;
  processedByName?: string;
}

export interface IPayment extends Document {
  applicationId: Types.ObjectId;
  candidateId: Types.ObjectId;
  applicationNumber: string;
  candidateName: string;
  paymentRoute: PaymentRoute;
  totalProgramFee?: number;
  totalProgramFeeBalance?: number;
  enrollmentFeeAmount: number;
  amountPaid: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  paymentTrigger: 'BEFORE_INTERVIEW' | 'AFTER_SELECTION';
  installments?: IInstallment[];
  transactions: IPaymentTransaction[];
  refund: IRefundDetails;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    transactionId: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMode: {
      type: String,
      enum: ['NEFT/RTGS', 'UPI', 'NetBanking', 'Credit Card', 'Debit Card', 'Cheque', 'Cash'],
      default: 'UPI',
    },
    paymentDate: { type: Date, default: Date.now },
    referenceNotes: { type: String, trim: true },
    receiptNumber: { type: String, trim: true },
    recordedBy: { type: Schema.Types.Mixed },
    recordedByName: { type: String, default: 'System' },
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.Mixed },
    verifiedByName: { type: String },
    verifiedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const InstallmentSchema = new Schema<IInstallment>(
  {
    installmentNumber: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0, default: 0 },
    dueDate: { type: Date },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['Pending', 'Partially Paid', 'Paid'],
      default: 'Pending',
    },
    paymentDate: { type: Date },
    receiptNumber: { type: String, trim: true },
    transactionReference: { type: String, trim: true },
    remarks: { type: String, trim: true },
  },
  { _id: true }
);

const RefundDetailsSchema = new Schema<IRefundDetails>(
  {
    isRefundable: { type: Boolean, default: true },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundStatus: {
      type: String,
      enum: ['NONE', 'REQUESTED', 'APPROVED', 'PROCESSED', 'REJECTED'],
      default: 'NONE',
    },
    reason: { type: String, trim: true },
    transactionReference: { type: String, trim: true },
    requestedAt: { type: Date },
    processedAt: { type: Date },
    processedBy: { type: Schema.Types.Mixed },
    processedByName: { type: String },
  },
  { _id: false }
);

const PaymentSchema = new Schema<IPayment>(
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
    candidateName: {
      type: String,
      required: true,
    },
    paymentRoute: {
      type: String,
      enum: ['ROUTE_A_VENDOR_LOAN', 'ROUTE_B_FULL_PAYMENT'],
      required: true,
      index: true,
    },
    totalProgramFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalProgramFeeBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    enrollmentFeeAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    installments: [InstallmentSchema],
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Partially Paid', 'Paid', 'Refund Pending', 'Refunded', 'Not Applicable'],
      default: 'Pending',
      index: true,
    },
    paymentTrigger: {
      type: String,
      enum: ['BEFORE_INTERVIEW', 'AFTER_SELECTION'],
      default: 'AFTER_SELECTION',
    },
    transactions: [PaymentTransactionSchema],
    refund: {
      type: RefundDetailsSchema,
      default: () => ({ isRefundable: true, refundAmount: 0, refundStatus: 'NONE' }),
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

export const Payment: Model<IPayment> = mongoose.model<IPayment>('Payment', PaymentSchema);

