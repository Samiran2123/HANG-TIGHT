import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose, redirectPath }) {
  const navigate = useNavigate();
  const {
    user,
    loginWithPassword,
    registerWithPassword,
    requestOtp,
    sendMagicLink,
    loginAsDemoCustomer,
    loginAsDemoAdmin,
    isDemoAllowed
  } = useAuth();

  // Mode: 'LOGIN' | 'REGISTER' | 'MAGIC_LINK'
  const [mode, setMode] = useState('LOGIN');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMsg, setInfoMsg] = useState(null);

  const resetForm = () => {
    setFullName('');
    setPassword('');
    setConfirmPassword('');
    setMagicLinkSent(false);
    setError(null);
    setInfoMsg(null);
    setLoading(false);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
    setInfoMsg(null);
    if (newMode === 'MAGIC_LINK') {
      setMagicLinkSent(false);
    }
  };

  const handleAuthSuccess = () => {
    resetForm();
    onClose();
    if (redirectPath && typeof redirectPath === 'string' && redirectPath.startsWith('/') && !redirectPath.startsWith('//')) {
      navigate(redirectPath);
    }
  };

  // Automatically close modal and navigate when user session is confirmed
  useEffect(() => {
    if (user && isOpen) {
      handleAuthSuccess();
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  // 1. Email / Password Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError(null);
    setInfoMsg(null);

    try {
      await loginWithPassword(email.trim(), password);
      handleAuthSuccess();
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Email / Password Registration
  const handlePasswordRegister = async (e) => {
    e.preventDefault();
    if (!fullName || fullName.trim().length < 2) {
      setError('Please provide your full name.');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify and re-type.');
      return;
    }

    setLoading(true);
    setError(null);
    setInfoMsg(null);

    try {
      const result = await registerWithPassword(email.trim(), password, fullName.trim());
      if (result.alreadyRegistered) {
        setError(result.message);
        return;
      }
      if (result.confirmationRequired) {
        setInfoMsg(result.message);
        setPassword('');
        setConfirmPassword('');
        return;
      }
      // Direct session established
      handleAuthSuccess();
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Request Magic Sign-In Link
  const handleSendMagicLink = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setInfoMsg(null);

    try {
      const sendFn = sendMagicLink || requestOtp;
      const res = await sendFn(email.trim());
      if (res?.error) throw res.error;
      setMagicLinkSent(true);
      setInfoMsg(`We sent a secure sign-in link to ${email.trim()}`);
    } catch (err) {
      setError(err.message || 'Failed to send sign-in link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoCustomerClick = () => {
    loginAsDemoCustomer();
    handleAuthSuccess();
  };

  const handleDemoAdminClick = () => {
    loginAsDemoAdmin();
    handleAuthSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close authentication modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-amber-600 mx-auto flex items-center justify-center text-white shadow-lg shadow-brand-500/20 mb-3">
            {mode === 'REGISTER' ? (
              <User className="w-6 h-6" />
            ) : mode === 'MAGIC_LINK' ? (
              <Mail className="w-6 h-6" />
            ) : (
              <Lock className="w-6 h-6" />
            )}
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {mode === 'LOGIN' && 'Sign In to HANG TIGHT'}
            {mode === 'REGISTER' && 'Create Your Gourmet Account'}
            {mode === 'MAGIC_LINK' && (!magicLinkSent ? 'Passwordless Magic Link' : 'Check Your Inbox')}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {mode === 'LOGIN' && 'Access your orders, saved addresses, and live order tracking.'}
            {mode === 'REGISTER' && 'Join for exclusive chef specials and fast tracked checkout.'}
            {mode === 'MAGIC_LINK' && (
              !magicLinkSent
                ? 'Sign in securely without a password using an instant email link.'
                : `We sent a secure sign-in link to ${email}.`
            )}
          </p>
        </div>

        {/* Segmented Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-2xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => switchMode('LOGIN')}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              mode === 'LOGIN'
                ? 'bg-gradient-to-r from-brand-500 to-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('REGISTER')}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              mode === 'REGISTER'
                ? 'bg-gradient-to-r from-brand-500 to-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => switchMode('MAGIC_LINK')}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              mode === 'MAGIC_LINK'
                ? 'bg-gradient-to-r from-brand-500 to-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Magic Link
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {infoMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{infoMsg}</span>
          </div>
        )}

        {/* --- 1. SIGN IN FORM --- */}
        {mode === 'LOGIN' && (
          <form onSubmit={handlePasswordLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('MAGIC_LINK')}
                  className="text-[11px] text-brand-400 hover:underline"
                >
                  Sign in with Magic Link
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In to Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-400">Don't have an account yet? </span>
              <button
                type="button"
                onClick={() => switchMode('REGISTER')}
                className="text-xs font-semibold text-brand-400 hover:underline"
              >
                Register now
              </button>
            </div>
          </form>
        )}

        {/* --- 2. REGISTER FORM --- */}
        {mode === 'REGISTER' && (
          <form onSubmit={handlePasswordRegister} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-400">Already registered? </span>
              <button
                type="button"
                onClick={() => switchMode('LOGIN')}
                className="text-xs font-semibold text-brand-400 hover:underline"
              >
                Sign in
              </button>
            </div>
          </form>
        )}

        {/* --- 3. MAGIC LINK FORM --- */}
        {mode === 'MAGIC_LINK' && (
          <>
            {!magicLinkSent ? (
              <form onSubmit={handleSendMagicLink} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Your Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  We will send a one-click login link directly to your inbox. No password or numeric code required.
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending Link...
                    </>
                  ) : (
                    <>
                      Send Sign-In Link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => switchMode('LOGIN')}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    ← Back to Password Sign-In
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Sign-In Link Sent</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      We sent a secure, clickable sign-in link to:
                    </p>
                    <p className="text-xs font-mono font-bold text-brand-400 mt-1.5 px-3 py-1 bg-slate-900 rounded-lg inline-block border border-slate-800">
                      {email}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-300 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    How to sign in:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
                    <li>Check your inbox for an email titled <span className="text-slate-200 font-medium">"Your sign-in link"</span> (check spam if needed).</li>
                    <li>Click the <span className="text-brand-400 font-medium">Sign in</span> button inside that email.</li>
                    <li>You will be redirected back and signed in automatically.</li>
                  </ol>
                  <p className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/60">
                    This window will automatically sign in once the link is confirmed.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => { setMagicLinkSent(false); setError(null); setInfoMsg(null); }}
                  className="w-full py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
                >
                  Resend Link or Use Different Email
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('LOGIN')}
                  className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors"
                >
                  ← Back to Password Sign-In
                </button>
              </div>
            )}
          </>
        )}

        {/* 1-Click Demo Profiles for Evaluators & Academic Reviewers (Rendered strictly when permitted) */}
        {isDemoAllowed && (
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
        )}
      </div>
    </div>
  );
}
