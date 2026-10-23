import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Initiates email sign-in with a 6-digit OTP or magic link
 */
export async function sendOtpEmail(email) {
  if (!isSupabaseConfigured || !supabase) {
    console.info('Supabase not configured in client environment. Simulating OTP dispatch.');
    return { error: null, simulated: true };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: window.location.origin
    }
  });

  return { error, simulated: false };
}

/**
 * Verifies email OTP code
 */
export async function verifyOtpCode(email, token) {
  if (!isSupabaseConfigured || !supabase) {
    console.info('Supabase not configured. Simulating successful OTP verification.');
    return {
      data: {
        session: { access_token: 'demo-customer-token' },
        user: { id: '00000000-0000-0000-0000-000000000001', email }
      },
      error: null,
      simulated: true
    };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email'
  });

  return { data, error, simulated: false };
}
