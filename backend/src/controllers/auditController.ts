import { Request, Response } from 'express';
import { ActivityLog } from '../models/ActivityLog';
import { sendSuccess, sendError } from '../utils/response';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '100',
      entityType,
      action,
      actorId,
      fromDate,
      toDate,
      applicationNumber,
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page)));
    const limitNum = Math.min(500, parseInt(String(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (entityType) filter.entityType = String(entityType);
    if (action) filter.action = { $regex: String(action), $options: 'i' };
    if (actorId) filter.actorId = actorId;
    if (applicationNumber) filter.applicationNumber = String(applicationNumber);
    if (fromDate || toDate) {
      filter.timestamp = {};
      if (fromDate) filter.timestamp.$gte = new Date(String(fromDate));
      if (toDate) filter.timestamp.$lte = new Date(String(toDate));
    }
    if (search) {
      filter.$or = [
        { actorName: { $regex: String(search), $options: 'i' } },
        { action: { $regex: String(search), $options: 'i' } },
        { candidateName: { $regex: String(search), $options: 'i' } },
        { applicationNumber: { $regex: String(search), $options: 'i' } },
      ];
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limitNum).lean(),
      ActivityLog.countDocuments(filter),
    ]);

    sendSuccess(res, logs, 'Audit logs retrieved.', 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    sendError(res, 'Failed to fetch audit logs.', 500);
  }
};

