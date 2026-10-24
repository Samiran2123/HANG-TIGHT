import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isDemoAllowed = Boolean(
  !import.meta.env.PROD && import.meta.env.VITE_ALLOW_DEMO === 'true'
);

/**
 * Registers a new customer with email and password via Supabase Auth.
 * Never stores plaintext passwords in local storage or custom databases.
 */
export async function signUpWithPassword(email, password, fullName = '') {
  const trimmedEmail = email?.trim().toLowerCase();
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { data: null, error: new Error('Please enter a valid email address.') };
  }
  if (!password || password.length < 6) {
    return { data: null, error: new Error('Password must be at least 6 characters long.') };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: new Error('Authentication service is unavailable: Supabase client is not configured in this environment.')
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: {
        full_name: fullName.trim() || trimmedEmail.split('@')[0]
      },
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
    }
  });

  if (error) {
    let msg = error.message;
    if (msg.includes('User already registered') || msg.includes('already exists')) {
      msg = 'An account with this email address already exists. Please sign in instead.';
    }
    return { data: null, error: new Error(msg) };
  }

  // Handle case where user exists but email enumeration is protected by Supabase
  const alreadyRegistered = Boolean(data?.user && data?.user?.identities && data.user.identities.length === 0);
  const confirmationRequired = Boolean(data?.user && !data?.session && !alreadyRegistered);

  return {
    data,
    error: null,
    alreadyRegistered,
    confirmationRequired
  };
}

/**
 * Authenticates an existing customer using email and password via Supabase Auth.
 */
export async function signInWithPassword(email, password) {
  const trimmedEmail = email?.trim().toLowerCase();
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { data: null, error: new Error('Please enter a valid email address.') };
  }
  if (!password) {
    return { data: null, error: new Error('Please enter your password.') };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: new Error('Authentication service is unavailable: Supabase client is not configured in this environment.')
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password
  });

  if (error) {
    let msg = error.message;
    if (msg === 'Invalid login credentials') {
      msg = 'Invalid email or password. Please verify your credentials and try again.';
    } else if (msg.includes('Email not confirmed')) {
      msg = 'Your email address is not yet confirmed. Please check your inbox for the confirmation link.';
    }
    return { data: null, error: new Error(msg) };
  }

  return { data, error: null };
}

/**
 * Initiates email sign-in with a clickable magic link or OTP via Supabase Auth.
 * Default free-tier Supabase mailer delivers a clickable sign-in link with redirect to client origin.
 */
export async function sendOtpEmail(email) {
  const trimmedEmail = email?.trim().toLowerCase();
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { error: new Error('Please enter a valid email address.'), simulated: false };
  }

  if (!isSupabaseConfigured || !supabase) {
    if (!isDemoAllowed) {
      return {
        error: new Error('Authentication service is unavailable: Supabase client is not configured in this environment.'),
        simulated: false
      };
    }
    console.info('Supabase not configured in client environment. Simulating OTP dispatch for local demonstration.');
    return { error: null, simulated: true };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmedEmail,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
    }
  });

  return { error, simulated: false };
}

export const sendMagicLinkEmail = sendOtpEmail;

/**
 * Verifies 6-digit email OTP code via Supabase Auth
 */
export async function verifyOtpCode(email, token) {
  const trimmedEmail = email?.trim().toLowerCase();
  const trimmedToken = token?.trim();

  if (!trimmedEmail || !trimmedToken) {
    return { data: null, error: new Error('Email and verification code are required.'), simulated: false };
  }

  if (!isSupabaseConfigured || !supabase) {
    if (!isDemoAllowed) {
      return {
        data: null,
        error: new Error('Authentication service is unavailable: Supabase client is not configured in this environment.'),
        simulated: false
      };
    }
    console.info('Supabase not configured. Simulating successful OTP verification for local demonstration.');
    return {
      data: {
        session: { access_token: 'demo-customer-token' },
        user: { id: '00000000-0000-0000-0000-000000000001', email: trimmedEmail }
      },
      error: null,
      simulated: true
    };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: trimmedEmail,
    token: trimmedToken,
    type: 'email'
  });

  return { data, error, simulated: false };
}
