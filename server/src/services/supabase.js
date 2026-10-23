import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';

let supabaseAdmin = null;

if (config.supabase.url && config.supabase.serviceRoleKey) {
  supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} else if (config.supabase.url && config.supabase.anonKey) {
  supabaseAdmin = createClient(config.supabase.url, config.supabase.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} else {
  console.warn('⚠️ Supabase URL or Keys are not configured in environment variables.');
}

/**
 * Returns the administrative Supabase client with elevated privileges
 */
export function getAdminClient() {
  return supabaseAdmin;
}

/**
 * Creates a client scoped to the user's JWT authorization token for RLS enforcement
 */
export function getUserClient(jwtToken) {
  if (!config.supabase.url || !config.supabase.anonKey) {
    return null;
  }
  return createClient(config.supabase.url, config.supabase.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${jwtToken}`
      }
    }
  });
}
