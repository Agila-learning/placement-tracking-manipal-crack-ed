import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type EntityType =
  | 'CANDIDATE'
  | 'APPLICATION'
  | 'INTERVIEW'
  | 'PAYMENT'
  | 'LOAN'
  | 'CAMPUS'
  | 'USER'
  | 'MASTER_DATA'
  | 'AUTH'
  | 'SECURITY';

export interface IActivityLog extends Document {
  actorId?: Types.ObjectId | string;
  actorName: string;
  actorEmail?: string;
  actorRole: string;
  action: string;
  entityType: EntityType;
  entityId?: string;
  applicationNumber?: string;
  candidateName?: string;
  previousState?: any;
  newState?: any;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    actorId: { type: Schema.Types.Mixed },
    actorName: { type: String, required: true },
    actorEmail: { type: String },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, index: true },
    entityType: {
      type: String,
      enum: [
        'CANDIDATE',
        'APPLICATION',
        'INTERVIEW',
        'PAYMENT',
        'LOAN',
        'CAMPUS',
        'USER',
        'MASTER_DATA',
        'AUTH',
        'SECURITY',
      ],
      required: true,
      index: true,
    },
    entityId: { type: String, index: true },
    applicationNumber: { type: String, index: true },
    candidateName: { type: String },
    previousState: { type: Schema.Types.Mixed },
    newState: { type: Schema.Types.Mixed },
    details: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Indexes for fast auditing lookups
ActivityLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
ActivityLogSchema.index({ applicationNumber: 1, timestamp: -1 });

export const ActivityLog: Model<IActivityLog> = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

