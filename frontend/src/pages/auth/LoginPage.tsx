import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, ChevronLeft, Building2, Users, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { authApi } from '../../api/endpoints';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      toast.error('Please enter your credentials.');
      return;
    }
    setIsLoading(true);
    try {
      await login(identifier.trim(), password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      const res = await authApi.forgotPassword(forgotEmail);
      toast.success(res.message || 'If the account exists, instructions have been sent.');
      setShowForgot(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to process reset request.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleQuickDemo = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen flex font-sans select-none overflow-hidden">

      {/* ── LEFT PANEL: Brand hero (hidden on mobile) ── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-[58%] xl:w-[60%] relative flex-col overflow-hidden bg-gradient-to-br from-[#061426] via-[#0B2343] to-[#123663]"
      >
        {/* Subtle decorative modern geometric grid and glowing ambient nodes */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="corporate-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.8" strokeDasharray="3 3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#corporate-grid)" />
          </svg>
        </div>

        {/* Ambient luminous glow spots */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-1/3 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

        {/* Decorative architectural clean ring elements */}
        <div className="absolute top-20 right-20 w-80 h-80 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute top-36 right-36 w-48 h-48 rounded-full border border-amber-400/15 pointer-events-none" />
        <div className="absolute bottom-32 left-16 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-12 xl:px-16 py-10">
          {/* Logo + wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white border border-amber-400/40 rounded-xl flex items-center justify-center shadow-md p-1.5 flex-shrink-0">
              <img src="/fic-logo.svg" alt="FIC" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-white font-bold text-base leading-tight">Forge India Connect</div>
              <div className="text-amber-300 text-xs font-semibold tracking-wide">Banking Placement CRM</div>
            </div>
          </div>

          {/* Centre headline */}
          <div className="flex-1 flex flex-col justify-center max-w-lg mt-8">
            {/* Accent pill */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 w-fit mb-8 shadow-inner">
              <span className="w-2.5 h-2.5 rounded-full bg-fic-yellow animate-pulse" />
              <span className="text-white/95 text-xs font-bold tracking-widest uppercase">Banking Careers Accelerator</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.1] tracking-tight">
              Building Better<br />
              Careers{' '}
              <span className="text-fic-yellow italic font-black">Together</span>
            </h1>

            <p className="text-white/80 text-base font-normal mt-5 leading-relaxed max-w-sm">
              Connecting Top Talent with Leading Banking Opportunities across India.
            </p>

            {/* Feature badges */}
            <div className="mt-10 space-y-3">
              {[
                { icon: <Building2 className="w-4 h-4" />, text: 'Partnered with 50+ leading banks nationwide' },
                { icon: <Users className="w-4 h-4" />, text: 'End-to-end candidate lifecycle management' },
                { icon: <Award className="w-4 h-4" />, text: 'Trusted by 15,000+ banking professionals' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                  className="flex items-center gap-3 text-white/85 text-sm"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-xs flex items-center justify-center flex-shrink-0 text-fic-yellow border border-white/10">
                    {item.icon}
                  </div>
                  <span>{item.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom stats bar */}
          <div className="border-t border-white/15 pt-6 flex items-center gap-8">
            <div>
              <div className="text-2xl font-black text-white">15,000+</div>
              <div className="text-xs text-white/65 font-medium">Banking Placements</div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <div className="text-2xl font-black text-fic-yellow">98.4%</div>
              <div className="text-xs text-white/65 font-medium">Partner Bank Trust</div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="flex items-center gap-1.5 text-white/65">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-300">FIC Verified Gateway</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── RIGHT PANEL: Login form ── */}
      <div className="flex-1 bg-slate-50 flex flex-col">

        {/* Mobile header (visible only on small screens) */}
        <div className="lg:hidden px-6 pt-8 pb-4 flex items-center gap-3 bg-white border-b border-slate-100">
          <div className="w-10 h-10 bg-white border border-amber-400/40 rounded-xl flex items-center justify-center shadow-xs p-1.5">
            <img src="/fic-logo.svg" alt="FIC" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-fic-navy font-bold text-sm leading-tight">Forge India Connect</div>
            <div className="text-slate-500 text-xs">Banking Placement CRM</div>
          </div>
        </div>

        {/* Centered form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
            className="w-full max-w-sm"
          >
            {/* Card */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">

              {/* Logo badge */}
              <div className="flex flex-col items-center mb-7">
                <div className="w-16 h-16 bg-white border-2 border-amber-400/50 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/10 mb-4 p-2">
                  <img src="/fic-logo.svg" alt="FIC Logo" className="w-full h-full object-contain" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  {showForgot ? 'Reset Password' : 'Welcome Back!'}
                </h2>
                <p className="text-xs text-slate-500 mt-1 text-center">
                  {showForgot
                    ? 'Enter your email to receive reset instructions'
                    : 'Sign in to your FIC Placement CRM account'}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {!showForgot ? (
                  <motion.form
                    key="login-form"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={handleLogin}
                    className="space-y-4"
                  >
                    {/* Email / Username */}
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fic-navy/40 focus:border-fic-navy transition-all bg-slate-50 hover:bg-white"
                        placeholder="Email or Username"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        autoComplete="username"
                        disabled={isLoading}
                        required
                      />
                    </div>

                    {/* Password */}
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fic-navy/40 focus:border-fic-navy transition-all bg-slate-50 hover:bg-white"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        disabled={isLoading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Remember + Forgot */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 accent-fic-navy cursor-pointer"
                        />
                        <span>Remember Me</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-fic-navy hover:text-blue-700 font-semibold transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    {/* Sign In button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-fic-navy hover:bg-[#1A3C64] text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg shadow-fic-navy/20 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 mt-1"
                    >
                      {isLoading ? (
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Sign In</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {/* OR divider */}
                    <div className="relative my-1">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="px-3 bg-white text-slate-400 font-medium uppercase tracking-widest">or</span>
                      </div>
                    </div>

                    {/* Trust badge */}
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 py-0.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Secure &amp; Trusted Platform</span>
                    </div>

                    {/* Demo credentials */}
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => handleQuickDemo('admin@forgeindia.com', 'FIC@Admin2026')}
                        className="text-[11px] text-slate-500 hover:text-fic-navy bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors font-medium inline-flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Use Demo Admin Account
                      </button>
                    </div>
                  </motion.form>
                ) : (
                  <motion.form
                    key="forgot-form"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={handleForgotPassword}
                    className="space-y-4"
                  >
                    <button
                      type="button"
                      onClick={() => setShowForgot(false)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-fic-navy mb-2 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back to Sign In
                    </button>

                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fic-navy/40 focus:border-fic-navy transition-all bg-slate-50 hover:bg-white"
                        placeholder="Enter official work email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full bg-fic-navy hover:bg-[#1A3C64] text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {forgotLoading ? (
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Send Reset Instructions</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-slate-400 mt-6">
              © 2025 Forge India Connect. All rights reserved.{' '}
              <a href="#privacy" className="hover:text-fic-navy transition-colors">Privacy</a>
              {' · '}
              <a href="#terms" className="hover:text-fic-navy transition-colors">Terms</a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
