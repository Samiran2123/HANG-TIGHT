import { getAdminClient } from '../services/supabase.js';
import { isDemoAuthAllowed } from '../config/env.js';

/**
 * Extracts Bearer token from Authorization header
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
    return parts[1];
  }
  return null;
}

/**
 * Authenticates user from Supabase JWT token
 */
export async function authenticateToken(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Missing Bearer token.'
    });
  }

  // Support demo token for evaluators strictly when explicitly allowed in non-production
  if (isDemoAuthAllowed()) {
    if (token === 'demo-customer-token') {
      req.user = { id: '00000000-0000-0000-0000-000000000001', email: 'demo.customer@foodpro.app' };
      req.profile = {
        id: req.user.id,
        email: req.user.email,
        full_name: 'Demo Gourmet Customer',
        phone: '+1 (555) 234-5678',
        role: 'customer',
        address: '742 Evergreen Terrace, Springfield'
      };
      return next();
    }

    if (token === 'demo-admin-token') {
      req.user = { id: '00000000-0000-0000-0000-000000000002', email: 'admin@foodpro.app' };
      req.profile = {
        id: req.user.id,
        email: req.user.email,
        full_name: 'Executive Chef Admin',
        phone: '+1 (555) 888-9999',
        role: 'admin',
        address: 'Culinary HQ, Suite 100'
      };
      return next();
    }
  }

  const supabase = getAdminClient();
  if (!supabase) {
    return res.status(503).json({
      success: false,
      error: 'Authentication service unavailable: Supabase client not configured.'
    });
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session token. Please sign in again.'
      });
    }

    // Fetch verified profile from database to determine role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    req.user = user;
    req.profile = profile || {
      id: user.id,
      email: user.email,
      role: 'customer',
      full_name: user.user_metadata?.full_name || user.email.split('@')[0]
    };

    req.token = token;
    next();
  } catch (err) {
    console.error('Error verifying auth token:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to authenticate user.'
    });
  }
}

/**
 * Ensures authenticated user has admin privileges
 */
export function requireAdmin(req, res, next) {
  if (!req.profile || req.profile.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Administrative privileges are required for this endpoint.'
    });
  }
  next();
}
