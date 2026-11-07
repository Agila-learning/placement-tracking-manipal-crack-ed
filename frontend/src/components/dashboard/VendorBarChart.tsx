import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Award } from 'lucide-react';

interface VendorBarChartProps {
  byVendor: Record<string, number>;
  totalApplications: number;
}

const GRADIENTS = [
  'from-fic-navy to-blue-600',
  'from-blue-600 to-indigo-500',
  'from-emerald-600 to-teal-500',
  'from-amber-500 to-yellow-400',
  'from-purple-600 to-pink-500',
  'from-cyan-600 to-blue-400',
];

export const VendorBarChart: React.FC<VendorBarChartProps> = ({
  byVendor,
  totalApplications,
}) => {
  const [activeBar, setActiveBar] = useState<string | null>(null);

  const rawEntries = Object.entries(byVendor || {});
  // Sort descending by candidate volume
  const entries = rawEntries.sort(([, a], [, b]) => b - a).slice(0, 7);

  const maxCount = Math.max(...entries.map(([, c]) => c), 1);
  const total = totalApplications > 0 ? totalApplications : entries.reduce((a, [, c]) => a + c, 0) || 1;

  return (
    <div className="bg-white rounded-2xl border border-fic-border p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <BarChart3 className="w-4 h-4" />
            </div>
            Vendor Sourcing Volume & Channel Performance
          </h3>
          <span className="text-xs text-slate-400 font-medium">Top 7 Sourcing Channels</span>
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-slate-400 text-xs">
            <TrendingUp className="w-6 h-6 text-slate-300 mb-1" />
            No vendor performance metrics available
          </div>
        ) : (
          <div className="pt-6 pb-2">
            {/* Visual Bar Chart */}
            <div className="flex items-end justify-between gap-3 h-44 border-b border-slate-200 px-2">
              {entries.map(([vendor, count], idx) => {
                const heightPct = Math.max(12, Math.round((count / maxCount) * 100));
                const sharePct = Math.round((count / total) * 100);
                const isHovered = activeBar === vendor;
                const gradient = GRADIENTS[idx % GRADIENTS.length];

                return (
                  <div
                    key={vendor}
                    onMouseEnter={() => setActiveBar(vendor)}
                    onMouseLeave={() => setActiveBar(null)}
                    className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative"
                  >
                    {/* Tooltip on Hover */}
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -top-10 bg-slate-900 text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-lg whitespace-nowrap z-20 pointer-events-none"
                      >
                        {vendor}: {count} candidates ({sharePct}%)
                      </motion.div>
                    )}

                    {/* Value Badge above bar */}
                    <span className="text-[11px] font-bold text-slate-700 mb-1.5 transition-colors group-hover:text-fic-navy">
                      {count}
                    </span>

                    {/* Animated Growing Bar */}
                    <div className="w-full max-w-[42px] bg-slate-100 rounded-t-xl overflow-hidden h-full flex items-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.9, delay: idx * 0.08, ease: 'easeOut' }}
                        className={`w-full rounded-t-xl bg-gradient-to-t ${gradient} group-hover:brightness-110 shadow-sm transition-all`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels */}
            <div className="flex items-start justify-between gap-3 px-2 pt-2.5">
              {entries.map(([vendor]) => (
                <div
                  key={vendor}
                  className="flex-1 text-center text-[10px] sm:text-xs font-semibold text-slate-600 truncate px-0.5"
                  title={vendor}
                >
                  {vendor}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Insight */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-amber-500" />
          <span>Top Vendor: <strong>{entries[0]?.[0] || 'N/A'}</strong></span>
        </span>
        <span className="font-semibold text-fic-navy">
          {entries[0] ? `${entries[0][1]} candidates` : ''}
        </span>
      </div>
    </div>
  );
};

export default VendorBarChart;

