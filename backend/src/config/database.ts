import mongoose from 'mongoose';
import { ENV } from './environment';

export const connectDB = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(ENV.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });
    console.log(`[MongoDB] Connected successfully to database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection lost. Reconnecting...');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Database error:', err);
});

