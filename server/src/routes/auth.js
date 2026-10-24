import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getAdminClient } from '../services/supabase.js';
import { sheetsService } from '../services/sheetsService.js';
import { mockProfiles } from '../services/mockStore.js';

const router = express.Router();

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile and verified role
 */
router.get('/me', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    user: req.user,
    profile: req.profile
  });
});

/**
 * PUT /api/auth/profile
 * Allows customer to update personal info (name, phone, address)
 * Strictly prevents self-privilege escalation to 'admin'
 */
router.put('/profile', authenticateToken, async (req, res, next) => {
  const { full_name, phone, address } = req.body;
  const userId = req.user.id;
  const supabase = getAdminClient();

  const updates = {
    updated_at: new Date().toISOString()
  };

  if (full_name !== undefined) updates.full_name = full_name.trim();
  if (phone !== undefined) updates.phone = phone.trim();
  if (address !== undefined) updates.address = address.trim();

  try {
    let updatedProfile = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      updatedProfile = data;
    } else {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          success: false,
          error: 'Profile updates unavailable in production: Supabase connection is not configured.'
        });
      }
      let p = mockProfiles.find(x => x.id === userId);
      if (!p) {
        p = { id: userId, email: req.user.email, role: 'customer' };
        mockProfiles.push(p);
      }
      Object.assign(p, updates);
      updatedProfile = p;
    }

    // Sync updated customer profile to Google Sheets
    sheetsService.syncCustomer(updatedProfile).catch(err => {
      console.warn('[GoogleSheets] Profile sync notice:', err.message);
    });

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      profile: updatedProfile
    });
  } catch (err) {
    next(err);
  }
});

export default router;
