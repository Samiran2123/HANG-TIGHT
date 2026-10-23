import express from 'express';
import { getAdminClient } from '../services/supabase.js';
import { config } from '../config/env.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const supabase = getAdminClient();
  let supabaseStatus = 'disconnected';

  if (supabase) {
    try {
      const { error } = await supabase.from('categories').select('count', { count: 'exact', head: true });
      supabaseStatus = error ? `error: ${error.message}` : 'healthy';
    } catch (err) {
      supabaseStatus = `error: ${err.message}`;
    }
  }

  const sheetsConfigured = Boolean(config.googleSheets.webhookUrl);

  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    services: {
      supabase: supabaseStatus,
      googleSheetsConfigured: sheetsConfigured
    }
  });
});

export default router;
