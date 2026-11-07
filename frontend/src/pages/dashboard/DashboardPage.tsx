import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  MapPin,
  Sparkles,
  Banknote,
  ArrowRight,
  Bell,
  ShieldAlert,
  Award,
} from 'lucide-react';
import { applicationsApi } from '../../api/endpoints';
import { DashboardStats } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { CorporateHeroBanner } from '../../components/dashboard/CorporateHeroBanner';
import { AnimatedCounter } from '../../components/dashboard/AnimatedCounter';
import { RegisterCandidateModal } from '../candidates/RegisterCandidateModal';
import { PlacementPipelineTimeline } from '../../components/dashboard/PlacementPipelineTimeline';
import { StatusDonutChart } from '../../components/dashboard/StatusDonutChart';
import { VendorBarChart } from '../../components/dashboard/VendorBarChart';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
  sub?: string;
  duration?: number;
}

const cardItemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = 'bg-blue-50 text-blue-600',
  sub,
  duration = 1.2,
}) => (
  <motion.div
    variants={cardItemVariants}
    whileHover={{ y: -4, boxShadow: '0 12px 25px -6px rgba(15, 39, 68, 0.1)' }}
    className="bg-white rounded-xl border border-fic-border p-3.5 sm:p-4 flex items-start gap-3 sm:gap-3.5 shadow-sm transition-all hover:border-slate-300 group cursor-default w-full"
  >
    <motion.div
      whileHover={{ scale: 1.1, rotate: [0, -6, 6, 0] }}
      transition={{ duration: 0.3 }}
      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${color}`}
    >
      {icon}
    </motion.div>
    <div className="min-w-0 flex-1">
      <div className="text-xs sm:text-xs text-slate-500 font-medium truncate">{title}</div>
      <div className="text-xl sm:text-2xl font-extrabold text-slate-800 leading-tight tracking-tight mt-0.5">
        {typeof value === 'number' ? (
          <AnimatedCounter value={value} duration={duration} />
        ) : (
          value
        )}
      </div>
      {sub && <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">{sub}</div>}
    </div>
  </motion.div>
);

export const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const loadStats = useCallback(async () => {
    try {
      const res = await applicationsApi.dashboard();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch {
      toast.error('Failed to load dashboard statistics.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const s = stats;

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.07,
        delayChildren: 0.05,
      },
    },
  };

  const sectionVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: 'easeOut' },
    },
  };

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Corporate Hero Banner immediately below HorizontalNav */}
      <CorporateHeroBanner
        onAddCandidate={() => setShowRegisterModal(true)}
        onViewCandidates={() => navigate('/candidates')}
      />

      {/* 2. Loading Skeleton Shimmer */}
      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-fic-border p-4 h-24 skeleton" />
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-fic-border p-6 h-48 skeleton" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-fic-border p-6 h-72 skeleton" />
            <div className="bg-white rounded-2xl border border-fic-border p-6 h-72 skeleton" />
          </div>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Animated Placement Pipeline Lifecycle Timeline */}
          <PlacementPipelineTimeline stats={s} />

          {/* Section: Overview Header */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <h2 className="text-lg font-bold text-fic-navy flex items-center gap-2">
                Placement Pipeline Overview
              </h2>
              <p className="text-xs text-slate-500">Live operational data and candidate milestones</p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-fic-yellow" />
              Auto-sync enabled
            </span>
          </div>

          {/* Top Level Key Stats Grid */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4"
          >
            <StatCard
              title="Total Applications"
              value={s?.totalApplications || 0}
              icon={<Users className="w-5 h-5" />}
              color="bg-fic-navy/10 text-fic-navy"
              sub="All registered candidates"
            />
            <StatCard
              title="Selected"
              value={s?.selected || 0}
              icon={<CheckCircle className="w-5 h-5" />}
              color="bg-green-100 text-green-600"
              sub="Bank interview cleared"
            />
            <StatCard
              title="Rejected"
              value={s?.rejected || 0}
              icon={<XCircle className="w-5 h-5" />}
              color="bg-red-100 text-red-600"
              sub="Did not clear rounds"
            />
            <StatCard
              title="Dropped"
              value={s?.dropped || 0}
              icon={<AlertTriangle className="w-5 h-5" />}
              color="bg-slate-100 text-slate-600"
              sub="Withdrawn / Inactive"
            />
            <StatCard
              title="Enrolled (Paid)"
              value={s?.enrolled || 0}
              icon={<DollarSign className="w-5 h-5" />}
              color="bg-emerald-100 text-emerald-600"
              sub="Fee paid & confirmed"
            />
          </motion.div>

          {/* Commission Tracking Dedicated KPI Card */}
          <motion.div
            variants={sectionVariants}
            className="bg-gradient-to-r from-indigo-900/5 via-purple-900/5 to-blue-900/5 border border-purple-200/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    Placement Commission KPI
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold uppercase">
                      FIC Placement Revenue
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">Track candidate placement commission status and collection integrity</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/candidates')}
                className="text-xs text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-purple-200 shadow-2xs hover:bg-purple-50 transition-colors"
              >
                <span>View Candidates</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white/90 backdrop-blur-xs border border-emerald-200 rounded-xl p-3 sm:p-3.5 flex items-center justify-between shadow-2xs hover:border-emerald-300 transition-colors">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                    Collected
                  </div>
                  <div className="text-2xl font-black text-emerald-700 mt-0.5">
                    <AnimatedCounter value={s?.commission?.collected || 0} />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Placements completed & paid</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-xs border border-amber-200 rounded-xl p-3 sm:p-3.5 flex items-center justify-between shadow-2xs hover:border-amber-300 transition-colors">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">
                    Pending Collection
                  </div>
                  <div className="text-2xl font-black text-amber-700 mt-0.5">
                    <AnimatedCounter value={s?.commission?.pending || 0} />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Awaiting payout clearance</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
                  ⏳
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-xs border border-slate-200 rounded-xl p-3 sm:p-3.5 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-colors">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Not Applicable / Open
                  </div>
                  <div className="text-2xl font-black text-slate-700 mt-0.5">
                    <AnimatedCounter value={(s?.commission?.notApplicable || 0) + (s?.commission?.notSet || 0)} />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Pre-placement / N/A</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm">
                  —
                </div>
              </div>
            </div>
          </motion.div>

          {/* Interview Status Cards */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
          >
            <StatCard
              title="Interviews Scheduled"
              value={s?.interviews?.scheduled || 0}
              icon={<Clock className="w-5 h-5" />}
              color="bg-blue-100 text-blue-600"
              sub="Upcoming and in-progress rounds"
            />
            <StatCard
              title="Interviews Yet to Schedule"
              value={s?.interviews?.yetToSchedule || 0}
              icon={<AlertTriangle className="w-5 h-5" />}
              color="bg-amber-100 text-amber-600"
              sub="Pending interview slot allocation"
            />
          </motion.div>

          {/* Interactive Donut Chart & Bar Chart Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Status Donut Chart */}
            <StatusDonutChart
              byStatus={s?.byStatus || {}}
              total={s?.totalApplications || 0}
            />

            {/* 2. Vendor Bar Chart */}
            <VendorBarChart
              byVendor={s?.byVendor || {}}
              totalApplications={s?.totalApplications || 0}
            />
          </div>

          {/* Payment & Campus Details Grid */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Enrollment Fee Status */}
            <motion.div
              variants={sectionVariants}
              whileHover={{ y: -2 }}
              className="bg-white rounded-2xl border border-fic-border p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  Enrollment Fee Tracking
                </h3>
                <span className="text-xs text-slate-400 font-medium">Payment Records</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {Object.entries(s?.payments || {}).length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No fee records found</p>
                ) : (
                  Object.entries(s?.payments || {}).map(([status, data]) => (
                    <div
                      key={status}
                      className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors"
                    >
                      <span className="text-xs text-slate-700 font-medium">{status}</span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                        {(data as any).count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Campus & Loan Status */}
            <motion.div
              variants={sectionVariants}
              whileHover={{ y: -2 }}
              className="bg-white rounded-2xl border border-fic-border p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                    <MapPin className="w-4 h-4" />
                  </div>
                  Campus & Loan Progress
                </h3>
                <span className="text-xs text-slate-400 font-medium">Logistics & Funding</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-semibold mb-2 uppercase tracking-wider">Campus</p>
                  <div className="space-y-1.5">
                    {Object.entries(s?.campus || {}).length === 0 ? (
                      <p className="text-[11px] text-slate-400">No data</p>
                    ) : (
                      Object.entries(s?.campus || {}).map(([st, cnt]) => (
                        <div key={st} className="flex justify-between text-xs py-1 border-b border-slate-200/50">
                          <span className="text-slate-600 truncate mr-1">{st}</span>
                          <span className="font-bold text-fic-navy">{cnt}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-semibold mb-2 uppercase tracking-wider">Loan</p>
                  <div className="space-y-1.5">
                    {Object.entries(s?.loans || {}).length === 0 ? (
                      <p className="text-[11px] text-slate-400">No data</p>
                    ) : (
                      Object.entries(s?.loans || {}).map(([st, cnt]) => (
                        <div key={st} className="flex justify-between text-xs py-1 border-b border-slate-200/50">
                          <span className="text-slate-600 truncate mr-1">{st}</span>
                          <span className="font-bold text-fic-navy">{cnt}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}

      {/* Register Candidate Modal Triggered from Banner */}
      <AnimatePresence>
        {showRegisterModal && (
          <RegisterCandidateModal
            isOpen={showRegisterModal}
            onClose={() => setShowRegisterModal(false)}
            onSuccess={() => {
              setShowRegisterModal(false);
              loadStats();
              toast.success('Candidate registered successfully!');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardPage;
