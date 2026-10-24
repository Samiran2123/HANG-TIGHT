import dotenv from 'dotenv';
dotenv.config();

export function isDemoAuthAllowed() {
  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEMO_AUTH === 'true';
}

export const config = {
  port: process.env.PORT || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  get allowDemoAuth() {
    return isDemoAuthAllowed();
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },
  googleSheets: {
    webhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || '',
    secret: process.env.GOOGLE_SHEETS_SECRET || ''
  },
  app: {
    deliveryFee: parseFloat(process.env.APP_DELIVERY_FEE || '4.99'),
    taxRate: parseFloat(process.env.APP_TAX_RATE || '0.0825') // 8.25% default tax
  }
};
