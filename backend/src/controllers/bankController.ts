import { Request, Response } from 'express';
import { Bank } from '../models/Bank';
import { Program } from '../models/Program';
import { sendSuccess, sendError } from '../utils/response';
import { logActivity } from '../utils/auditLogger';

export const getBanks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status) filter.status = status;

    const banks = await Bank.find(filter).sort({ name: 1 });
    sendSuccess(res, banks, 'Banks retrieved successfully.');
  } catch (error) {
    sendError(res, 'Failed to fetch banks.', 500);
  }
};

export const createBank = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code, description, status } = req.body;
    if (!name || !code) {
      sendError(res, 'Bank Name and Code are required.', 400);
      return;
    }

    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();

    const existing = await Bank.findOne({
      $or: [{ name: cleanName }, { code: cleanCode }],
    });
    if (existing) {
      sendError(res, 'A bank with this name or code already exists.', 409);
      return;
    }

    const bank = await Bank.create({
      name: cleanName,
      code: cleanCode,
      description: description?.trim(),
      status: status || 'ACTIVE',
    });

    await logActivity({
      req,
      action: 'BANK_CREATED',
      entityType: 'MASTER_DATA',
      entityId: bank._id.toString(),
      details: `Created bank ${bank.name} (${bank.code})`,
      newState: { name: bank.name, code: bank.code },
    });

    sendSuccess(res, bank, 'Bank created successfully.', 201);
  } catch (error) {
    sendError(res, 'Failed to create bank.', 500);
  }
};

export const updateBank = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code, description, status } = req.body;

    const bank = await Bank.findById(id);
    if (!bank) {
      sendError(res, 'Bank not found.', 404);
      return;
    }

    const prev = { name: bank.name, status: bank.status };

    if (name) {
      const cleanName = name.trim();
      bank.name = cleanName;
      // Keep Program and Application denormalized bank names in sync
      await Program.updateMany({ bankId: bank._id }, { bankName: cleanName });
      const { Application } = await import('../models/Application');
      await Application.updateMany({ bankId: bank._id }, { bankName: cleanName });
    }
    if (code) bank.code = code.trim().toUpperCase();
    if (description !== undefined) bank.description = description.trim();
    if (status) bank.status = status;

    await bank.save();

    await logActivity({
      req,
      action: 'BANK_UPDATED',
      entityType: 'MASTER_DATA',
      entityId: bank._id.toString(),
      previousState: prev,
      newState: { name: bank.name, status: bank.status },
      details: `Updated bank ${bank.name}`,
    });

    sendSuccess(res, bank, 'Bank updated successfully.');
  } catch (error) {
    sendError(res, 'Failed to update bank.', 500);
  }
};

export const toggleBankStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const bank = await Bank.findById(id);
    if (!bank) {
      sendError(res, 'Bank not found.', 404);
      return;
    }

    const oldStatus = bank.status;
    bank.status = bank.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await bank.save();

    await logActivity({
      req,
      action: 'BANK_STATUS_TOGGLED',
      entityType: 'MASTER_DATA',
      entityId: bank._id.toString(),
      details: `Changed bank ${bank.name} status from ${oldStatus} to ${bank.status}`,
    });

    sendSuccess(res, bank, `Bank marked as ${bank.status}.`);
  } catch (error) {
    sendError(res, 'Failed to update bank status.', 500);
  }
};

