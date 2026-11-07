import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/environment';
import { sendError } from '../utils/response';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[Error Handler]:', err);

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      sendError(res, 'File size exceeds limit (Max 5MB).', 400);
      return;
    }
    sendError(res, `Upload error: ${err.message}`, 400);
    return;
  }

  // Handle custom upload validation error
  if (err.message && err.message.includes('Invalid file format')) {
    sendError(res, err.message, 400);
    return;
  }

  // Handle Mongoose duplicate key error (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    sendError(res, `Duplicate entry: '${field}' with value '${value}' already exists.`, 409);
    return;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e: any) => e.message);
    sendError(res, 'Validation Error', 422, errors);
    return;
  }

  // Handle JSON parse errors
  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, 'Malformed JSON in request body.', 400);
    return;
  }

  const statusCode = err.statusCode || 500;
  const message =
    ENV.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred. Please contact support.'
      : err.message || 'Internal Server Error';

  sendError(res, message, statusCode);
};

