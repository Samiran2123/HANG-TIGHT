import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';

import healthRoutes from './routes/health.js';
import foodRoutes from './routes/foods.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';

const app = express();

// Security and utility middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

const clientUrls = (config.clientUrl || '')
  .split(',')
  .map(url => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  ...clientUrls
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    const cleanOrigin = origin.replace(/\/+$/, '');
    if (
      allowedOrigins.includes(cleanOrigin) ||
      cleanOrigin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    if (config.nodeEnv !== 'production') {
      return callback(null, true); // Permissive in development & test
    }
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Route Registration
app.use('/api/health', healthRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);

// Root greeting
app.get('/', (req, res) => {
  res.json({
    name: 'Food Ordering Platform Production API',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: err.message
    });
  }
  console.error('Unhandled Server Error:', err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'An internal server error occurred.';

  res.status(statusCode).json({
    success: false,
    error: message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined
  });
});

import { fileURLToPath } from 'node:url';

// Start listening only when executed directly (not when imported by tests)
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('index.js') ||
  (import.meta.url.startsWith('file:') && fileURLToPath(import.meta.url) === process.argv[1])
);

if (isMainModule && process.env.NODE_ENV !== 'test') {
  const PORT = config.port;
  app.listen(PORT, () => {
    console.log(`🚀 Food Ordering Server running on http://localhost:${PORT}`);
    console.log(`🛡️  Security Headers: Helmet enabled`);
    console.log(`🌐 CORS configured for: ${allowedOrigins.join(', ')}`);
  });
}

export default app;
