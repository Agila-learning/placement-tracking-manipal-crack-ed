import { Router } from 'express';
import {
  checkDuplicate,
  registerCandidateAndApplication,
  getApplications,
  getApplicationById,
  updateApplicationStatus,
  updateInterviewRound,
  updateCandidateResume,
  recordPayment,
  verifyPaymentTransaction,
  updateLoanStatus,
  updateCampusStatus,
  getApplicationActivityLogs,
  getDashboardStats,
  updateCommissionStatus,
  updateEnrollmentFee,
  updateCandidateAndApplicationDetails,
  syncProgramFee,
} from '../controllers/candidateController';
import { authenticateToken } from '../middleware/auth';
import { hrAndAbove, adminAndAbove, accountsAndAbove } from '../middleware/rbac';
import { resumeUpload } from '../middleware/upload';

const router = Router();
router.use(authenticateToken);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Duplicate check
router.get('/check-duplicate', hrAndAbove, checkDuplicate);

// Application list (candidate tracking table)
router.get('/', getApplications);

// Register new candidate + application
router.post(
  '/register',
  hrAndAbove,
  resumeUpload.single('resume'),
  registerCandidateAndApplication
);

// Single application detail
router.get('/:id', getApplicationById);

// Update overall status
router.patch('/:id/status', hrAndAbove, updateApplicationStatus);

// Edit candidate and application details
router.put('/:id/candidate-details', hrAndAbove, updateCandidateAndApplicationDetails);

// Update interview round for an application
router.patch('/:id/interview/:roundId', hrAndAbove, updateInterviewRound);

// Resume upload for existing candidate
router.post('/candidate/:candidateId/resume', hrAndAbove, resumeUpload.single('resume'), updateCandidateResume);

// Payment management (Accounts + Admin)
router.post('/:applicationId/payment', accountsAndAbove, recordPayment);
router.patch('/:applicationId/payment/transaction/:transactionMongoId/verify', accountsAndAbove, verifyPaymentTransaction);

// Loan & Campus (Admin + HR update, Accounts can view)
router.patch('/:applicationId/loan', adminAndAbove, updateLoanStatus);
router.patch('/:applicationId/campus', adminAndAbove, updateCampusStatus);

// Activity logs
router.get('/logs/:applicationNumber', getApplicationActivityLogs);

// Commission status
router.patch('/:applicationId/commission', adminAndAbove, updateCommissionStatus);

// Enrollment fee edit
router.patch('/:applicationId/payment/fee', accountsAndAbove, updateEnrollmentFee);
router.post('/:id/sync-program-fee', accountsAndAbove, syncProgramFee);

export default router;

