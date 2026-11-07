import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { Calendar, UserPlus, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface CorporateHeroBannerProps {
  onAddCandidate?: () => void;
  onViewCandidates?: () => void;
}

export const CorporateHeroBanner: React.FC<CorporateHeroBannerProps> = ({
  onAddCandidate,
  onViewCandidates,
}) => {
  const { user } = useAuth();

  // Dynamic time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Format current date: e.g. Friday, November 6, 2026
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative w-full rounded-2xl overflow-hidden shadow-xl mb-6 bg-gradient-to-r from-[#001D4A] via-[#003882] to-[#0A5BC4] text-white border border-blue-400/25 select-none"
    >
      {/* ── Background Luminous Ribbons & Dot Grid ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle dot matrix pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-15" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dot-grid-hero" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#93C5FD" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid-hero)" />
        </svg>

        {/* Dynamic flowing cyan/blue wave lines */}
        <svg
          viewBox="0 0 1200 240"
          className="absolute -right-10 -bottom-10 w-[850px] h-full opacity-40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 0 180 C 300 220 500 40 800 120 C 1000 180 1150 60 1250 80"
            stroke="url(#blue-line-1)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 100 240 C 400 200 600 80 900 160 C 1080 200 1180 120 1250 140"
            stroke="url(#blue-line-2)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M 250 240 C 500 250 700 110 950 140 C 1100 160 1200 100 1250 110"
            stroke="#60A5FA"
            strokeWidth="1.2"
            strokeDasharray="4 6"
            opacity="0.6"
          />
          <defs>
            <linearGradient id="blue-line-1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="blue-line-2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.1" />
              <stop offset="60%" stopColor="#38BDF8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#BFDBFE" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>

        {/* Ambient radial glows */}
        <div className="absolute top-0 right-1/3 w-80 h-80 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
      </div>

      {/* ── Top-Right Date Pill ── */}
      <div className="absolute top-4 right-5 md:top-5 md:right-7 z-20">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/95 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-[#FDB813]" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* ── Main Banner Content Layout ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 px-6 py-5 md:px-8 md:py-6 flex flex-col lg:flex-row items-center justify-between gap-6"
      >
        {/* Left Side: Greeting, Welcome Headline, Subtitle & Action Buttons */}
        <div className="flex-1 space-y-3.5 w-full max-w-xl">
          {/* Greeting with waving emoji */}
          <motion.div variants={itemVariants} className="flex items-center gap-2">
            <span className="text-sm font-medium text-white/90">
              {getGreeting()}, {user?.name || 'Super Admin (MD)'}
            </span>
            <span className="text-base select-none">👋</span>
          </motion.div>

          {/* Title: Welcome to Forge India Connect */}
          <motion.div variants={itemVariants} className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
              Welcome to <span className="text-[#FDB813]">Forge India Connect</span>
            </h1>
            <p className="text-xs md:text-sm text-blue-100/90 font-normal">
              Manage candidates, interviews and placement progress in one place.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3 pt-1">
            {onAddCandidate && (
              <button
                type="button"
                onClick={onAddCandidate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold bg-[#FDB813] hover:bg-[#F5A623] text-[#0A1A3A] shadow-md shadow-amber-500/25 transition-transform active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-[#0A1A3A]" />
                <span>Add Candidate</span>
              </button>
            )}

            {onViewCandidates && (
              <button
                type="button"
                onClick={onViewCandidates}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/25 backdrop-blur-xs shadow-xs transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4 text-white/90" />
                <span>View Candidates</span>
                <ArrowRight className="w-3.5 h-3.5 text-white/80" />
              </button>
            )}
          </motion.div>
        </div>

        {/* Center-Right: Script Typography */}
        <div className="flex items-center justify-end w-full lg:w-auto pt-2 lg:pt-4">
          {/* Script Branding Section (Building Better Careers Together) */}
          <motion.div
            variants={itemVariants}
            className="hidden sm:flex flex-col items-center justify-center text-center px-4 select-none"
          >
            <div
              style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive, sans-serif" }}
              className="text-2xl xl:text-3xl text-white font-medium italic tracking-wide drop-shadow-xs"
            >
              Building Better Careers
            </div>
            <div className="relative mt-0.5">
              <span
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                className="text-3xl xl:text-4xl font-black text-[#FDB813] italic tracking-wider drop-shadow-sm"
              >
                Together
              </span>
              {/* Elegant curved gold brush swoop line */}
              <svg className="w-28 h-5 -mt-1 mx-auto text-[#FDB813]" viewBox="0 0 100 20" fill="none">
                <path
                  d="M 5 12 Q 50 22 95 6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CorporateHeroBanner;
