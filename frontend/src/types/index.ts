// Shared TypeScript types for the FIC CRM frontend

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'HR_EXECUTIVE' | 'ACCOUNTS';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE';
  lastLoginAt?: string;
}

export interface Bank {
  _id: string;
  name: string;
  code: string;
  status: 'ACTIVE' | 'INACTIVE';
  description?: string;
}

export interface Vendor {
  _id: string;
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE';
  candidateCount?: number;
}

export interface InterviewRoundConfig {
  roundId: string;
  roundName: string;
  isMandatory: boolean;
  order: number;
  defaultMode?: 'Online' | 'Offline' | 'Telephonic';
}

export interface Program {
  _id: string;
  bankId: string | Bank;
  bankName: string;
  name: string;
  code: string;
  designation?: string;
  salaryPackage?: string;
  location?: string;
  vendorAvailability: string[];
  interviewRoundsConfig: InterviewRoundConfig[];
  enrollmentFeeAmount: number;
  paymentTrigger: 'BEFORE_INTERVIEW' | 'AFTER_SELECTION';
  isRefundable: boolean;
  loanAvailable: boolean;
  campusApplicable: boolean;
  batchNumber?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export type InterviewRoundStatus =
  | 'Yet to Schedule'
  | 'Scheduled'
  | 'Completed'
  | 'Selected'
  | 'Rejected'
  | 'Absent'
  | 'Dropped'
  | 'Not Applicable'
  | 'On Hold';

export type ApplicationStatus =
  | 'Registered'
  | 'Documents Pending'
  | 'Referred'
  | 'Awaiting Interview'
  | 'Interview in Progress'
  | 'Selected'
  | 'Rejected'
  | 'Dropped'
  | 'Not Interested'
  | 'On Hold'
  | 'Enrollment Fee Pending'
  | 'Loan Processing'
  | 'Campus Reporting Pending'
  | 'Arrived in Campus';

export type PaymentRoute = 'ROUTE_A_VENDOR_LOAN' | 'ROUTE_B_FULL_PAYMENT';
export type PaymentStatus = 'Pending' | 'Partially Paid' | 'Paid' | 'Refund Pending' | 'Refunded' | 'Not Applicable';
export type LoanStatusType = 'Not Sanctioned' | 'Applied' | 'Under Review' | 'Sanctioned' | 'Disbursed' | 'Rejected' | 'Not Applicable';
export type CampusStatusType = 'Pending' | 'Scheduled' | 'Arrived in Campus' | 'Completed' | 'Dropped' | 'Cancelled' | 'Not Applicable';

export interface InterviewAttempt {
  _id: string;
  attemptNumber: number;
  scheduledDate?: string;
  scheduledTime?: string;
  interviewMode: 'Online' | 'Offline' | 'Telephonic';
  venueOrLink?: string;
  interviewerName?: string;
  status: InterviewRoundStatus;
  result?: string;
  remarks?: string;
  updatedByName: string;
  updatedAt: string;
}

export interface InterviewRound {
  roundId: string;
  roundName: string;
  isMandatory: boolean;
  order: number;
  currentStatus: InterviewRoundStatus;
  scheduledDate?: string;
  scheduledTime?: string;
  interviewMode?: 'Online' | 'Offline' | 'Telephonic';
  venueOrLink?: string;
  interviewerName?: string;
  result?: string;
  remarks?: string;
  lastUpdated?: string;
  attempts: InterviewAttempt[];
}

export interface Payment {
  _id: string;
  applicationId: string;
  applicationNumber: string;
  paymentRoute: PaymentRoute;
  enrollmentFeeAmount: number;
  amountPaid: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  paymentTrigger: 'BEFORE_INTERVIEW' | 'AFTER_SELECTION';
  transactions: PaymentTransaction[];
  refund: RefundDetails;
}

export interface PaymentTransaction {
  _id: string;
  transactionId: string;
  amount: number;
  paymentMode: string;
  paymentDate: string;
  referenceNotes?: string;
  receiptNumber?: string;
  recordedByName: string;
  isVerified: boolean;
  verifiedByName?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface RefundDetails {
  isRefundable: boolean;
  refundAmount: number;
  refundStatus: 'NONE' | 'REQUESTED' | 'APPROVED' | 'PROCESSED' | 'REJECTED';
}

export interface LoanStatus {
  _id: string;
  applicationId: string;
  isLoanRequired: boolean;
  loanStatus: LoanStatusType;
  vendorName?: string;
  sanctionDate?: string;
  sanctionAmount?: number;
  remarks?: string;
}

export interface CampusStatus {
  _id: string;
  applicationId: string;
  campusStatus: CampusStatusType;
  arrivalDate?: string;
  campusLocation?: string;
  reportingBatch?: string;
  remarks?: string;
}

export interface Candidate {
  _id: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  dateOfBirth?: string;
  state?: string;
  city?: string;
  resumeUrl?: string;
  resumeOriginalName?: string;
  totalApplicationsCount: number;
}

export interface Application {
  _id: string;
  applicationNumber: string;
  candidateId: string | Candidate;
  candidateName: string;
  candidateEmail: string;
  candidateMobile: string;
  bankId: string;
  bankName: string;
  programId: string;
  programName: string;
  vendorId?: string;
  vendorName: string;
  hrReferenceId?: string;
  hrReferenceName: string;
  batchNumber?: string;
  paymentRoute: PaymentRoute;
  overallStatus: ApplicationStatus;
  interviewRounds: InterviewRound[];
  remarks?: string;
  registrationDate: string;
  createdAt: string;
  updatedAt: string;
  payment?: Payment;
  loan?: LoanStatus;
  campus?: CampusStatus;
  commissionStatus?: 'PENDING' | 'COLLECTED' | 'NOT_APPLICABLE';
  commissionAmount?: number;
  commissionCollectedDate?: string;
  commissionNotes?: string;
  commissionUpdatedByName?: string;
  commissionUpdatedAt?: string;
}

export interface DashboardStats {
  totalApplications: number;
  byStatus: Record<string, number>;
  byVendor: Record<string, number>;
  byBank: Array<{ _id: string; count: number }>;
  byProgram: Array<{ _id: string; count: number }>;
  interviews: { scheduled: number; yetToSchedule: number };
  payments: Record<string, { count: number; totalFee: number; totalPaid: number }>;
  loans: Record<string, number>;
  campus: Record<string, number>;
  selected: number;
  rejected: number;
  dropped: number;
  enrolled: number;
  commission?: { collected: number; pending: number; notApplicable: number; notSet?: number };
  alerts?: {
    pendingInterview: number;
    feePending: number;
    selectedCandidates: number;
    onHoldCandidates?: number;
    commissionPending: number;
  };
}

export interface ActivityLog {
  _id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  applicationNumber?: string;
  candidateName?: string;
  details?: string;
  previousState?: any;
  newState?: any;
  timestamp: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export const ALL_APPLICATION_STATUSES: ApplicationStatus[] = [
  'Registered', 'Documents Pending', 'Referred', 'Awaiting Interview',
  'Interview in Progress', 'Selected', 'Rejected', 'Dropped',
  'Not Interested', 'On Hold', 'Enrollment Fee Pending',
  'Loan Processing', 'Campus Reporting Pending', 'Arrived in Campus',
];

export const ALL_INTERVIEW_STATUSES: InterviewRoundStatus[] = [
  'Yet to Schedule', 'Scheduled', 'Completed', 'Selected', 'Rejected',
  'Absent', 'Dropped', 'Not Applicable', 'On Hold',
];

