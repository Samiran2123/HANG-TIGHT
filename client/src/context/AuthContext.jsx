import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, sendOtpEmail, verifyOtpCode } from '../services/supabase';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('aura_auth_token'));
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    async function initAuth() {
      setLoading(true);
      const savedToken = localStorage.getItem('aura_auth_token');

      if (savedToken === 'demo-customer-token') {
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
        setLoading(false);
        return;
      }

      if (savedToken === 'demo-admin-token') {
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
        setLoading(false);
        return;
      }

      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            setToken(session.access_token);
            localStorage.setItem('aura_auth_token', session.access_token);

            // Fetch verified server-side profile
            try {
              const res = await api.getMe();
              setProfile(res.profile);
            } catch (e) {
              setProfile({
                id: session.user.id,
                email: session.user.email,
                role: 'customer'
              });
            }
          }
        } catch (err) {
          console.error('Session restoration error:', err);
        }
      }

      setLoading(false);
    }

    initAuth();

    // Listen to Supabase auth events
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          setToken(session.access_token);
          localStorage.setItem('aura_auth_token', session.access_token);
          try {
            const res = await api.getMe();
            setProfile(res.profile);
          } catch {
            setProfile({ id: session.user.id, email: session.user.email, role: 'customer' });
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setToken(null);
          localStorage.removeItem('aura_auth_token');
        }
      });

      return () => subscription?.unsubscribe();
    }
  }, []);

  // Send OTP
  async function requestOtp(email) {
    return sendOtpEmail(email);
  }

  // Confirm OTP
  async function confirmOtp(email, otpCode) {
    const { data, error, simulated } = await verifyOtpCode(email, otpCode);
    if (error) throw error;

    if (simulated) {
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

  // 1-Click Demo Customer
  function loginAsDemoCustomer() {
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

  // 1-Click Demo Admin
  function loginAsDemoAdmin() {
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
