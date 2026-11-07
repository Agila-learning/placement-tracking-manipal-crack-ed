import { api } from './client';
import { User, Bank, Vendor, Program, Application, DashboardStats, ActivityLog } from '../types';

// Auth
export const authApi = {
  login: (identifier: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { identifier, password }),
  logout: () => api.post('/auth/logout', {}),
  me: () => api.get<User>('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
};

// Users
export const usersApi = {
  list: (params?: Record<string, string>) =>
    api.get<User[]>(`/users?${new URLSearchParams(params || {}).toString()}`),
  hrReferences: () => api.get<User[]>('/users/hr-references'),
  create: (data: any) => api.post<User>('/users', data),
  update: (id: string, data: any) => api.put<User>(`/users/${id}`, data),
  toggleStatus: (id: string) => api.patch<User>(`/users/${id}/status`),
};

// Banks
export const banksApi = {
  list: (params?: Record<string, string>) =>
    api.get<Bank[]>(`/banks?${new URLSearchParams(params || {}).toString()}`),
  create: (data: any) => api.post<Bank>('/banks', data),
  update: (id: string, data: any) => api.put<Bank>(`/banks/${id}`, data),
  toggleStatus: (id: string) => api.patch<Bank>(`/banks/${id}/status`),
};

// Programs
export const programsApi = {
  list: (params?: Record<string, string>) =>
    api.get<Program[]>(`/programs?${new URLSearchParams(params || {}).toString()}`),
  get: (id: string) => api.get<Program>(`/programs/${id}`),
  create: (data: any) => api.post<Program>('/programs', data),
  update: (id: string, data: any) => api.put<Program>(`/programs/${id}`, data),
  toggleStatus: (id: string) => api.patch<Program>(`/programs/${id}/status`),
};

// Vendors
export const vendorsApi = {
  list: (params?: Record<string, string>) =>
    api.get<Vendor[]>(`/vendors?${new URLSearchParams(params || {}).toString()}`),
  create: (data: any) => api.post<Vendor>('/vendors', data),
  update: (id: string, data: any) => api.put<Vendor>(`/vendors/${id}`, data),
  toggleStatus: (id: string) => api.patch<Vendor>(`/vendors/${id}/status`),
};

// Applications
export const applicationsApi = {
  dashboard: () => api.get<DashboardStats>('/applications/dashboard/stats'),
  checkDuplicate: (email?: string, mobile?: string) =>
    api.get(`/applications/check-duplicate?${email ? `email=${email}` : ''}${mobile ? `&mobile=${mobile}` : ''}`),
  list: (params?: Record<string, string>) =>
    api.get<Application[]>(`/applications?${new URLSearchParams(params || {}).toString()}`),
  get: (id: string) => api.get<Application>(`/applications/${id}`),
  register: (formData: FormData) => api.post<any>('/applications/register', formData),
  updateStatus: (id: string, data: any) => api.patch(`/applications/${id}/status`, data),
  updateInterview: (id: string, roundId: string, data: any) =>
    api.patch(`/applications/${id}/interview/${roundId}`, data),
  recordPayment: (applicationId: string, data: any) =>
    api.post(`/applications/${applicationId}/payment`, data),
  verifyPayment: (applicationId: string, transactionMongoId: string) =>
    api.patch(`/applications/${applicationId}/payment/transaction/${transactionMongoId}/verify`),
  updateLoan: (applicationId: string, data: any) =>
    api.patch(`/applications/${applicationId}/loan`, data),
  updateCampus: (applicationId: string, data: any) =>
    api.patch(`/applications/${applicationId}/campus`, data),
  activityLogs: (applicationNumber: string) =>
    api.get<ActivityLog[]>(`/applications/logs/${applicationNumber}`),
  updateCommission: (applicationId: string, data: any) =>
    api.patch(`/applications/${applicationId}/commission`, data),
  updateEnrollmentFee: (applicationId: string, data: any) =>
    api.patch(`/applications/${applicationId}/payment/fee`, data),
  updateCandidateDetails: (id: string, data: any) =>
    api.put<Application>(`/applications/${id}/candidate-details`, data),
};

// Reports
export const reportsApi = {
  interviewStatus: (params?: Record<string, string>) =>
    api.get<Application[]>(`/reports/interview-status?${new URLSearchParams(params || {}).toString()}`),
  enrollmentFee: (params?: Record<string, string>) =>
    api.get<Application[]>(`/reports/enrollment-fee?${new URLSearchParams(params || {}).toString()}`),
  exportInterview: (params?: Record<string, string>) =>
    `/api/reports/interview-status/export?${new URLSearchParams(params || {}).toString()}`,
  exportEnrollment: (params?: Record<string, string>) =>
    `/api/reports/enrollment-fee/export?${new URLSearchParams(params || {}).toString()}`,
};

// Audit Logs
export const auditApi = {
  list: (params?: Record<string, string>) =>
    api.get<ActivityLog[]>(`/audit-logs?${new URLSearchParams(params || {}).toString()}`),
};

