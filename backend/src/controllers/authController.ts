import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/User';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { ENV } from '../config/environment';
import { sendSuccess, sendError } from '../utils/response';
import { logActivity } from '../utils/auditLogger';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, password } = req.body; // identifier can be email or employeeId

    if (!identifier || !password) {
      sendError(res, 'Email/Employee ID and Password are required.', 400);
      return;
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Find user by email or uppercase employeeId
    const user = await User.findOne({
      $or: [
        { email: cleanIdentifier },
        { employeeId: identifier.trim().toUpperCase() },
      ],
    }).select('+passwordHash');

    if (!user) {
      await logActivity({
        req,
        action: 'FAILED_LOGIN',
        entityType: 'AUTH',
        details: `Failed login attempt for unknown user: ${identifier}`,
      });
      sendError(res, 'Invalid credentials.', 401);
      return;
    }

    // Check account status
    if (user.status !== 'ACTIVE') {
      await logActivity({
        req,
        actorId: user._id.toString(),
        actorName: user.name,
        actorRole: user.role,
        action: 'INACTIVE_LOGIN_ATTEMPT',
        entityType: 'AUTH',
        details: 'Attempted login to deactivated account',
      });
      sendError(res, 'Your account has been deactivated. Please contact your Super Administrator.', 403);
      return;
    }

    // Check lock
    if (user.isLocked()) {
      const remainingMinutes = Math.ceil(
        (user.lockUntil!.getTime() - Date.now()) / (60 * 1000)
      );
      await logActivity({
        req,
        actorId: user._id.toString(),
        actorName: user.name,
        actorRole: user.role,
        action: 'LOCKED_LOGIN_ATTEMPT',
        entityType: 'SECURITY',
        details: `Login attempt on locked account. Locked for ${remainingMinutes} more minutes.`,
      });
      sendError(
        res,
        `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minutes.`,
        429
      );
      return;
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= ENV.MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + ENV.LOCK_TIME_MINUTES * 60 * 1000);
        await user.save();
        await logActivity({
          req,
          actorId: user._id.toString(),
          actorName: user.name,
          actorRole: user.role,
          action: 'ACCOUNT_LOCKED',
          entityType: 'SECURITY',
          details: `Account locked after ${user.failedLoginAttempts} failed attempts.`,
        });
        sendError(
          res,
          `Too many failed attempts. Account locked for ${ENV.LOCK_TIME_MINUTES} minutes.`,
          429
        );
        return;
      }

      await user.save();
      await logActivity({
        req,
        actorId: user._id.toString(),
        actorName: user.name,
        actorRole: user.role,
        action: 'FAILED_PASSWORD',
        entityType: 'AUTH',
        details: `Invalid password attempt. Attempt ${user.failedLoginAttempts}/${ENV.MAX_LOGIN_ATTEMPTS}`,
      });
      sendError(
        res,
        `Invalid credentials. ${ENV.MAX_LOGIN_ATTEMPTS - user.failedLoginAttempts} attempts remaining before account lockout.`,
        401
      );
      return;
    }

    // Reset failed attempts on success
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ENV.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Set HttpOnly cookie
    res.cookie('fic_token', token, {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    await logActivity({
      req,
      actorId: user._id.toString(),
      actorName: user.name,
      actorRole: user.role,
      action: 'LOGIN_SUCCESS',
      entityType: 'AUTH',
      details: `User ${user.email} (${user.role}) logged in successfully.`,
    });

    sendSuccess(
      res,
      {
        token,
        user: {
          id: user._id,
          employeeId: user.employeeId,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          lastLoginAt: user.lastLoginAt,
        },
      },
      'Login successful.'
    );
  } catch (error: any) {
    console.error('Login error:', error);
    sendError(res, 'Internal server error during authentication.', 500);
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user) {
      await logActivity({
        req,
        action: 'LOGOUT',
        entityType: 'AUTH',
        details: `User ${req.user.email} logged out.`,
      });
    }

    res.clearCookie('fic_token', {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    sendSuccess(res, null, 'Logged out successfully.');
  } catch (error) {
    sendError(res, 'Error during logout.', 500);
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const user = await User.findById(req.user.userId);
    if (!user || user.status !== 'ACTIVE') {
      sendError(res, 'User session invalid or inactive.', 401);
      return;
    }

    sendSuccess(res, {
      id: user._id,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    });
  } catch (error) {
    sendError(res, 'Failed to fetch user session.', 500);
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      sendError(res, 'Email is required.', 400);
      return;
    }

    const user = await User.findOne({ email: email.trim().toLowerCase(), status: 'ACTIVE' });
    if (!user) {
      // Don't disclose whether email exists for security
      sendSuccess(res, null, 'If an active account exists with that email, reset instructions have been generated.');
      return;
    }

    // Generate random secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Invalidate previous tokens
    await PasswordResetToken.deleteMany({ userId: user._id });

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    await logActivity({
      req,
      actorId: user._id.toString(),
      actorName: user.name,
      actorRole: user.role,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'SECURITY',
      details: `Password reset requested for email ${user.email}`,
    });

    // In a production setup this is emailed. We return token in response for development / administrative recovery.
    sendSuccess(
      res,
      {
        resetToken: rawToken,
        message: 'Password reset token generated. Valid for 1 hour.',
      },
      'Password reset instructions processed.'
    );
  } catch (error) {
    sendError(res, 'Failed to process password reset request.', 500);
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      sendError(res, 'Token and new password are required.', 400);
      return;
    }

    if (newPassword.length < 8) {
      sendError(res, 'Password must be at least 8 characters long.', 400);
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetRecord = await PasswordResetToken.findOne({
      tokenHash,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      sendError(res, 'Invalid or expired password reset token.', 400);
      return;
    }

    const user = await User.findById(resetRecord.userId);
    if (!user) {
      sendError(res, 'User not found.', 404);
      return;
    }

    const salt = await bcrypt.genSalt(ENV.BCRYPT_ROUNDS);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    resetRecord.isUsed = true;
    await resetRecord.save();

    await logActivity({
      req,
      actorId: user._id.toString(),
      actorName: user.name,
      actorRole: user.role,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'SECURITY',
      details: `Password successfully reset for user ${user.email}.`,
    });

    sendSuccess(res, null, 'Password has been reset successfully. You can now log in.');
  } catch (error) {
    sendError(res, 'Failed to reset password.', 500);
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      sendError(res, 'Current and new password are required.', 400);
      return;
    }

    if (newPassword.length < 8) {
      sendError(res, 'New password must be at least 8 characters long.', 400);
      return;
    }

    const user = await User.findById(req.user!.userId).select('+passwordHash');
    if (!user) {
      sendError(res, 'User not found.', 404);
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      sendError(res, 'Incorrect current password.', 400);
      return;
    }

    const salt = await bcrypt.genSalt(ENV.BCRYPT_ROUNDS);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    await logActivity({
      req,
      action: 'PASSWORD_CHANGED',
      entityType: 'SECURITY',
      details: `User ${user.email} changed their password.`,
    });

    sendSuccess(res, null, 'Password changed successfully.');
  } catch (error) {
    sendError(res, 'Failed to change password.', 500);
  }
};

