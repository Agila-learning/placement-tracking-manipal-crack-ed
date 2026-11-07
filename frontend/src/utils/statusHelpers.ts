import {
  ApplicationStatus,
  InterviewRoundStatus,
  PaymentStatus,
  LoanStatusType,
  CampusStatusType,
  PaymentRoute,
} from '../types';

// Status badge colour mappings
export const appStatusBadge: Record<ApplicationStatus, string> = {
  'Registered': 'bg-blue-100 text-blue-700',
  'Documents Pending': 'bg-amber-100 text-amber-700',
  'Referred': 'bg-purple-100 text-purple-700',
  'Awaiting Interview': 'bg-indigo-100 text-indigo-700',
  'Interview in Progress': 'bg-cyan-100 text-cyan-700',
  'Selected': 'bg-green-100 text-green-700',
  'Rejected': 'bg-red-100 text-red-700',
  'Dropped': 'bg-slate-200 text-slate-600',
  'Not Interested': 'bg-slate-100 text-slate-500',
  'On Hold': 'bg-yellow-100 text-yellow-700',
  'Enrollment Fee Pending': 'bg-orange-100 text-orange-700',
  'Loan Processing': 'bg-teal-100 text-teal-700',
  'Campus Reporting Pending': 'bg-violet-100 text-violet-700',
  'Arrived in Campus': 'bg-emerald-100 text-emerald-700',
};

export const interviewStatusBadge: Record<InterviewRoundStatus, string> = {
  'Yet to Schedule': 'bg-slate-100 text-slate-500',
  'Scheduled': 'bg-blue-100 text-blue-700',
  'Completed': 'bg-cyan-100 text-cyan-700',
  'Selected': 'bg-green-100 text-green-700',
  'Rejected': 'bg-red-100 text-red-700',
  'Absent': 'bg-orange-100 text-orange-700',
  'Dropped': 'bg-slate-200 text-slate-500',
  'Not Applicable': 'bg-gray-100 text-gray-400',
  'On Hold': 'bg-yellow-100 text-yellow-700',
};

export const paymentStatusBadge: Record<PaymentStatus, string> = {
  'Pending': 'bg-amber-100 text-amber-700',
  'Partially Paid': 'bg-blue-100 text-blue-700',
  'Paid': 'bg-green-100 text-green-700',
  'Refund Pending': 'bg-orange-100 text-orange-700',
  'Refunded': 'bg-teal-100 text-teal-700',
  'Not Applicable': 'bg-gray-100 text-gray-400',
};

export const loanStatusBadge: Record<LoanStatusType, string> = {
  'Not Sanctioned': 'bg-red-100 text-red-700',
  'Applied': 'bg-blue-100 text-blue-700',
  'Under Review': 'bg-amber-100 text-amber-700',
  'Sanctioned': 'bg-green-100 text-green-700',
  'Disbursed': 'bg-emerald-100 text-emerald-800',
  'Rejected': 'bg-rose-100 text-rose-700',
  'Not Applicable': 'bg-gray-100 text-gray-400',
};

export const campusStatusBadge: Record<CampusStatusType, string> = {
  'Pending': 'bg-amber-100 text-amber-700',
  'Scheduled': 'bg-blue-100 text-blue-700',
  'Arrived in Campus': 'bg-green-100 text-green-700',
  'Completed': 'bg-emerald-100 text-emerald-800',
  'Dropped': 'bg-red-100 text-red-700',
  'Cancelled': 'bg-rose-100 text-rose-700',
  'Not Applicable': 'bg-gray-100 text-gray-400',
};

export const paymentRouteLabel: Record<PaymentRoute, string> = {
  'ROUTE_A_VENDOR_LOAN': 'Vendor Loan',
  'ROUTE_B_FULL_PAYMENT': 'Full Payment',
};

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatCurrency = (amount?: number): string => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

export const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

