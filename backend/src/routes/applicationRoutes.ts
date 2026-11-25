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
  bulkUpdateCommissionStatus,
  updateEnrollmentFee,
  updateCandidateAndApplicationDetails,
  syncProgramFee,
  deleteApplication,
  downloadCandidateImportTemplate,
  importCandidatesExcel,
  exportCandidatesExcel,
} from '../controllers/candidateController';
import { authenticateToken } from '../middleware/auth';
import { hrAndAbove, adminAndAbove, accountsAndAbove, superAdminOnly } from '../middleware/rbac';
import { resumeUpload, excelUpload } from '../middleware/upload';

const router = Router();
router.use(authenticateToken);

// Excel Template, Import & Export (Placed before /:id routes)
router.get('/excel/template', downloadCandidateImportTemplate);
router.post('/excel/import', hrAndAbove, excelUpload.single('file'), importCandidatesExcel);
router.get('/excel/export', exportCandidatesExcel);

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

// Permanently delete candidate & application (Admin & Super Admin)
router.delete('/:id', adminAndAbove, deleteApplication);

// Update overall status
router.patch('/:id/status', hrAndAbove, updateApplicationStatus);

// Edit candidate and application details
router.put('/:id/candidate-details', hrAndAbove, updateCandidateAndApplicationDetails);

// Update interview round for an application
router.patch('/:id/interview/:roundId', hrAndAbove, updateInterviewRound);

// Resume upload for existing candidate
router.post('/candidate/:candidateId/resume', hrAndAbove, resumeUpload.single('resume'), updateCandidateResume);

// Payment management (Accounts + Admin + HR)
router.post('/:applicationId/payment', hrAndAbove, recordPayment);
router.patch('/:applicationId/payment/transaction/:transactionMongoId/verify', accountsAndAbove, verifyPaymentTransaction);

// Loan & Campus (Admin + HR update, Accounts can view)
router.patch('/:applicationId/loan', hrAndAbove, updateLoanStatus);
router.patch('/:applicationId/campus', hrAndAbove, updateCampusStatus);

// Activity logs
router.get('/logs/:applicationNumber', getApplicationActivityLogs);

// Commission status (Super Admin only)
router.patch('/commission/bulk', superAdminOnly, bulkUpdateCommissionStatus);
router.patch('/:applicationId/commission', superAdminOnly, updateCommissionStatus);

// Enrollment fee edit
router.patch('/:applicationId/payment/fee', hrAndAbove, updateEnrollmentFee);
router.post('/:id/sync-program-fee', hrAndAbove, syncProgramFee);

export default router;

