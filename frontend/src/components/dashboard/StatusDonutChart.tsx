import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart as PieIcon, Info } from 'lucide-react';

interface StatusDonutChartProps {
  byStatus: Record<string, number>;
  total: number;
}

const PALETTE = [
  { bg: '#10B981', label: 'Emerald' }, // selected
  { bg: '#3B82F6', label: 'Blue' },    // interview
  { bg: '#F59E0B', label: 'Amber' },   // enrolled
  { bg: '#8B5CF6', label: 'Violet' },  // screening
  { bg: '#EC4899', label: 'Pink' },    // offer
  { bg: '#F43F5E', label: 'Rose' },    // rejected
  { bg: '#64748B', label: 'Slate' },   // dropped
  { bg: '#06B6D4', label: 'Cyan' },    // other
];

export const StatusDonutChart: React.FC<StatusDonutChartProps> = ({ byStatus, total }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const entries = Object.entries(byStatus || {}).sort(([, a], [, b]) => b - a);
  const effectiveTotal = total > 0 ? total : entries.reduce((acc, [, val]) => acc + val, 0) || 1;

  // Calculate slice angles for SVG donut
  const radius = 68;
  const circumference = 2 * Math.PI * radius; // ~427.25

  let accumulatedOffset = 0;
  const slices = entries.map(([status, count], i) => {
    const fraction = count / effectiveTotal;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += fraction * circumference;
    const color = PALETTE[i % PALETTE.length].bg;
    const percentage = Math.round(fraction * 100);

    return {
      status,
      count,
      percentage,
      strokeDasharray,
      strokeDashoffset,
      color,
    };
  });

  const activeSlice = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div className="bg-white rounded-2xl border border-fic-border p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <PieIcon className="w-4 h-4" />
          </div>
          Application Status Distribution
        </h3>
        <span className="text-xs text-slate-400 font-medium">{entries.length} Statuses</span>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 text-slate-400 text-xs">
          <Info className="w-6 h-6 text-slate-300 mb-1" />
          No status distribution data available
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
          {/* SVG Donut Circle */}
          <div className="relative flex items-center justify-center py-2">
            <svg width="190" height="190" viewBox="0 0 190 190" className="transform -rotate-90">
              {/* Background circle track */}
              <circle
                cx="95"
                cy="95"
                r={radius}
                fill="transparent"
                stroke="#F1F5F9"
                strokeWidth="24"
              />

              {/* Animated Segment Slices */}
              {slices.map((slice, idx) => (
                <motion.circle
                  key={slice.status}
                  cx="95"
                  cy="95"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={hoveredIndex === idx ? 28 : 24}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeLinecap="round"
                  initial={{ strokeDasharray: `0 ${circumference}` }}
                  animate={{ strokeDasharray: slice.strokeDasharray }}
                  transition={{ duration: 1, delay: idx * 0.1, ease: 'easeOut' }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="cursor-pointer transition-all duration-200"
                />
              ))}
            </svg>

            {/* Central Info Node */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-2xl font-black text-slate-900 leading-none">
                {activeSlice ? activeSlice.count : effectiveTotal.toLocaleString()}
              </span>
              <span className="text-[11px] font-medium text-slate-500 mt-1 max-w-[90px] truncate">
                {activeSlice ? activeSlice.status : 'Total Candidates'}
              </span>
              {activeSlice && (
                <span className="text-[10px] font-bold text-indigo-600 mt-0.5">
                  {activeSlice.percentage}% of total
                </span>
              )}
            </div>
          </div>

          {/* Interactive Legend List */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {slices.map((slice, idx) => (
              <div
                key={slice.status}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer ${
                  hoveredIndex === idx
                    ? 'bg-slate-100 scale-[1.02] shadow-sm font-semibold'
                    : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate">{slice.status}</span>
                </div>
                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  <span className="text-slate-900 font-bold">{slice.count}</span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    ({slice.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusDonutChart;

