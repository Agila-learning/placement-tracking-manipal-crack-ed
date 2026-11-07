import { Request, Response } from 'express';
import { Program, IInterviewRoundConfig } from '../models/Program';
import { Bank } from '../models/Bank';
import { Application } from '../models/Application';
import { Payment } from '../models/Payment';
import { sendSuccess, sendError } from '../utils/response';
import { logActivity } from '../utils/auditLogger';

export const getPrograms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bankId, status } = req.query;
    const filter: any = {};
    if (bankId) filter.bankId = bankId;
    if (status) filter.status = status;

    const programs = await Program.find(filter)
      .populate('bankId', 'name code status')
      .sort({ bankName: 1, name: 1 });

    sendSuccess(res, programs, 'Programs retrieved successfully.');
  } catch (error) {
    sendError(res, 'Failed to fetch programs.', 500);
  }
};

export const getProgramById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const program = await Program.findById(id).populate('bankId', 'name code status');
    if (!program) {
      sendError(res, 'Program not found.', 404);
      return;
    }
    sendSuccess(res, program, 'Program details retrieved.');
  } catch (error) {
    sendError(res, 'Failed to fetch program details.', 500);
  }
};

export const createProgram = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      bankId,
      name,
      code,
      designation,
      salaryPackage,
      location,
      vendorAvailability,
      interviewRoundsConfig,
      enrollmentFeeAmount,
      paymentTrigger,
      isRefundable,
      loanAvailable,
      campusApplicable,
      batchNumber,
      status,
    } = req.body;

    if (!bankId || !name || !code) {
      sendError(res, 'Bank ID, Program Name, and Program Code are required.', 400);
      return;
    }

    const bank = await Bank.findById(bankId);
    if (!bank) {
      sendError(res, 'Selected bank does not exist.', 404);
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    const existing = await Program.findOne({
      $or: [{ code: cleanCode }, { bankId, name: cleanName }],
    });
    if (existing) {
      sendError(res, 'A program with this code or name for this bank already exists.', 409);
      return;
    }

    // Default interview rounds if not supplied
    const rounds: IInterviewRoundConfig[] =
      interviewRoundsConfig && interviewRoundsConfig.length > 0
        ? interviewRoundsConfig
        : [
            { roundId: 'r_l1', roundName: 'L1', isMandatory: true, order: 1, defaultMode: 'Online' },
            { roundId: 'r_l2', roundName: 'L2', isMandatory: true, order: 2, defaultMode: 'Online' },
            { roundId: 'r_mock', roundName: 'Mock', isMandatory: false, order: 3, defaultMode: 'Online' },
          ];

    const program = await Program.create({
      bankId: bank._id,
      bankName: bank.name,
      name: cleanName,
      code: cleanCode,
      designation: designation?.trim(),
      salaryPackage: salaryPackage?.trim(),
      location: location?.trim(),
      vendorAvailability: vendorAvailability || ['Manipal', 'Crack-ed'],
      interviewRoundsConfig: rounds,
      enrollmentFeeAmount: Number(enrollmentFeeAmount) || 0,
      paymentTrigger: paymentTrigger || 'AFTER_SELECTION',
      isRefundable: isRefundable !== undefined ? isRefundable : true,
      loanAvailable: loanAvailable !== undefined ? loanAvailable : true,
      campusApplicable: campusApplicable !== undefined ? campusApplicable : true,
      batchNumber: batchNumber?.trim(),
      status: status || 'ACTIVE',
    });

    await logActivity({
      req,
      action: 'PROGRAM_CREATED',
      entityType: 'MASTER_DATA',
      entityId: program._id.toString(),
      details: `Created program ${program.name} for ${bank.name}`,
      newState: { name: program.name, bankName: program.bankName, rounds: rounds.length },
    });

    sendSuccess(res, program, 'Program created successfully.', 201);
  } catch (error) {
    console.error('Create program error:', error);
    sendError(res, 'Failed to create program.', 500);
  }
};

export const updateProgram = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      designation,
      salaryPackage,
      location,
      vendorAvailability,
      interviewRoundsConfig,
      enrollmentFeeAmount,
      paymentTrigger,
      isRefundable,
      loanAvailable,
      campusApplicable,
      batchNumber,
      status,
    } = req.body;

    const program = await Program.findById(id);
    if (!program) {
      sendError(res, 'Program not found.', 404);
      return;
    }

    const prev = {
      name: program.name,
      fee: program.enrollmentFeeAmount,
      rounds: program.interviewRoundsConfig,
    };

    if (name) {
      program.name = name.trim();
      await Application.updateMany(
        { programId: program._id },
        { programName: program.name }
      );
    }
    if (designation !== undefined) program.designation = designation.trim();
    if (salaryPackage !== undefined) program.salaryPackage = salaryPackage.trim();
    if (location !== undefined) program.location = location.trim();
    if (vendorAvailability) program.vendorAvailability = vendorAvailability;
    if (interviewRoundsConfig) program.interviewRoundsConfig = interviewRoundsConfig;
    if (enrollmentFeeAmount !== undefined) {
      const newFee = Number(enrollmentFeeAmount);
      program.enrollmentFeeAmount = newFee;

      // Automatically sync all candidate payment records under this program
      const applications = await Application.find({ programId: program._id }).select('_id');
      const appIds = applications.map((a) => a._id);

      if (appIds.length > 0) {
        const payments = await Payment.find({ applicationId: { $in: appIds } });
        for (const p of payments) {
          p.enrollmentFeeAmount = newFee;
          const paid = Number(p.amountPaid) || 0;
          p.balanceAmount = Math.max(0, newFee - paid);
          if (paid >= newFee && newFee > 0) {
            p.paymentStatus = 'Paid';
          } else if (paid > 0) {
            p.paymentStatus = 'Partially Paid';
          } else {
            p.paymentStatus = 'Pending';
          }
          await p.save();
        }
      }
    }
    if (paymentTrigger) program.paymentTrigger = paymentTrigger;
    if (isRefundable !== undefined) program.isRefundable = isRefundable;
    if (loanAvailable !== undefined) program.loanAvailable = loanAvailable;
    if (campusApplicable !== undefined) program.campusApplicable = campusApplicable;
    if (batchNumber !== undefined) program.batchNumber = batchNumber.trim();
    if (status) program.status = status;

    await program.save();

    await logActivity({
      req,
      action: 'PROGRAM_UPDATED',
      entityType: 'MASTER_DATA',
      entityId: program._id.toString(),
      previousState: prev,
      newState: { name: program.name, fee: program.enrollmentFeeAmount },
      details: `Updated program ${program.name}`,
    });

    sendSuccess(res, program, 'Program updated successfully.');
  } catch (error) {
    sendError(res, 'Failed to update program.', 500);
  }
};

export const toggleProgramStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const program = await Program.findById(id);
    if (!program) {
      sendError(res, 'Program not found.', 404);
      return;
    }

    const oldStatus = program.status;
    program.status = program.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await program.save();

    await logActivity({
      req,
      action: 'PROGRAM_STATUS_TOGGLED',
      entityType: 'MASTER_DATA',
      entityId: program._id.toString(),
      details: `Changed program ${program.name} status from ${oldStatus} to ${program.status}`,
    });

    sendSuccess(res, program, `Program marked as ${program.status}.`);
  } catch (error) {
    sendError(res, 'Failed to update program status.', 500);
  }
};

