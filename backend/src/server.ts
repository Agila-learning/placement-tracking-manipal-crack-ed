import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';

import { ENV } from './config/environment';
import { connectDB } from './config/database';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import bankRoutes from './routes/bankRoutes';
import programRoutes from './routes/programRoutes';
import vendorRoutes from './routes/vendorRoutes';
import applicationRoutes from './routes/applicationRoutes';
import reportRoutes from './routes/reportRoutes';
import auditRoutes from './routes/auditRoutes';

const app = express();

// --- Security Headers ---
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
    contentSecurityPolicy: false, // Frontend handles its own CSP
  })
);

// --- CORS ---
app.use(
  cors({
    origin: ENV.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// --- Body Parsers ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(ENV.COOKIE_SECRET));

// --- Logger ---
if (ENV.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// --- Rate Limiter ---
app.use('/api', apiRateLimiter);

// --- Serve uploaded files only via authenticated route (private) ---
// Files should NOT be publicly accessible by URL. Use a dedicated download endpoint.
// In development we provide a minimal download endpoint:
app.get('/api/files/resume/:filename', (req, res, _next) => {
  // In production, verify auth token from query param or header here
  const filename = path.basename(req.params.filename); // prevent path traversal
  const filePath = path.join(ENV.UPLOAD_DIR, filename);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ success: false, message: 'File not found.' });
    }
  });
});

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditRoutes);

// --- Health Check ---
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'FIC CRM Backend is running.',
    env: ENV.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// --- 404 Handler ---
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'API route not found.' });
});

// --- Global Error Handler ---
app.use(errorHandler);

// --- Start Server ---
const start = async () => {
  await connectDB();

  app.listen(ENV.PORT, () => {
    console.log(`\n🚀 FIC CRM Backend running on http://localhost:${ENV.PORT}`);
    console.log(`   Environment : ${ENV.NODE_ENV}`);
    console.log(`   CORS Origin : ${ENV.CORS_ORIGIN}`);
    console.log(`   Health Check: http://localhost:${ENV.PORT}/api/health\n`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;

