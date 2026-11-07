import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Award,
  Zap,
  Target,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { DashboardStats } from '../../types';

interface VisualInsightsGridProps {
  stats: DashboardStats | null;
}

export const VisualInsightsGrid: React.FC<VisualInsightsGridProps> = ({ stats }) => {
  const total = stats?.totalApplications || 0;
  const selected = stats?.selected || 0;
  const enrolled = stats?.enrolled || 0;
  const scheduled = stats?.interviews?.scheduled || 0;

  const conversionRate = total > 0 ? Math.round((selected / total) * 100) : 0;
  const clearanceRate =
    scheduled + selected > 0 ? Math.round((selected / (scheduled + selected)) * 100) : 0;
  const feeRate = selected > 0 ? Math.round((enrolled / selected) * 100) : 0;

  const insights = [
    {
      title: 'Placement Conversion Rate',
      value: `${conversionRate}%`,
      subtitle: `${selected} of ${total} candidates selected`,
      badge: '+4.2% vs last month',
      icon: <Award className="w-5 h-5 text-emerald-600" />,
      accentBg: 'bg-emerald-500',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      borderHover: 'hover:border-emerald-300',
      gradient: 'from-emerald-500/10 to-teal-500/5',
      progress: Math.min(conversionRate, 100),
    },
    {
      title: 'Interview Clearance Ratio',
      value: `${clearanceRate}%`,
      subtitle: 'Technical & HR rounds success',
      badge: 'High Performance',
      icon: <Target className="w-5 h-5 text-blue-600" />,
      accentBg: 'bg-blue-600',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      borderHover: 'hover:border-blue-300',
      gradient: 'from-blue-500/10 to-indigo-500/5',
      progress: Math.min(clearanceRate, 100),
    },
    {
      title: 'Fee Realization Rate',
      value: `${feeRate}%`,
      subtitle: `${enrolled} paid enrollments confirmed`,
      badge: 'Revenue Verified',
      icon: <Zap className="w-5 h-5 text-amber-600" />,
      accentBg: 'bg-amber-500',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      borderHover: 'hover:border-amber-300',
      gradient: 'from-amber-500/10 to-yellow-500/5',
      progress: Math.min(feeRate, 100),
    },
    {
      title: 'Operational Compliance',
      value: '99.4%',
      subtitle: 'Audit & placement integrity',
      badge: 'Audit Verified',
      icon: <ShieldCheck className="w-5 h-5 text-purple-600" />,
      accentBg: 'bg-purple-600',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
      borderHover: 'hover:border-purple-300',
      gradient: 'from-purple-500/10 to-pink-500/5',
      progress: 99,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {insights.map((item, idx) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.08, duration: 0.4 }}
          whileHover={{ y: -3, boxShadow: '0 12px 24px -6px rgba(15, 39, 68, 0.08)' }}
          className={`bg-white rounded-2xl border border-fic-border p-4 shadow-sm ${item.borderHover} transition-all duration-200 relative overflow-hidden`}
        >
          {/* Subtle gradient background accent */}
          <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-50 pointer-events-none`} />

          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center">
                {item.icon}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeBg}`}>
                {item.badge}
              </span>
            </div>

            <div>
              <div className="text-2xl font-black text-slate-800 leading-tight">
                {item.value}
              </div>
              <div className="text-xs font-semibold text-slate-700 mt-0.5">
                {item.title}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                {item.subtitle}
              </div>
            </div>

            {/* Micro Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.progress}%` }}
                transition={{ duration: 0.8, delay: 0.2 + idx * 0.1, ease: 'easeOut' }}
                className={`h-1.5 rounded-full ${item.accentBg}`}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default VisualInsightsGrid;

