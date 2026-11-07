import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/environment';
import { User, UserRole } from '../models/User';
import { sendError } from '../utils/response';

export interface AuthUserPayload {
  userId: string;
  employeeId: string;
  name: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check Authorization header: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.fic_token) {
      token = req.cookies.fic_token;
    }

    if (!token) {
      sendError(res, 'Authentication required. No token provided.', 401);
      return;
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthUserPayload;

    // Verify user is still active in database
    const user = await User.findById(decoded.userId).select('status role employeeId name email');
    if (!user) {
      sendError(res, 'User account no longer exists.', 401);
      return;
    }

    if (user.status !== 'ACTIVE') {
      sendError(res, 'User account has been deactivated.', 403);
      return;
    }

    req.user = {
      userId: user._id.toString(),
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      sendError(res, 'Session expired. Please log in again.', 401);
      return;
    }
    sendError(res, 'Invalid authentication token.', 401);
  }
};

