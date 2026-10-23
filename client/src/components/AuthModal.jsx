import React, { useState } from 'react';
import { X, Mail, KeyRound, Sparkles, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../services/supabase';

export default function AuthModal({ isOpen, onClose }) {
  const { requestOtp, confirmOtp, loginAsDemoCustomer, loginAsDemoAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState('EMAIL'); // 'EMAIL' or 'OTP'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await requestOtp(email.trim());
      if (res?.error) {
        throw res.error;
      }
      setSuccessMsg(`We sent a 6-digit verification code to ${email}`);
      setStep('OTP');
    } catch (err) {
      setError(err.message || 'Failed to send OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await confirmOtp(email.trim(), otpCode.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoCustomerClick = () => {
    loginAsDemoCustomer();
    onClose();
  };

  const handleDemoAdminClick = () => {
    loginAsDemoAdmin();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close authentication modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-amber-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-brand-500/20 mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {step === 'EMAIL' ? 'Sign In or Register' : 'Enter Verification Code'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {step === 'EMAIL' 
              ? 'Passwordless authentication with secure Supabase Email OTP'
              : `Check your inbox (${email}) for your 6-digit code`}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && step === 'OTP' && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {step === 'EMAIL' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Your Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Sending Code...' : 'Send Magic OTP Code'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                6-Digit OTP Code
              </label>
              <input
                type="text"
                required
                maxLength={8}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-center tracking-[0.3em] font-mono text-lg focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => { setStep('EMAIL'); setError(null); }}
              className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← Use a different email
            </button>
          </form>
        )}

        {/* 1-Click Demo Profiles for Evaluators & Academic Reviewers */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 justify-center text-[11px] text-slate-400 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Quick-Switch Demo Profiles (Instant Evaluation)</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleDemoCustomerClick}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-left transition-all hover:scale-[1.02] group"
            >
              <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">Customer</span>
              <span className="text-xs font-semibold text-white group-hover:text-emerald-300 truncate block">Demo Gourmet</span>
            </button>

            <button
              type="button"
              onClick={handleDemoAdminClick}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-left transition-all hover:scale-[1.02] group"
            >
              <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Admin
              </span>
              <span className="text-xs font-semibold text-white group-hover:text-amber-300 truncate block">Executive Chef</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
