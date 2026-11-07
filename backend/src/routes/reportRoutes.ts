import { Router } from 'express';
import {
  getInterviewStatusReport,
  getEnrollmentFeeReport,
  exportInterviewReport,
  exportEnrollmentReport,
} from '../controllers/reportController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

router.get('/interview-status', getInterviewStatusReport);
router.get('/enrollment-fee', getEnrollmentFeeReport);
router.get('/interview-status/export', exportInterviewReport);
router.get('/enrollment-fee/export', exportEnrollmentReport);

export default router;

