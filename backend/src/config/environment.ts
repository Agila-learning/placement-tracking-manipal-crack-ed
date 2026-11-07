import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fic_crm',
  JWT_SECRET: process.env.JWT_SECRET || 'fic_crm_super_secure_jwt_secret_production_2026_xyz987',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  REFRESH_EXPIRES_IN: process.env.REFRESH_EXPIRES_IN || '7d',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'fic_crm_cookie_secret_key_12345',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads/resumes'),
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  BCRYPT_ROUNDS: 12,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCK_TIME_MINUTES: 15,
};

