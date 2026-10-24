import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  isDemoAllowed,
  sendOtpEmail,
  verifyOtpCode,
  signUpWithPassword,
  signInWithPassword
} from '../services/supabase';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('aura_auth_token'));
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      setLoading(true);
      const savedToken = localStorage.getItem('aura_auth_token');

      // Development demo session handling
      if (isDemoAllowed && savedToken === 'demo-customer-token') {
        const demoUser = { id: '00000000-0000-0000-0000-000000000001', email: 'demo.customer@foodpro.app' };
        if (isMounted) {
          setUser(demoUser);
          setProfile({
            id: demoUser.id,
            email: demoUser.email,
            full_name: 'Demo Gourmet Customer',
            phone: '+1 (555) 234-5678',
            role: 'customer',
            address: '742 Evergreen Terrace, Springfield'
          });
          setLoading(false);
        }
        return;
      }

      if (isDemoAllowed && savedToken === 'demo-admin-token') {
        const adminUser = { id: '00000000-0000-0000-0000-000000000002', email: 'admin@foodpro.app' };
        if (isMounted) {
          setUser(adminUser);
          setProfile({
            id: adminUser.id,
            email: adminUser.email,
            full_name: 'Executive Chef Admin',
            phone: '+1 (555) 888-9999',
            role: 'admin',
            address: 'Culinary HQ, Suite 100'
          });
          setLoading(false);
        }
        return;
      }

      // Purge demo credentials if demo mode is not permitted in this environment
      if (!isDemoAllowed && (savedToken === 'demo-customer-token' || savedToken === 'demo-admin-token')) {
        localStorage.removeItem('aura_auth_token');
        if (isMounted) setToken(null);
      }

      // Supabase session restoration as authoritative source of truth
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
          if (sessionErr) throw sessionErr;

          if (session?.user && isMounted) {
            setUser(session.user);
            setToken(session.access_token);
            localStorage.setItem('aura_auth_token', session.access_token);

            // Retrieve authoritative server-side profile (strictly database-derived role)
            try {
              const res = await api.getMe();
              if (isMounted) setProfile(res.profile);
            } catch {
              if (isMounted) {
                setProfile({
                  id: session.user.id,
                  email: session.user.email,
                  role: 'customer',
                  full_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0]
                });
              }
            }
          }
        } catch (err) {
          console.error('Session restoration notice:', err.message || err);
        }
      }

      if (isMounted) setLoading(false);
    }

    initAuth();

    // Listen to real-time Supabase auth state changes (token refresh, sign-in, sign-out)
    let authSubscription = null;
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);
          setToken(session.access_token);
          localStorage.setItem('aura_auth_token', session.access_token);

          // Clean access_token from URL hash if redirected from magic link email
          if (typeof window !== 'undefined' && window.location.hash?.includes('access_token')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }

          // Refresh verified database profile on sign-in or user update
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || !profile) {
            try {
              const res = await api.getMe();
              if (isMounted) setProfile(res.profile);
            } catch {
              if (isMounted) {
                setProfile({
                  id: session.user.id,
                  email: session.user.email,
                  role: 'customer',
                  full_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0]
                });
              }
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setToken(null);
          localStorage.removeItem('aura_auth_token');
        }
      });
      authSubscription = subscription;
    }

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  // Email / Password Registration
  async function registerWithPassword(email, password, fullName) {
    const res = await signUpWithPassword(email, password, fullName);
    if (res.error) throw res.error;

    if (res.alreadyRegistered) {
      return {
        success: false,
        alreadyRegistered: true,
        message: 'An account with this email address already exists. Please sign in instead.'
      };
    }

    if (res.confirmationRequired) {
      return {
        success: true,
        confirmationRequired: true,
        message: 'Registration successful! Please check your email inbox to confirm your account before signing in.'
      };
    }

    // Direct session established (email confirmation disabled in Supabase project)
    if (res.data?.session) {
      setToken(res.data.session.access_token);
      localStorage.setItem('aura_auth_token', res.data.session.access_token);
      setUser(res.data.user);
      try {
        const profileRes = await api.getMe();
        setProfile(profileRes.profile);
      } catch {
        setProfile({
          id: res.data.user.id,
          email: res.data.user.email,
          role: 'customer',
          full_name: fullName || res.data.user.email.split('@')[0]
        });
      }
    }

    return {
      success: true,
      confirmationRequired: false,
      user: res.data?.user
    };
  }

  // Email / Password Login
  async function loginWithPassword(email, password) {
    const res = await signInWithPassword(email, password);
    if (res.error) throw res.error;

    if (res.data?.session) {
      setToken(res.data.session.access_token);
      localStorage.setItem('aura_auth_token', res.data.session.access_token);
      setUser(res.data.user);
      try {
        const profileRes = await api.getMe();
        setProfile(profileRes.profile);
      } catch {
        setProfile({
          id: res.data.user.id,
          email: res.data.user.email,
          role: 'customer',
          full_name: res.data.user.user_metadata?.full_name || res.data.user.email.split('@')[0]
        });
      }
    }

    return {
      success: true,
      user: res.data?.user
    };
  }

  // Send Email Magic Link / OTP
  async function requestOtp(email) {
    return sendOtpEmail(email);
  }

  async function sendMagicLink(email) {
    return sendOtpEmail(email);
  }

  // Confirm Email OTP
  async function confirmOtp(email, otpCode) {
    const { data, error, simulated } = await verifyOtpCode(email, otpCode);
    if (error) throw error;

    if (simulated) {
      if (!isDemoAllowed) {
        throw new Error('Demo authentication is disabled in this environment.');
      }
      const demoUser = { id: '00000000-0000-0000-0000-000000000001', email };
      setUser(demoUser);
      setProfile({
        id: demoUser.id,
        email,
        full_name: email.split('@')[0],
        phone: '+1 (555) 234-5678',
        role: 'customer',
        address: '742 Evergreen Terrace, Springfield'
      });
      setToken('demo-customer-token');
      localStorage.setItem('aura_auth_token', 'demo-customer-token');
      return { success: true };
    }

    if (data?.session) {
      setToken(data.session.access_token);
      localStorage.setItem('aura_auth_token', data.session.access_token);
      setUser(data.user);
      try {
        const res = await api.getMe();
        setProfile(res.profile);
      } catch {
        setProfile({ id: data.user.id, email: data.user.email, role: 'customer' });
      }
    }

    return { success: true };
  }

  // 1-Click Demo Customer (Enabled strictly in non-production with ALLOW_DEMO)
  function loginAsDemoCustomer() {
    if (!isDemoAllowed) {
      console.warn('Demo authentication is disabled in this environment.');
      return;
    }
    const demoUser = { id: '00000000-0000-0000-0000-000000000001', email: 'demo.customer@foodpro.app' };
    setUser(demoUser);
    setProfile({
      id: demoUser.id,
      email: demoUser.email,
      full_name: 'Demo Gourmet Customer',
      phone: '+1 (555) 234-5678',
      role: 'customer',
      address: '742 Evergreen Terrace, Springfield'
    });
    setToken('demo-customer-token');
    localStorage.setItem('aura_auth_token', 'demo-customer-token');
  }

  // 1-Click Demo Admin (Enabled strictly in non-production with ALLOW_DEMO)
  function loginAsDemoAdmin() {
    if (!isDemoAllowed) {
      console.warn('Demo authentication is disabled in this environment.');
      return;
    }
    const adminUser = { id: '00000000-0000-0000-0000-000000000002', email: 'admin@foodpro.app' };
    setUser(adminUser);
    setProfile({
      id: adminUser.id,
      email: adminUser.email,
      full_name: 'Executive Chef Admin',
      phone: '+1 (555) 888-9999',
      role: 'admin',
      address: 'Culinary HQ, Suite 100'
    });
    setToken('demo-admin-token');
    localStorage.setItem('aura_auth_token', 'demo-admin-token');
  }

  // Logout
  async function logout() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    setUser(null);
    setProfile(null);
    setToken(null);
    localStorage.removeItem('aura_auth_token');
  }

  // Update Profile
  async function updateUserProfile(data) {
    const res = await api.updateProfile(data);
    setProfile(res.profile);
    return res.profile;
  }

  const value = {
    user,
    profile,
    token,
    role: profile?.role || 'guest',
    isAdmin: profile?.role === 'admin',
    isAuthenticated: Boolean(user),
    loading,
    isDemoAllowed,
    registerWithPassword,
    loginWithPassword,
    sendMagicLink,
    requestOtp,
    confirmOtp,
    loginAsDemoCustomer,
    loginAsDemoAdmin,
    logout,
    updateUserProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
