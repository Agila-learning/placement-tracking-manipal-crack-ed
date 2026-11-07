import { Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, IUser, UserRole, UserStatus } from '../models/User';
import { ENV } from '../config/environment';
import { sendSuccess, sendError } from '../utils/response';
import { logActivity } from '../utils/auditLogger';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, status, search } = req.query;

    const filter: any = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: String(search), $options: 'i' } },
        { email: { $regex: String(search), $options: 'i' } },
        { employeeId: { $regex: String(search), $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('-passwordHash -mfaSecret')
      .sort({ createdAt: -1 });

    const formattedUsers = users.map((u) => ({
      id: u._id.toString(),
      _id: u._id.toString(),
      employeeId: u.employeeId,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    sendSuccess(res, formattedUsers, 'Users retrieved successfully.');
  } catch (error) {
    sendError(res, 'Failed to fetch users.', 500);
  }
};

export const getHRExecutives = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Returns active HR executives (and admins who can act as references)
    const hrUsers = await User.find({
      status: 'ACTIVE',
      role: { $in: ['HR_EXECUTIVE', 'ADMIN', 'SUPER_ADMIN'] },
    })
      .select('employeeId name email phone role')
      .sort({ name: 1 });

    sendSuccess(res, hrUsers, 'HR references retrieved.');
  } catch (error) {
    sendError(res, 'Failed to fetch HR references.', 500);
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, name, email, password, phone, role, status } = req.body;

    if (!employeeId || !name || !email || !password || !role) {
      sendError(res, 'Employee ID, Name, Email, Password, and Role are required.', 400);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanEmpId = employeeId.trim().toUpperCase();

    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      sendError(res, 'A user with this official email already exists.', 409);
      return;
    }

    const existingEmp = await User.findOne({ employeeId: cleanEmpId });
    if (existingEmp) {
      sendError(res, 'A user with this Employee ID already exists.', 409);
      return;
    }

    const salt = await bcrypt.genSalt(ENV.BCRYPT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      employeeId: cleanEmpId,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      phone: phone?.trim(),
      role: role as UserRole,
      status: (status as UserStatus) || 'ACTIVE',
    });

    await logActivity({
      req,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: newUser._id.toString(),
      details: `Created new user ${newUser.name} (${newUser.employeeId}) with role ${newUser.role}`,
      newState: { employeeId: newUser.employeeId, email: newUser.email, role: newUser.role },
    });

    sendSuccess(
      res,
      {
        id: newUser._id,
        employeeId: newUser.employeeId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      },
      'User created successfully.',
      201
    );
  } catch (error) {
    console.error('Create user error:', error);
    sendError(res, 'Failed to create user.', 500);
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, role, status, password } = req.body;

    let user = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    if (!user) {
      user = await User.findOne({ employeeId: id.toUpperCase() });
    }

    if (!user) {
      sendError(res, 'User not found.', 404);
      return;
    }

    const previousState = {
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
    };

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (role) user.role = role as UserRole;
    if (status) user.status = status as UserStatus;

    if (password && password.length >= 8) {
      const salt = await bcrypt.genSalt(ENV.BCRYPT_ROUNDS);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    await user.save();

    try {
      await logActivity({
        req,
        action: 'USER_UPDATED',
        entityType: 'USER',
        entityId: user._id.toString(),
        previousState,
        newState: { name: user.name, role: user.role, status: user.status },
        details: `Updated user ${user.employeeId}`,
      });
    } catch (auditErr) {
      console.error('Audit log failed during user update:', auditErr);
    }

    sendSuccess(
      res,
      {
        id: user._id.toString(),
        _id: user._id.toString(),
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
      'User updated successfully.'
    );
  } catch (error: any) {
    console.error('updateUser error:', error);
    sendError(res, error.message || 'Failed to update user.', 500);
  }
};

export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    let user = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    if (!user) {
      user = await User.findOne({ employeeId: id.toUpperCase() });
    }

    if (!user) {
      sendError(res, 'User not found.', 404);
      return;
    }

    // Prevent deactivating own account
    if (req.user && user._id.toString() === req.user.userId) {
      sendError(res, 'You cannot deactivate your own account.', 400);
      return;
    }

    const previousStatus = user.status;
    user.status = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await user.save();

    try {
      await logActivity({
        req,
        action: 'USER_STATUS_TOGGLED',
        entityType: 'USER',
        entityId: user._id.toString(),
        previousState: { status: previousStatus },
        newState: { status: user.status },
        details: `Toggled user ${user.employeeId} status to ${user.status}`,
      });
    } catch (auditErr) {
      console.error('Audit log failed during status toggle:', auditErr);
    }

    sendSuccess(
      res,
      { id: user._id.toString(), _id: user._id.toString(), status: user.status },
      `User account ${user.status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully.`
    );
  } catch (error: any) {
    console.error('toggleUserStatus error:', error);
    sendError(res, error.message || 'Failed to update user status.', 500);
  }
};

