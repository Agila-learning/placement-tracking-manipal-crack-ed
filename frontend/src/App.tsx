import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { HorizontalNav } from './components/layout/HorizontalNav';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { CandidatesPage } from './pages/candidates/CandidatesPage';
import { CandidateDetailPage } from './pages/candidates/CandidateDetailPage';
import { BanksPage } from './pages/masters/BanksPage';
import { ProgramsPage } from './pages/masters/ProgramsPage';
import { VendorsPage } from './pages/masters/VendorsPage';
import { UsersPage } from './pages/users/UsersPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AuditLogsPage } from './pages/audit/AuditLogsPage';
import { CommissionPage } from './pages/commission/CommissionPage';
import { LoadingSpinner } from './components/ui';

// Protected Route Wrapper
const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: string[] }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 bg-fic-yellow rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-fic-navy font-black">FIC</span>
          </div>
          <LoadingSpinner size="md" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <HorizontalNav>
      <Outlet />
    </HorizontalNav>
  );
};

// Auth Route (redirect if already logged in)
const AuthRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-fic-navy">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

export const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <ToastProvider>
        <Routes>
          {/* Public Routes */}
          <Route element={<AuthRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/candidates" element={<CandidatesPage />} />
            <Route path="/candidates/:id" element={<CandidateDetailPage />} />
            <Route path="/commissions" element={<CommissionPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>

          {/* Admin-only Routes */}
          <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} />}>
            <Route path="/masters/banks" element={<BanksPage />} />
            <Route path="/masters/programs" element={<ProgramsPage />} />
            <Route path="/masters/vendors" element={<VendorsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/audit" element={<AuditLogsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;

