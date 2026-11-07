import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController';
import { authenticateToken } from '../middleware/auth';
import { adminAndAbove } from '../middleware/rbac';

const router = Router();
router.use(authenticateToken, adminAndAbove);
router.get('/', getAuditLogs);

export default router;

