import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  BarChart2,
  Settings,
  LogOut,
  ChevronDown,
  Landmark,
  Store,
  UserCheck,
  Shield,
  Menu,
  X,
  Banknote,
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { applicationsApi } from '../../api/endpoints';

// Primary navigation items
const primaryNav = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Candidates', to: '/candidates', icon: <Users className="w-4 h-4" /> },
  { label: 'Commission', to: '/commissions', icon: <Banknote className="w-4 h-4" /> },
  {
    label: 'Masters',
    to: '#',
    icon: <Settings className="w-4 h-4" />,
    hasChildren: true,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    label: 'HR Management',
    to: '/users',
    icon: <UserCheck className="w-4 h-4" />,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  { label: 'Reports', to: '/reports', icon: <BarChart2 className="w-4 h-4" /> },
  {
    label: 'Audit Logs',
    to: '/audit',
    icon: <Shield className="w-4 h-4" />,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
];

// Children for Masters dropdown
const mastersChildren = [
  { label: 'Banks', to: '/masters/banks', icon: <Landmark className="w-4 h-4" /> },
  { label: 'Programs', to: '/masters/programs', icon: <Building2 className="w-4 h-4" /> },
  { label: 'Vendors', to: '/masters/vendors', icon: <Store className="w-4 h-4" /> },
];

export const HorizontalNav = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mastersOpen, setMastersOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [alerts, setAlerts] = useState<{
    pendingInterview: number;
    feePending: number;
    selectedCandidates: number;
    commissionPending: number;
    onHoldCandidates: number;
  }>({
    pendingInterview: 0,
    feePending: 0,
    selectedCandidates: 0,
    commissionPending: 0,
    onHoldCandidates: 0,
  });

  const mastersRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Load alert metrics for notification bell
  useEffect(() => {
    const fetchAlerts = () => {
      applicationsApi.dashboard().then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          setAlerts({
            pendingInterview: d.alerts?.pendingInterview ?? d.interviews?.yetToSchedule ?? 0,
            feePending: d.alerts?.feePending ?? (d.byStatus?.['Enrollment Fee Pending'] || 0),
            selectedCandidates: d.alerts?.selectedCandidates ?? d.selected ?? 0,
            commissionPending: d.alerts?.commissionPending ?? d.commission?.pending ?? 0,
            onHoldCandidates: d.alerts?.onHoldCandidates ?? (d.byStatus?.['On Hold'] || 0),
          });
        }
      }).catch(() => {});
    };

    fetchAlerts();
    window.addEventListener('fic:stats-refresh', fetchAlerts);
    return () => window.removeEventListener('fic:stats-refresh', fetchAlerts);
  }, [location.pathname]);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/login');
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mastersRef.current && !mastersRef.current.contains(event.target as Node)) {
        setMastersOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on route changes
  useEffect(() => {
    setMastersOpen(false);
    setProfileOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isMastersActive = location.pathname.startsWith('/masters');

  const navItemClass = (isActive: boolean) =>
    `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-fic-yellow text-fic-navy font-semibold shadow-sm'
        : 'text-slate-300 hover:text-white hover:bg-white/10'
    }`;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="bg-white border-b border-fic-border shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-fic-navy hover:bg-slate-100 md:hidden flex-shrink-0"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <NavLink to="/dashboard" className="flex items-center gap-2.5 sm:gap-3 hover:opacity-95 transition-opacity min-w-0">
              <img
                src="/fic-logo.svg"
                alt="Forge India Connect"
                className="h-9 w-9 sm:h-10 sm:w-10 object-contain rounded flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-bold text-fic-navy leading-tight tracking-tight truncate">
                  Forge India Connect
                </div>
                <div className="text-[10px] sm:text-xs text-fic-muted font-medium truncate">Banking Placement CRM</div>
              </div>
            </NavLink>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3.5 flex-shrink-0">
            <div className="hidden sm:flex items-center text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 inline-block animate-pulse"></span>
              Live CRM System
            </div>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl text-slate-600 hover:text-fic-navy hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {((alerts.pendingInterview || 0) + (alerts.feePending || 0) + (alerts.onHoldCandidates || 0) + (alerts.commissionPending || 0)) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white animate-pulse">
                    {(alerts.pendingInterview || 0) + (alerts.feePending || 0) + (alerts.onHoldCandidates || 0) + (alerts.commissionPending || 0)}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 sm:right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-xs sm:w-80 bg-white border border-fic-border rounded-2xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-fic-navy" />
                        <span className="text-xs font-bold text-fic-navy uppercase tracking-wider">
                          Operational Alerts
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold bg-blue-100 text-fic-navy px-2 py-0.5 rounded-full">
                        Live Sync
                      </span>
                    </div>

                    <div className="p-2 space-y-1.5 divide-y divide-slate-100 text-xs">
                      {/* Notification 1: Pending Interview */}
                      <div
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate('/candidates');
                        }}
                        className="p-2.5 rounded-xl hover:bg-amber-50/80 cursor-pointer transition-colors flex items-start gap-2.5"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">Pending Interview</span>
                            <span className="font-extrabold text-amber-800 bg-amber-100 px-2 py-0.2 rounded-full text-[11px]">
                              {alerts.pendingInterview}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Candidates awaiting interview scheduling
                          </p>
                        </div>
                      </div>

                      {/* Notification 2: Fee Payment Pending */}
                      <div
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate('/candidates');
                        }}
                        className="p-2.5 rounded-xl hover:bg-rose-50/80 cursor-pointer transition-colors flex items-start gap-2.5 pt-2"
                      >
                        <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">Enrollment Fee Pending</span>
                            <span className="font-extrabold text-rose-800 bg-rose-100 px-2 py-0.2 rounded-full text-[11px]">
                              {alerts.feePending}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Selected candidates awaiting fee confirmation
                          </p>
                        </div>
                      </div>

                      {/* Notification 3: Bank Selected Candidates */}
                      <div
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate('/candidates');
                        }}
                        className="p-2.5 rounded-xl hover:bg-emerald-50/80 cursor-pointer transition-colors flex items-start gap-2.5 pt-2"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">Bank Selected</span>
                            <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded-full text-[11px]">
                              {alerts.selectedCandidates}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Cleared bank rounds & onboarding
                          </p>
                        </div>
                      </div>

                      {/* Notification 4: On Hold Candidates */}
                      <div
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate('/candidates?status=On+Hold');
                        }}
                        className="p-2.5 rounded-xl hover:bg-amber-50/90 cursor-pointer transition-colors flex items-start gap-2.5 pt-2"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                          ⏸️
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">On Hold Candidates</span>
                            <span className="font-extrabold text-amber-800 bg-amber-100 px-2 py-0.2 rounded-full text-[11px]">
                              {alerts.onHoldCandidates || 0}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Awaiting documents, reschedule or follow-up
                          </p>
                        </div>
                      </div>

                      {/* Notification 5: Commission Pending */}
                      <div
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate('/commissions');
                        }}
                        className="p-2.5 rounded-xl hover:bg-purple-50/80 cursor-pointer transition-colors flex items-start gap-2.5 pt-2"
                      >
                        <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Banknote className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">Commission Pending</span>
                            <span className="font-extrabold text-purple-800 bg-purple-100 px-2 py-0.2 rounded-full text-[11px]">
                              {alerts.commissionPending}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Placed candidates with commission to collect
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate('/candidates');
                        }}
                        className="text-xs font-semibold text-fic-navy hover:underline"
                      >
                        View All In Candidate Queue →
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors text-fic-navy border border-transparent hover:border-slate-200"
              >
                <div className="w-8 h-8 rounded-full bg-fic-navy text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm ring-2 ring-white">
                  {user?.name ? user.name.slice(0, 2) : 'HR'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</div>
                  <div className="text-[10px] text-slate-500 capitalize">
                    {user?.role ? user.role.replace('_', ' ').toLowerCase() : 'Staff'}
                  </div>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                    profileOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 w-56 bg-white border border-fic-border rounded-xl shadow-xl py-1.5 z-50 origin-top-right"
                  >
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Signed in as</p>
                      <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{user?.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <div className="p-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Primary Horizontal Navigation Row (Desktop) */}
      <nav className="bg-fic-navy text-white hidden md:block shadow-md border-b border-fic-navy-dark relative z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center py-1.5 gap-1.5">
          {primaryNav.map((item) => {
            // Check roles if defined
            if (item.roles && user && !item.roles.includes(user.role)) return null;

            if (item.hasChildren) {
              return (
                <div key={item.label} className="relative" ref={mastersRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMastersOpen((prev) => !prev);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                      isMastersActive
                        ? 'bg-fic-yellow text-fic-navy font-semibold shadow-sm'
                        : mastersOpen
                        ? 'bg-white/15 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        mastersOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {mastersOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute left-0 top-full mt-1.5 w-52 bg-fic-navy border border-white/15 rounded-xl shadow-2xl py-1.5 z-50 origin-top-left ring-1 ring-black/20"
                      >
                        <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/10 mb-1">
                          Master Settings
                        </div>
                        {mastersChildren.map((child) => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            onClick={() => setMastersOpen(false)}
                            className={({ isActive }) =>
                              `flex items-center gap-2.5 px-3 py-2 text-sm font-medium mx-1 rounded-lg transition-colors ${
                                isActive
                                  ? 'bg-fic-yellow text-fic-navy font-semibold shadow-sm'
                                  : 'text-slate-200 hover:text-white hover:bg-white/10'
                              }`
                            }
                          >
                            {child.icon}
                            <span>{child.label}</span>
                          </NavLink>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => navItemClass(isActive)}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-fic-navy text-white px-4 py-3 space-y-1 shadow-lg border-b border-fic-navy-dark overflow-hidden z-30"
          >
            {primaryNav.map((item) => {
              if (item.roles && user && !item.roles.includes(user.role)) return null;

              if (item.hasChildren) {
                return (
                  <div key={item.label} className="space-y-1 pt-1">
                    <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-fic-yellow uppercase tracking-wider">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    <div className="pl-4 space-y-1">
                      {mastersChildren.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                              isActive
                                ? 'bg-fic-yellow text-fic-navy font-semibold'
                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                            }`
                          }
                        >
                          {child.icon}
                          <span>{child.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'bg-fic-yellow text-fic-navy font-semibold'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 p-3 sm:p-5 md:p-6 max-w-7xl w-full mx-auto">{children}</main>
    </div>
  );
};

export default HorizontalNav;
