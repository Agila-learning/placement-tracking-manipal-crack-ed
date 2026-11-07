import { Request } from 'express';
import { ActivityLog, EntityType } from '../models/ActivityLog';

interface LogActionOptions {
  req?: Request;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  actorEmail?: string;
  action: string;
  entityType: EntityType;
  entityId?: string;
  applicationNumber?: string;
  candidateName?: string;
  previousState?: any;
  newState?: any;
  details?: string;
}

export const logActivity = async (options: LogActionOptions): Promise<void> => {
  try {
    const { req } = options;
    const actorUser = (req as any)?.user;

    const actorId = options.actorId || actorUser?.userId || actorUser?._id;
    const actorName = options.actorName || actorUser?.name || 'System';
    const actorRole = options.actorRole || actorUser?.role || 'SYSTEM';
    const actorEmail = options.actorEmail || actorUser?.email;

    const ipAddress =
      (req?.headers['x-forwarded-for'] as string) ||
      req?.socket?.remoteAddress ||
      '127.0.0.1';
    const userAgent = req?.headers['user-agent'] || 'Unknown';

    await ActivityLog.create({
      actorId,
      actorName,
      actorEmail,
      actorRole,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      applicationNumber: options.applicationNumber,
      candidateName: options.candidateName,
      previousState: options.previousState,
      newState: options.newState,
      details: options.details,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[AuditLog] Failed to record activity log:', error);
  }
};

