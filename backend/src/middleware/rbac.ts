import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User';
import { sendError } from '../utils/response';

/**
 * Authorizes access based on allowed user roles
 */
export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required.', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required: [${allowedRoles.join(
          ', '
        )}]`,
        403
      );
      return;
    }

    next();
  };
};

/**
 * Super Admin only guard
 */
export const superAdminOnly = authorizeRoles('SUPER_ADMIN');

/**
 * Admin and Super Admin guard
 */
export const adminAndAbove = authorizeRoles('SUPER_ADMIN', 'ADMIN');

/**
 * HR and above guard (Can register/edit candidates, schedule interviews)
 */
export const hrAndAbove = authorizeRoles('SUPER_ADMIN', 'ADMIN', 'HR_EXECUTIVE');

/**
 * Accounts and Admin guard (Can manage enrollment fees and payments)
 */
export const accountsAndAbove = authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTS');

