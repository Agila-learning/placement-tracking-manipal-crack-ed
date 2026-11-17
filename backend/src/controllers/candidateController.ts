import { Request, Response } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { Candidate } from '../models/Candidate';
import { Application } from '../models/Application';
import { Payment } from '../models/Payment';
import { LoanStatus } from '../models/LoanStatus';
import { CampusStatus } from '../models/CampusStatus';
import { Program } from '../models/Program';
import { Bank } from '../models/Bank';
import { Vendor } from '../models/Vendor';
import { User } from '../models/User';
import { generateApplicationNumber } from '../utils/idGenerator';
import { sendSuccess, sendError } from '../utils/response';
import { logActivity } from '../utils/auditLogger';

// ---- CANDIDATE MANAGEMENT ----

export const checkDuplicate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, mobile } = req.query;

    const existingEmail = email
      ? await Candidate.findOne({ email: String(email).toLowerCase().trim() })
      : null;
    const existingMobile = mobile
      ? await Candidate.findOne({ mobileNumber: String(mobile).trim() })
      : null;

    sendSuccess(res, {
      emailExists: !!existingEmail,
      mobileExists: !!existingMobile,
      existingCandidateEmail: existingEmail
        ? { id: existingEmail._id, name: existingEmail.fullName, email: existingEmail.email }
        : null,
      existingCandidateMobile: existingMobile
        ? { id: existingMobile._id, name: existingMobile.fullName, mobile: existingMobile.mobileNumber }
        : null,
    });
  } catch (error) {
    sendError(res, 'Failed to check duplicates.', 500);
  }
};

export const registerCandidateAndApplication = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      fullName,
      email,
      mobileNumber,
      dateOfBirth,
      state,
      stateCode,
      district,
      districtCode,
      city,
      bankId,
      programId,
      vendorId,
      hrReferenceId,
      batchNumber,
      paymentRoute,
      existingCandidateId,
      allowDuplicate,
    } = req.body;

    if (!fullName || !email || !mobileNumber || !bankId || !programId) {
      await session.abortTransaction();
      sendError(res, 'Full Name, Email, Mobile, Bank, and Program are required.', 400);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobileNumber.trim();

    let candidate: any;

    if (existingCandidateId) {
      // Adding a new application to an existing candidate
      candidate = await Candidate.findById(existingCandidateId).session(session);
      if (!candidate) {
        await session.abortTransaction();
        sendError(res, 'Existing candidate not found.', 404);
        return;
      }

      // Check if duplicate application already exists for this bank & program
      const existingApp = await Application.findOne({
        candidateId: candidate._id,
        bankId,
        programId,
      }).session(session);

      if (existingApp) {
        await session.abortTransaction();
        sendError(
          res,
          `Duplicate lead prohibited: Candidate '${candidate.fullName}' already has an active application (${existingApp.applicationNumber}) for this Bank and Program.`,
          409
        );
        return;
      }

      // Update location if provided
      if (state) candidate.state = state.trim();
      if (stateCode) candidate.stateCode = stateCode.trim();
      if (district || city) {
        candidate.district = (district || city).trim();
        candidate.city = (district || city).trim();
      }
      await candidate.save({ session });
    } else {
      // STRICT: Do not allow duplicate leads in Candidate or Application collections
      const dup = await Candidate.findOne({
        $or: [{ email: cleanEmail }, { mobileNumber: cleanMobile }],
      }).session(session);

      if (dup) {
        await session.abortTransaction();
        const fieldName = dup.mobileNumber === cleanMobile ? `mobile number (${cleanMobile})` : `email (${cleanEmail})`;
        sendError(
          res,
          `Duplicate lead prohibited: A candidate lead already exists with this ${fieldName} (Name: ${dup.fullName}). Duplicate leads cannot be registered.`,
          409
        );
        return;
      }

      const dupApp = await Application.findOne({
        $or: [{ candidateMobile: cleanMobile }, { candidateEmail: cleanEmail }],
      }).session(session);

      if (dupApp) {
        await session.abortTransaction();
        const fieldName = dupApp.candidateMobile === cleanMobile ? `mobile number (${cleanMobile})` : `email (${cleanEmail})`;
        sendError(
          res,
          `Duplicate lead prohibited: An application (${dupApp.applicationNumber}) already exists with this ${fieldName} for ${dupApp.candidateName}. Duplicate leads cannot be registered.`,
          409
        );
        return;
      }

      // Create new candidate profile
      const [newCandidate] = await Candidate.create(
        [
          {
            fullName: fullName.trim(),
            email: cleanEmail,
            mobileNumber: cleanMobile,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            state: state?.trim(),
            stateCode: stateCode?.trim(),
            district: (district || city)?.trim(),
            districtCode: districtCode?.trim(),
            city: (district || city)?.trim(),
            resumeUrl: (req as any).file?.path,
            resumeOriginalName: (req as any).file?.originalname,
            resumeMimeType: (req as any).file?.mimetype,
            totalApplicationsCount: 1,
          },
        ],
        { session }
      );
      candidate = newCandidate;
    }

    // Fetch bank, program, vendor, HR
    const bank = await Bank.findById(bankId).session(session);
    if (!bank) {
      await session.abortTransaction();
      sendError(res, 'Selected bank does not exist.', 404);
      return;
    }

    const program = await Program.findById(programId).session(session);
    if (!program) {
      await session.abortTransaction();
      sendError(res, 'Selected program does not exist.', 404);
      return;
    }

    let vendorDoc: any = null;
    if (vendorId) {
      vendorDoc = await Vendor.findById(vendorId).session(session);
    }
    const vendorName = vendorDoc ? vendorDoc.name : 'Direct';

    let hrUser: any = null;
    let hrRefId: any = undefined;
    let hrRefName = req.user?.name || 'Admin';

    if (hrReferenceId) {
      hrUser = await User.findById(hrReferenceId).session(session);
      if (hrUser) {
        hrRefId = hrUser._id;
        hrRefName = hrUser.name;
      }
    }

    // Build initial interview rounds from program config
    const sortedRounds = [...program.interviewRoundsConfig].sort((a, b) => a.order - b.order);
    const interviewRounds = sortedRounds.map((r) => ({
      roundId: r.roundId,
      roundName: r.roundName,
      isMandatory: r.isMandatory,
      order: r.order,
      currentStatus: 'Yet to Schedule',
      interviewMode: r.defaultMode || 'Online',
      attempts: [],
    }));

    // Determine payment route and loan rules
    const finalPaymentRoute = paymentRoute || 'ROUTE_A_VENDOR_LOAN';

    // Generate unique application number (retry if collision)
    let appNumber = generateApplicationNumber();
    let collision = await Application.findOne({ applicationNumber: appNumber }).session(session);
    let attempts = 0;
    while (collision && attempts < 5) {
      appNumber = generateApplicationNumber();
      collision = await Application.findOne({ applicationNumber: appNumber }).session(session);
      attempts++;
    }

    const [application] = await Application.create(
      [
        {
          applicationNumber: appNumber,
          candidateId: candidate._id,
          candidateName: candidate.fullName,
          candidateEmail: candidate.email,
          candidateMobile: candidate.mobileNumber,
          bankId: bank._id,
          bankName: bank.name,
          programId: program._id,
          programName: program.name,
          vendorId: vendorDoc ? vendorDoc._id : undefined,
          vendorName,
          hrReferenceId: hrRefId,
          hrReferenceName: hrRefName,
          batchNumber: batchNumber?.trim(),
          paymentRoute: finalPaymentRoute,
          overallStatus: 'Registered',
          interviewRounds,
          registrationDate: new Date(),
        },
      ],
      { session }
    );

    // Create payment record
    const isFullPayment = finalPaymentRoute === 'ROUTE_B_FULL_PAYMENT';
    const paymentStatus = isFullPayment ? 'Not Applicable' : 'Pending';
    const feeAmount = program.enrollmentFeeAmount;

    const [payment] = await Payment.create(
      [
        {
          applicationId: application._id,
          candidateId: candidate._id,
          applicationNumber: appNumber,
          candidateName: candidate.fullName,
          paymentRoute: finalPaymentRoute,
          enrollmentFeeAmount: isFullPayment ? 0 : feeAmount,
          amountPaid: 0,
          balanceAmount: isFullPayment ? 0 : feeAmount,
          paymentStatus,
          paymentTrigger: program.paymentTrigger,
          transactions: [],
          refund: {
            isRefundable: program.isRefundable,
            refundAmount: 0,
            refundStatus: 'NONE',
          },
        },
      ],
      { session }
    );

    // Create loan record
    const isLoanRequired = !isFullPayment && program.loanAvailable;
    const loanStatusValue = isFullPayment
      ? 'Not Applicable'
      : !program.loanAvailable
        ? 'Not Applicable'
        : 'Not Sanctioned';

    const [loanDoc] = await LoanStatus.create(
      [
        {
          applicationId: application._id,
          candidateId: candidate._id,
          applicationNumber: appNumber,
          isLoanRequired,
          loanStatus: loanStatusValue,
          vendorName: vendorName,
        },
      ],
      { session }
    );

    // Create campus record (only if applicable)
    let campusDoc: any = null;
    if (program.campusApplicable) {
      const [campus] = await CampusStatus.create(
        [
          {
            applicationId: application._id,
            candidateId: candidate._id,
            applicationNumber: appNumber,
            campusStatus: 'Pending',
          },
        ],
        { session }
      );
      campusDoc = campus;
    }

    // Update candidate application count if not new candidate
    if (existingCandidateId) {
      await Candidate.findByIdAndUpdate(
        candidate._id,
        { $inc: { totalApplicationsCount: 1 } },
        { session }
      );
    }

    await session.commitTransaction();

    await logActivity({
      req,
      action: 'APPLICATION_CREATED',
      entityType: 'APPLICATION',
      entityId: application._id.toString(),
      applicationNumber: appNumber,
      candidateName: candidate.fullName,
      details: `New application ${appNumber} created for ${candidate.fullName} - ${program.name} at ${bank.name} via ${vendorName}`,
      newState: {
        applicationNumber: appNumber,
        candidateName: candidate.fullName,
        program: program.name,
        bank: bank.name,
        vendor: vendorName,
        paymentRoute: finalPaymentRoute,
        loanRequired: isLoanRequired,
      },
    });

    sendSuccess(
      res,
      {
        candidate: { id: candidate._id, name: candidate.fullName, email: candidate.email },
        application: {
          id: application._id,
          applicationNumber: appNumber,
          overallStatus: application.overallStatus,
          paymentRoute: finalPaymentRoute,
        },
        payment: { id: payment._id, paymentStatus, enrollmentFeeAmount: payment.enrollmentFeeAmount },
        loan: { id: loanDoc._id, isLoanRequired, loanStatus: loanStatusValue },
        campus: campusDoc ? { id: campusDoc._id, campusStatus: 'Pending' } : null,
      },
      'Candidate and application registered successfully.',
      201
    );
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Registration error:', error);
    sendError(res, error.message || 'Failed to register candidate and application.', 500);
  } finally {
    session.endSession();
  }
};

// ---- APPLICATION LISTING (Candidate Tracking Table) ----

export const getApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '50',
      bank,
      program,
      vendor,
      hr,
      status,
      search,
      fromDate,
      toDate,
      sortBy = 'registrationDate',
      sortOrder = '-1',
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page)));
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit))));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};

    if (bank) filter.bankName = { $regex: String(bank), $options: 'i' };
    if (program) filter.programName = { $regex: String(program), $options: 'i' };
    if (vendor) filter.vendorName = { $regex: String(vendor), $options: 'i' };
    if (hr) filter.hrReferenceName = { $regex: String(hr), $options: 'i' };
    if (status) filter.overallStatus = String(status);

    if (fromDate || toDate) {
      filter.registrationDate = {};
      if (fromDate) filter.registrationDate.$gte = new Date(String(fromDate));
      if (toDate) filter.registrationDate.$lte = new Date(String(toDate));
    }

    if (search) {
      const s = String(search).trim();
      filter.$or = [
        { candidateName: { $regex: s, $options: 'i' } },
        { applicationNumber: { $regex: s, $options: 'i' } },
        { candidateEmail: { $regex: s, $options: 'i' } },
        { candidateMobile: { $regex: s, $options: 'i' } },
      ];
    }

    const sort: Record<string, 1 | -1> = {
      [String(sortBy)]: parseInt(String(sortOrder)) as 1 | -1,
    };

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .select(
          'applicationNumber candidateName candidateEmail candidateMobile bankName programName vendorName hrReferenceName batchNumber overallStatus interviewRounds paymentRoute registrationDate updatedAt'
        )
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Application.countDocuments(filter),
    ]);

    // Also get payment and loan status for the returned applications
    const appIds = applications.map((a) => a._id);
    const [payments, loans, campuses] = await Promise.all([
      Payment.find({ applicationId: { $in: appIds } })
        .select('applicationId paymentStatus amountPaid balanceAmount enrollmentFeeAmount')
        .lean(),
      LoanStatus.find({ applicationId: { $in: appIds } })
        .select('applicationId isLoanRequired loanStatus')
        .lean(),
      CampusStatus.find({ applicationId: { $in: appIds } })
        .select('applicationId campusStatus')
        .lean(),
    ]);

    const paymentMap: Record<string, any> = {};
    payments.forEach((p) => {
      paymentMap[p.applicationId.toString()] = p;
    });

    const loanMap: Record<string, any> = {};
    loans.forEach((l) => {
      loanMap[l.applicationId.toString()] = l;
    });

    const campusMap: Record<string, any> = {};
    campuses.forEach((c) => {
      campusMap[c.applicationId.toString()] = c;
    });

    const enriched = applications.map((app: any) => ({
      ...app,
      payment: paymentMap[app._id.toString()] || null,
      loan: loanMap[app._id.toString()] || null,
      campus: campusMap[app._id.toString()] || null,
    }));

    sendSuccess(
      res,
      enriched,
      'Applications retrieved successfully.',
      200,
      {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      }
    );
  } catch (error) {
    console.error('Get applications error:', error);
    sendError(res, 'Failed to fetch applications.', 500);
  }
};

// ---- SINGLE APPLICATION DETAIL ----

export const getApplicationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const [application, payment, loan, campus] = await Promise.all([
      Application.findById(id).populate('candidateId').lean(),
      Payment.findOne({ applicationId: id }).lean(),
      LoanStatus.findOne({ applicationId: id }).lean(),
      CampusStatus.findOne({ applicationId: id }).lean(),
    ]);

    if (!application) {
      sendError(res, 'Application not found.', 404);
      return;
    }

    // Auto-sync enrollment fee if Program Master was updated
    let finalPayment: any = payment;
    if (application.programId && payment) {
      const prog = await Program.findById(application.programId).select('enrollmentFeeAmount').lean();
      if (prog && prog.enrollmentFeeAmount !== undefined && prog.enrollmentFeeAmount !== payment.enrollmentFeeAmount) {
        const updatedPayment = await Payment.findOne({ applicationId: id });
        if (updatedPayment) {
          updatedPayment.enrollmentFeeAmount = prog.enrollmentFeeAmount;
          const paid = Number(updatedPayment.amountPaid) || 0;
          updatedPayment.balanceAmount = Math.max(0, prog.enrollmentFeeAmount - paid);
          if (paid >= prog.enrollmentFeeAmount && prog.enrollmentFeeAmount > 0) {
            updatedPayment.paymentStatus = 'Paid';
          } else if (paid > 0) {
            updatedPayment.paymentStatus = 'Partially Paid';
          } else {
            updatedPayment.paymentStatus = 'Pending';
          }
          await updatedPayment.save();
          finalPayment = updatedPayment.toObject();
        }
      }
    }

    sendSuccess(res, {
      ...application,
      payment: finalPayment,
      loan,
      campus,
    });
  } catch (error) {
    sendError(res, 'Failed to fetch application details.', 500);
  }
};

// ---- UPDATE OVERALL STATUS ----

export const updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { overallStatus, remarks } = req.body;

    if (!overallStatus) {
      sendError(res, 'Overall status is required.', 400);
      return;
    }

    const application = await Application.findById(id);
    if (!application) {
      sendError(res, 'Application not found.', 404);
      return;
    }

    // Step-by-step update pipeline check:
    // Candidate cannot be marked as Selected, Fee Pending, Loan, Campus Reporting or Arrived in Campus
    // without clearing all mandatory interview rounds!
    const advancedStages = [
      'Selected',
      'Enrollment Fee Pending',
      'Loan Processing',
      'Campus Reporting Pending',
      'Arrived in Campus',
    ];

    if (advancedStages.includes(overallStatus)) {
      const mandatoryRounds = (application.interviewRounds || []).filter((r) => r.isMandatory);
      const incompleteRounds = mandatoryRounds.filter(
        (r) =>
          !['Selected', 'Passed', 'Completed'].includes(r.currentStatus) &&
          !['Selected', 'Passed'].includes(r.result || '')
      );

      if (incompleteRounds.length > 0) {
        const roundNames = incompleteRounds.map((r) => r.roundName).join(', ');
        sendError(
          res,
          `Step-by-step update required: Candidate cannot be moved to '${overallStatus}'. Mandatory interview round(s) [${roundNames}] must be evaluated and marked as Passed / Selected first.`,
          400
        );
        return;
      }
    }

    const previousStatus = application.overallStatus;
    application.overallStatus = overallStatus;
    if (remarks) application.remarks = remarks;

    await application.save();

    // Auto-sync CampusStatus if overallStatus changed to campus-related milestone
    if (overallStatus === 'Arrived in Campus') {
      await CampusStatus.findOneAndUpdate(
        { applicationId: application._id },
        {
          campusStatus: 'Arrived in Campus',
          arrivalDate: new Date(),
          applicationNumber: application.applicationNumber,
          candidateId: application.candidateId,
        },
        { upsert: true }
      );
    } else if (overallStatus === 'Dropped') {
      await CampusStatus.findOneAndUpdate(
        { applicationId: application._id },
        { campusStatus: 'Dropped' }
      );
    }

    await logActivity({
      req,
      action: 'APPLICATION_STATUS_UPDATED',
      entityType: 'APPLICATION',
      entityId: application._id.toString(),
      applicationNumber: application.applicationNumber,
      candidateName: application.candidateName,
      previousState: { status: previousStatus },
      newState: { status: overallStatus },
      details: `Status changed from '${previousStatus}' to '${overallStatus}' for application ${application.applicationNumber}`,
    });

    sendSuccess(
      res,
      {
        applicationNumber: application.applicationNumber,
        overallStatus: application.overallStatus,
        previousStatus,
      },
      'Application status updated successfully.'
    );
  } catch (error) {
    sendError(res, 'Failed to update application status.', 500);
  }
};

// ---- UPDATE CANDIDATE & APPLICATION DETAILS ----

export const updateCandidateAndApplicationDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      fullName,
      email,
      mobileNumber,
      dateOfBirth,
      state,
      stateCode,
      district,
      city,
      bankId,
      programId,
      vendorId,
      hrReferenceId,
      paymentRoute,
      batchNumber,
      remarks,
    } = req.body;

    const application = await Application.findById(id);
    if (!application) {
      sendError(res, 'Application not found.', 404);
      return;
    }

    // Check if new mobile or email duplicates another candidate
    if (mobileNumber || email) {
      const orConditions: any[] = [];
      if (mobileNumber) orConditions.push({ mobileNumber: mobileNumber.trim() });
      if (email) orConditions.push({ email: email.trim().toLowerCase() });

      const dupCand = await Candidate.findOne({
        _id: { $ne: application.candidateId },
        $or: orConditions,
      });

      if (dupCand) {
        sendError(
          res,
          `Duplicate lead prohibited: Another candidate profile already exists with this ${dupCand.mobileNumber === mobileNumber?.trim() ? 'mobile number' : 'email'} (Name: ${dupCand.fullName}).`,
          409
        );
        return;
      }
    }

    const prevName = application.candidateName;

    // Update Bank
    if (bankId && String(application.bankId) !== String(bankId)) {
      const bank = await Bank.findById(bankId);
      if (bank) {
        application.bankId = bank._id;
        application.bankName = bank.name;
      }
    }

    // Update Program
    if (programId && String(application.programId) !== String(programId)) {
      const program = await Program.findById(programId);
      if (program) {
        application.programId = program._id;
        application.programName = program.name;
        // If bank wasn't explicitly provided, sync bank from this program
        if (!bankId && program.bankId) {
          application.bankId = program.bankId;
          application.bankName = program.bankName;
        }

        // Sync payment record fee if present
        const payment = await Payment.findOne({ applicationId: application._id });
        if (payment && program.enrollmentFeeAmount !== undefined) {
          payment.enrollmentFeeAmount = program.enrollmentFeeAmount;
          const paid = Number(payment.amountPaid) || 0;
          payment.balanceAmount = Math.max(0, program.enrollmentFeeAmount - paid);
          if (paid >= program.enrollmentFeeAmount && program.enrollmentFeeAmount > 0) {
            payment.paymentStatus = 'Paid';
          } else if (paid > 0) {
            payment.paymentStatus = 'Partially Paid';
          } else {
            payment.paymentStatus = 'Pending';
          }
          await payment.save();
        }
      }
    }

    // Update Vendor
    if (vendorId !== undefined) {
      if (vendorId && vendorId !== 'NONE' && vendorId !== '') {
        const vendor = await Vendor.findById(vendorId);
        if (vendor) {
          application.vendorId = vendor._id;
          application.vendorName = vendor.name;
        }
      } else {
        application.vendorId = undefined;
        application.vendorName = '';
      }
    }

    // Update HR Reference
    if (hrReferenceId !== undefined) {
      if (hrReferenceId && hrReferenceId !== 'NONE' && hrReferenceId !== '') {
        const hr = await User.findById(hrReferenceId);
        if (hr) {
          application.hrReferenceId = hr._id;
          application.hrReferenceName = hr.name;
        }
      } else {
        application.hrReferenceId = undefined;
        application.hrReferenceName = '';
      }
    }

    // Update Payment Route
    if (paymentRoute && (paymentRoute === 'ROUTE_A_VENDOR_LOAN' || paymentRoute === 'ROUTE_B_FULL_PAYMENT')) {
      application.paymentRoute = paymentRoute;
    }

    // Update application fields
    if (fullName) application.candidateName = fullName.trim();
    if (email) application.candidateEmail = email.trim().toLowerCase();
    if (mobileNumber) application.candidateMobile = mobileNumber.trim();
    if (batchNumber !== undefined) application.batchNumber = batchNumber.trim();
    if (remarks !== undefined) application.remarks = remarks.trim();
    await application.save();

    // Update underlying Candidate profile
    if (application.candidateId) {
      const candidate = await Candidate.findById(application.candidateId);
      if (candidate) {
        if (fullName) candidate.fullName = fullName.trim();
        if (email) candidate.email = email.trim().toLowerCase();
        if (mobileNumber) candidate.mobileNumber = mobileNumber.trim();
        if (dateOfBirth) candidate.dateOfBirth = new Date(dateOfBirth);
        if (state) candidate.state = state.trim();
        if (stateCode) candidate.stateCode = stateCode.trim();
        if (district || city) {
          candidate.district = (district || city).trim();
          candidate.city = (district || city).trim();
        }
        await candidate.save();
      }
    }

    await logActivity({
      req,
      action: 'CANDIDATE_DETAILS_UPDATED',
      entityType: 'APPLICATION',
      entityId: application._id.toString(),
      applicationNumber: application.applicationNumber,
      candidateName: application.candidateName,
      previousState: { name: prevName },
      newState: {
        name: application.candidateName,
        mobile: application.candidateMobile,
        email: application.candidateEmail,
        bank: application.bankName,
        program: application.programName,
        vendor: application.vendorName,
        hr: application.hrReferenceName,
      },
      details: `Candidate details edited for application ${application.applicationNumber}`,
    });

    sendSuccess(res, application, 'Candidate details updated successfully.');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update candidate details.', 500);
  }
};

// ---- UPDATE INTERVIEW ROUND ----

export const updateInterviewRound = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, roundId } = req.params;
    const {
      currentStatus,
      scheduledDate,
      scheduledTime,
      interviewMode,
      venueOrLink,
      interviewerName,
      result,
      remarks,
    } = req.body;

    const application = await Application.findById(id);
    if (!application) {
      sendError(res, 'Application not found.', 404);
      return;
    }

    const roundIndex = application.interviewRounds.findIndex((r) => r.roundId === roundId);
    if (roundIndex === -1) {
      sendError(res, `Interview round '${roundId}' not found in this application.`, 404);
      return;
    }

    const round = application.interviewRounds[roundIndex];
    const previousStatus = round.currentStatus;

    // Push current state to attempts history before overwriting
    if (previousStatus !== 'Yet to Schedule') {
      round.attempts.push({
        attemptNumber: round.attempts.length + 1,
        scheduledDate: round.scheduledDate,
        scheduledTime: round.scheduledTime,
        interviewMode: round.interviewMode || 'Online',
        venueOrLink: round.venueOrLink,
        interviewerName: round.interviewerName,
        status: previousStatus,
        result: round.result as 'Selected' | 'Rejected' | 'Absent' | 'On Hold' | 'Pending' | undefined,
        remarks: round.remarks,
        updatedBy: req.user?.userId || 'System',
        updatedByName: req.user?.name || 'System',
        updatedAt: new Date(),
      });
    }

    // Update round with new information and auto-sync status/result
    if (result !== undefined && result !== '') {
      round.result = result;
      if (['Passed', 'Selected'].includes(result)) {
        round.currentStatus = 'Selected';
      } else if (['Failed', 'Rejected'].includes(result)) {
        round.currentStatus = 'Rejected';
      } else if (result === 'Absent') {
        round.currentStatus = 'Absent';
      } else if (result === 'On Hold') {
        round.currentStatus = 'On Hold';
      }
    }

    if (currentStatus) {
      if (currentStatus === 'Passed') {
        round.currentStatus = 'Selected';
        if (!round.result) round.result = 'Passed';
      } else if (currentStatus === 'Failed') {
        round.currentStatus = 'Rejected';
        if (!round.result) round.result = 'Failed';
      } else {
        round.currentStatus = currentStatus;
      }
    }

    if (scheduledDate) round.scheduledDate = new Date(scheduledDate);
    if (scheduledTime !== undefined) round.scheduledTime = scheduledTime;
    if (interviewMode) round.interviewMode = interviewMode;
    if (venueOrLink !== undefined) round.venueOrLink = venueOrLink;
    if (interviewerName !== undefined) round.interviewerName = interviewerName;
    if (remarks !== undefined) round.remarks = remarks;
    round.lastUpdated = new Date();

    // If date is scheduled and status still 'Yet to Schedule', advance to 'Scheduled'
    if (round.scheduledDate && round.currentStatus === 'Yet to Schedule') {
      round.currentStatus = 'Scheduled';
    }

    // Auto-sync application overallStatus based on mandatory rounds
    application.interviewRounds[roundIndex] = round;

    const mandatoryRounds = (application.interviewRounds || []).filter((r) => r.isMandatory);
    const anyMandatoryRejected = mandatoryRounds.some(
      (r) => r.currentStatus === 'Rejected' || r.result === 'Rejected' || r.result === 'Failed'
    );
    const allMandatoryCleared =
      mandatoryRounds.length > 0 &&
      mandatoryRounds.every(
        (r) =>
          ['Selected', 'Passed', 'Completed'].includes(r.currentStatus) ||
          ['Selected', 'Passed'].includes(r.result || '')
      );

    if (anyMandatoryRejected) {
      application.overallStatus = 'Rejected';
    } else if (
      allMandatoryCleared &&
      ['Registered', 'Awaiting Interview', 'Interview in Progress', 'Referred'].includes(application.overallStatus)
    ) {
      application.overallStatus = 'Selected';
    } else if (['Registered', 'Referred'].includes(application.overallStatus)) {
      application.overallStatus = 'Interview in Progress';
    }

    await application.save();

    await logActivity({
      req,
      action: 'INTERVIEW_ROUND_UPDATED',
      entityType: 'INTERVIEW',
      entityId: application._id.toString(),
      applicationNumber: application.applicationNumber,
      candidateName: application.candidateName,
      previousState: { roundId, status: previousStatus },
      newState: { roundId, roundName: round.roundName, status: currentStatus, result },
      details: `Round '${round.roundName}' status changed from '${previousStatus}' to '${currentStatus}' for ${application.applicationNumber}`,
    });

    sendSuccess(
      res,
      {
        applicationNumber: application.applicationNumber,
        roundId,
        roundName: round.roundName,
        currentStatus: round.currentStatus,
        result: round.result as 'Selected' | 'Rejected' | 'Absent' | 'On Hold' | 'Pending' | undefined,
        scheduledDate: round.scheduledDate,
        attempts: round.attempts.length,
      },
      `Interview round '${round.roundName}' updated successfully.`
    );
  } catch (error: any) {
    console.error('Update interview round error:', error);
    sendError(res, error.message || 'Failed to update interview round.', 500);
  }
};

// ---- UPDATE RESUME ----

export const updateCandidateResume = async (req: Request, res: Response): Promise<void> => {
  try {
    const { candidateId } = req.params;

    if (!(req as any).file) {
      sendError(res, 'No file uploaded.', 400);
      return;
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      sendError(res, 'Candidate not found.', 404);
      return;
    }

    candidate.resumeUrl = (req as any).file.path;
    candidate.resumeOriginalName = (req as any).file.originalname;
    candidate.resumeMimeType = (req as any).file.mimetype;
    await candidate.save();

    await logActivity({
      req,
      action: 'RESUME_UPLOADED',
      entityType: 'CANDIDATE',
      entityId: candidateId,
      candidateName: candidate.fullName,
      details: `Resume updated for candidate ${candidate.fullName}`,
    });

    sendSuccess(res, { resumeUrl: candidate.resumeUrl }, 'Resume uploaded successfully.');
  } catch (error) {
    sendError(res, 'Failed to upload resume.', 500);
  }
};

// ---- UPDATE PAYMENT ----

export const recordPayment = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { applicationId } = req.params;
    let { transactionId, amount, paymentMode, paymentDate, referenceNotes, receiptNumber, paymentStatus } = req.body;

    const payment = await Payment.findOne({ applicationId }).session(session);
    if (!payment) {
      await session.abortTransaction();
      sendError(res, 'Payment record not found.', 404);
      return;
    }

    // Default payment mode if omitted
    if (!paymentMode) paymentMode = 'UPI';

    // Auto-generate transaction ID / reference if omitted by user
    if (!transactionId || !transactionId.trim()) {
      transactionId = `MANUAL-${Date.now().toString().slice(-6)}`;
    }

    // Handle manual status override if specified (e.g. 'Paid', 'Partially Paid', 'Pending')
    if (paymentStatus === 'Paid') {
      const amountToRecord = amount ? parseFloat(String(amount)) : (payment.balanceAmount > 0 ? payment.balanceAmount : payment.enrollmentFeeAmount);

      payment.transactions.push({
        transactionId: transactionId.trim(),
        amount: amountToRecord,
        paymentMode,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        referenceNotes: referenceNotes?.trim() || 'Marked Paid manually',
        receiptNumber: receiptNumber?.trim(),
        recordedBy: req.user?.userId || 'System',
        recordedByName: req.user?.name || 'System',
        isVerified: true,
        createdAt: new Date(),
      });

      payment.amountPaid = payment.enrollmentFeeAmount;
      payment.balanceAmount = 0;
      payment.paymentStatus = 'Paid';
    } else if (paymentStatus === 'Pending') {
      payment.amountPaid = 0;
      payment.balanceAmount = payment.enrollmentFeeAmount;
      payment.paymentStatus = 'Pending';
      if (referenceNotes) {
        payment.transactions.push({
          transactionId: transactionId.trim(),
          amount: 0,
          paymentMode,
          paymentDate: new Date(),
          referenceNotes: referenceNotes?.trim() || 'Status marked as Pending',
          recordedBy: req.user?.userId || 'System',
          recordedByName: req.user?.name || 'System',
          isVerified: false,
          createdAt: new Date(),
        });
      }
    } else {
      // Standard transaction amount entry
      const amountNum = parseFloat(String(amount || 0));
      if (isNaN(amountNum) || amountNum <= 0) {
        await session.abortTransaction();
        sendError(res, 'Please provide a valid payment amount or select a status.', 400);
        return;
      }

      payment.transactions.push({
        transactionId: transactionId.trim(),
        amount: amountNum,
        paymentMode,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        referenceNotes: referenceNotes?.trim(),
        receiptNumber: receiptNumber?.trim(),
        recordedBy: req.user?.userId || 'System',
        recordedByName: req.user?.name || 'System',
        isVerified: false,
        createdAt: new Date(),
      });

      payment.amountPaid += amountNum;
      payment.balanceAmount = Math.max(0, payment.enrollmentFeeAmount - payment.amountPaid);

      if (payment.amountPaid >= payment.enrollmentFeeAmount) {
        payment.paymentStatus = 'Paid';
      } else if (payment.amountPaid > 0) {
        payment.paymentStatus = 'Partially Paid';
      }
    }

    await payment.save({ session });
    await session.commitTransaction();

    await logActivity({
      req,
      action: 'PAYMENT_RECORDED',
      entityType: 'PAYMENT',
      entityId: payment._id.toString(),
      applicationNumber: payment.applicationNumber,
      candidateName: payment.candidateName,
      details: `Payment updated: Status ${payment.paymentStatus}, Paid: ₹${payment.amountPaid}, Balance: ₹${payment.balanceAmount} (Ref: ${transactionId})`,
      newState: {
        amountPaid: payment.amountPaid,
        balance: payment.balanceAmount,
        paymentStatus: payment.paymentStatus,
      },
    });

    sendSuccess(res, {
      paymentStatus: payment.paymentStatus,
      amountPaid: payment.amountPaid,
      balanceAmount: payment.balanceAmount,
      transactionId,
    }, 'Payment updated successfully.');
  } catch (error) {
    await session.abortTransaction();
    sendError(res, 'Failed to record payment.', 500);
  } finally {
    session.endSession();
  }
};

// ---- VERIFY PAYMENT ----

export const verifyPaymentTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, transactionMongoId } = req.params;

    const payment = await Payment.findOne({ applicationId });
    if (!payment) {
      sendError(res, 'Payment record not found.', 404);
      return;
    }

    const txn = (payment.transactions as any).id(transactionMongoId);
    if (!txn) {
      sendError(res, 'Transaction not found.', 404);
      return;
    }

    txn.isVerified = true;
    txn.verifiedBy = req.user?.userId;
    txn.verifiedByName = req.user?.name;
    txn.verifiedAt = new Date();

    await payment.save();

    await logActivity({
      req,
      action: 'PAYMENT_VERIFIED',
      entityType: 'PAYMENT',
      entityId: payment._id.toString(),
      applicationNumber: payment.applicationNumber,
      details: `Transaction ${txn.transactionId} verified by ${req.user?.name}`,
    });

    sendSuccess(res, null, 'Transaction verified successfully.');
  } catch (error) {
    sendError(res, 'Failed to verify payment.', 500);
  }
};

// ---- UPDATE LOAN STATUS ----

export const updateLoanStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const { loanStatus, isLoanRequired, remarks, sanctionDate, sanctionAmount } = req.body;

    let loan = await LoanStatus.findOne({ applicationId });
    if (!loan) {
      const application = await Application.findById(applicationId);
      if (!application) {
        sendError(res, 'Application not found.', 404);
        return;
      }
      loan = new LoanStatus({
        applicationId: application._id,
        candidateId: application.candidateId,
        applicationNumber: application.applicationNumber,
        isLoanRequired: isLoanRequired !== undefined ? isLoanRequired : true,
        loanStatus: loanStatus || 'Not Sanctioned',
      });
    }

    const previousStatus = loan.loanStatus;

    if (loanStatus) loan.loanStatus = loanStatus;
    if (isLoanRequired !== undefined) loan.isLoanRequired = isLoanRequired;
    if (remarks !== undefined) loan.remarks = remarks;
    if (sanctionDate && !isNaN(new Date(sanctionDate).getTime())) {
      loan.sanctionDate = new Date(sanctionDate);
    } else if (sanctionDate === '') {
      loan.sanctionDate = undefined;
    }
    if (sanctionAmount !== undefined && sanctionAmount !== '') {
      loan.sanctionAmount = Number(sanctionAmount);
    }
    loan.updatedBy = req.user?.userId;
    loan.updatedByName = req.user?.name;

    await loan.save();

    await logActivity({
      req,
      action: 'LOAN_STATUS_UPDATED',
      entityType: 'LOAN',
      entityId: loan._id.toString(),
      applicationNumber: loan.applicationNumber,
      previousState: { loanStatus: previousStatus },
      newState: { loanStatus: loan.loanStatus, isLoanRequired: loan.isLoanRequired },
      details: `Loan status changed from '${previousStatus}' to '${loan.loanStatus}'`,
    });

    sendSuccess(res, loan, 'Loan status updated successfully.');
  } catch (error: any) {
    console.error('Error updating loan status:', error);
    sendError(res, error.message || 'Failed to update loan status.', 500);
  }
};

// ---- UPDATE CAMPUS STATUS ----

export const updateCampusStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    let { campusStatus, arrivalDate, campusLocation, reportingBatch, remarks } = req.body;

    let campus = await CampusStatus.findOne({ applicationId });
    if (!campus) {
      const application = await Application.findById(applicationId);
      if (!application) {
        sendError(res, 'Application not found.', 404);
        return;
      }
      campus = new CampusStatus({
        applicationId: application._id,
        candidateId: application.candidateId,
        applicationNumber: application.applicationNumber,
        campusStatus: campusStatus || 'Pending',
      });
    }

    const previousStatus = campus.campusStatus;

    if (campusStatus) {
      // Normalize 'Arrived / Reported' or other common variants
      if (campusStatus === 'Arrived / Reported' || campusStatus === 'Arrived') {
        campus.campusStatus = 'Arrived in Campus';
      } else {
        campus.campusStatus = campusStatus;
      }
    }

    if (arrivalDate && !isNaN(new Date(arrivalDate).getTime())) {
      campus.arrivalDate = new Date(arrivalDate);
    } else if (arrivalDate === '') {
      campus.arrivalDate = undefined;
    }

    if (campusLocation !== undefined) campus.campusLocation = campusLocation;
    if (reportingBatch !== undefined) campus.reportingBatch = reportingBatch;
    if (remarks !== undefined) campus.remarks = remarks;
    campus.updatedBy = req.user?.userId;
    campus.updatedByName = req.user?.name;

    await campus.save();

    // If campus reached 'Arrived in Campus', sync overall application status if appropriate
    if (campus.campusStatus === 'Arrived in Campus') {
      await Application.findByIdAndUpdate(applicationId, {
        overallStatus: 'Arrived in Campus',
      });
    }

    await logActivity({
      req,
      action: 'CAMPUS_STATUS_UPDATED',
      entityType: 'CAMPUS',
      entityId: campus._id.toString(),
      applicationNumber: campus.applicationNumber,
      previousState: { campusStatus: previousStatus },
      newState: { campusStatus: campus.campusStatus },
      details: `Campus status changed from '${previousStatus}' to '${campus.campusStatus}'`,
    });

    sendSuccess(res, campus, 'Campus status updated successfully.');
  } catch (error: any) {
    console.error('Error updating campus status:', error);
    sendError(res, error.message || 'Failed to update campus status.', 500);
  }
};

// ---- ACTIVITY LOGS ----

export const getApplicationActivityLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationNumber } = req.params;
    const { ActivityLog } = await import('../models/ActivityLog');

    const logs = await ActivityLog.find({
      $or: [
        { applicationNumber },
        { entityId: req.params.applicationNumber },
      ],
    })
      .sort({ timestamp: -1 })
      .limit(200)
      .lean();

    sendSuccess(res, logs, 'Activity logs retrieved.');
  } catch (error) {
    sendError(res, 'Failed to fetch activity logs.', 500);
  }
};

// ---- UPDATE ENROLLMENT FEE ----
export const updateEnrollmentFee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const { enrollmentFeeAmount, remarks } = req.body;

    if (!enrollmentFeeAmount || isNaN(Number(enrollmentFeeAmount)) || Number(enrollmentFeeAmount) <= 0) {
      sendError(res, 'Valid enrollment fee amount is required.', 400);
      return;
    }

    const payment = await Payment.findOne({ applicationId });
    if (!payment) {
      sendError(res, 'Payment record not found.', 404);
      return;
    }

    const previousFee = payment.enrollmentFeeAmount;
    const newFee = Number(enrollmentFeeAmount);

    payment.enrollmentFeeAmount = newFee;
    payment.balanceAmount = Math.max(0, newFee - payment.amountPaid);

    // Auto-update payment status based on new fee
    if (payment.amountPaid >= newFee) {
      payment.paymentStatus = 'Paid';
    } else if (payment.amountPaid > 0) {
      payment.paymentStatus = 'Partially Paid';
    } else {
      payment.paymentStatus = 'Pending';
    }

    if (remarks) payment.notes = remarks;

    await payment.save();

    await logActivity({
      req,
      action: 'ENROLLMENT_FEE_UPDATED',
      entityType: 'PAYMENT',
      entityId: payment._id.toString(),
      applicationNumber: payment.applicationNumber,
      previousState: { enrollmentFeeAmount: previousFee },
      newState: { enrollmentFeeAmount: newFee, paymentStatus: payment.paymentStatus },
      details: `Enrollment fee updated from ₹${previousFee} to ₹${newFee} by ${req.user?.name}`,
    });

    sendSuccess(res, payment, 'Enrollment fee updated successfully.');
  } catch (error) {
    sendError(res, 'Failed to update enrollment fee.', 500);
  }
};

// ---- SYNC PROGRAM FEE FROM MASTER ----
export const syncProgramFee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id);
    if (!application) {
      sendError(res, 'Application not found.', 404);
      return;
    }
    const program = await Program.findById(application.programId);
    if (!program) {
      sendError(res, 'Associated program not found in masters.', 404);
      return;
    }
    const payment = await Payment.findOne({ applicationId: id });
    if (!payment) {
      sendError(res, 'Payment record not found.', 404);
      return;
    }

    const previousFee = payment.enrollmentFeeAmount;
    payment.enrollmentFeeAmount = program.enrollmentFeeAmount;
    const paid = Number(payment.amountPaid) || 0;
    payment.balanceAmount = Math.max(0, program.enrollmentFeeAmount - paid);
    if (paid >= program.enrollmentFeeAmount && program.enrollmentFeeAmount > 0) {
      payment.paymentStatus = 'Paid';
    } else if (paid > 0) {
      payment.paymentStatus = 'Partially Paid';
    } else {
      payment.paymentStatus = 'Pending';
    }
    await payment.save();

    await logActivity({
      req,
      action: 'ENROLLMENT_FEE_UPDATED',
      entityType: 'PAYMENT',
      entityId: payment._id.toString(),
      applicationNumber: application.applicationNumber,
      previousState: { enrollmentFeeAmount: previousFee },
      newState: { enrollmentFeeAmount: program.enrollmentFeeAmount, paymentStatus: payment.paymentStatus },
      details: `Enrollment fee synced from Program Master (${program.name}): ₹${previousFee} -> ₹${program.enrollmentFeeAmount}`,
    });

    sendSuccess(res, payment, `Enrollment fee synced with Program Master (₹${program.enrollmentFeeAmount.toLocaleString('en-IN')}).`);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to sync program fee.', 500);
  }
};

// ---- UPDATE COMMISSION STATUS ----
export const updateCommissionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const { commissionStatus, commissionAmount, commissionCollectedDate, commissionNotes } = req.body;

    const application = await Application.findById(applicationId);
    if (!application) {
      sendError(res, 'Application not found.', 404);
      return;
    }

    const previous = application.commissionStatus;

    if (commissionStatus) application.commissionStatus = commissionStatus;
    if (commissionAmount !== undefined) application.commissionAmount = Number(commissionAmount);
    if (commissionCollectedDate) application.commissionCollectedDate = new Date(commissionCollectedDate);
    if (commissionNotes !== undefined) application.commissionNotes = commissionNotes;
    application.commissionUpdatedBy = req.user?.userId;
    application.commissionUpdatedByName = req.user?.name;
    application.commissionUpdatedAt = new Date();

    await application.save();

    await logActivity({
      req,
      action: 'COMMISSION_UPDATED',
      entityType: 'APPLICATION',
      entityId: application._id.toString(),
      applicationNumber: application.applicationNumber,
      previousState: { commissionStatus: previous },
      newState: { commissionStatus: application.commissionStatus },
      details: `Commission status updated to '${application.commissionStatus}' by ${req.user?.name}`,
    });

    sendSuccess(res, application, 'Commission status updated successfully.');
  } catch (error) {
    sendError(res, 'Failed to update commission status.', 500);
  }
};

// ---- DASHBOARD STATS ----

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Reconcile CampusStatus records where Application is marked 'Arrived in Campus'
    const arrivedAppIds = await Application.find({ overallStatus: 'Arrived in Campus' }).distinct('_id');
    if (arrivedAppIds.length > 0) {
      await CampusStatus.updateMany(
        { applicationId: { $in: arrivedAppIds }, campusStatus: { $ne: 'Arrived in Campus' } },
        { $set: { campusStatus: 'Arrived in Campus' } }
      );
    }

    const activeAppIds = await Application.find().distinct('_id');

    const [
      totalApplications,
      byStatus,
      byVendor,
      byBank,
      byProgram,
      paymentStats,
      loanStats,
      campusStats,
      commissionStats,
    ] = await Promise.all([
      Application.countDocuments(),
      Application.aggregate([{ $group: { _id: '$overallStatus', count: { $sum: 1 } } }]),
      Application.aggregate([{ $group: { _id: '$vendorName', count: { $sum: 1 } } }]),
      Application.aggregate([{ $group: { _id: '$bankName', count: { $sum: 1 } } }]),
      Application.aggregate([{ $group: { _id: '$programName', count: { $sum: 1 } } }]),
      Payment.aggregate([
        { $match: { applicationId: { $in: activeAppIds } } },
        { $group: { _id: '$paymentStatus', count: { $sum: 1 }, totalFee: { $sum: '$enrollmentFeeAmount' }, totalPaid: { $sum: '$amountPaid' } } },
      ]),
      LoanStatus.aggregate([
        { $match: { applicationId: { $in: activeAppIds } } },
        { $group: { _id: '$loanStatus', count: { $sum: 1 } } },
      ]),
      CampusStatus.aggregate([
        { $match: { applicationId: { $in: activeAppIds } } },
        { $group: { _id: '$campusStatus', count: { $sum: 1 } } },
      ]),
      Application.aggregate([{ $group: { _id: '$commissionStatus', count: { $sum: 1 } } }]),
    ]);

    const statusMap = Object.fromEntries(byStatus.map((s: any) => [s._id, s.count]));
    const vendorMap = Object.fromEntries(byVendor.map((v: any) => [v._id, v.count]));
    const paymentMap = Object.fromEntries(paymentStats.map((p: any) => [p._id, { count: p.count, totalFee: p.totalFee, totalPaid: p.totalPaid }]));
    const loanMap = Object.fromEntries(loanStats.map((l: any) => [l._id, l.count]));
    const campusMap = Object.fromEntries(campusStats.map((c: any) => [c._id, c.count]));
    const commissionMap = Object.fromEntries(commissionStats.map((c: any) => [c._id, c.count]));

    const interviewsScheduled = await Application.countDocuments({
      interviewRounds: {
        $elemMatch: { currentStatus: 'Scheduled' },
      },
    });

    const interviewsYetToSchedule = await Application.countDocuments({
      overallStatus: { $in: ['Referred', 'Awaiting Interview'] },
      interviewRounds: {
        $not: { $elemMatch: { currentStatus: { $in: ['Scheduled', 'Completed', 'Selected'] } } },
      },
    });

    // Bank selection count: strictly calculated based on L2 or Final Mock round selection (not campus arrival)
    const bankSelectedAppIds = await Application.find({
      $or: [
        {
          interviewRounds: {
            $elemMatch: {
              roundName: { $regex: /L2|Mock|Final/i },
              $or: [{ currentStatus: 'Selected' }, { result: 'Selected' }],
            },
          },
        },
        { overallStatus: 'Selected' },
      ],
    }).distinct('_id');

    const bankSelectedCount = bankSelectedAppIds.length;
    const feePendingCount = statusMap['Enrollment Fee Pending'] || 0;

    // A candidate is only counted as Enrolled IF they have cleared Bank Selection (L2/Mock) and their fee is Paid
    const enrolledCount = await Payment.countDocuments({
      applicationId: { $in: bankSelectedAppIds },
      paymentStatus: 'Paid',
    });

    sendSuccess(res, {
      totalApplications,
      byStatus: statusMap,
      byVendor: vendorMap,
      byBank,
      byProgram,
      interviews: {
        scheduled: interviewsScheduled,
        yetToSchedule: interviewsYetToSchedule,
      },
      payments: paymentMap,
      loans: loanMap,
      campus: campusMap,
      commission: {
        collected: commissionMap['COLLECTED'] || 0,
        pending: commissionMap['PENDING'] || 0,
        notApplicable: commissionMap['NOT_APPLICABLE'] || 0,
        notSet: Math.max(0, totalApplications - (commissionMap['COLLECTED'] || 0) - (commissionMap['PENDING'] || 0) - (commissionMap['NOT_APPLICABLE'] || 0)),
      },
      alerts: {
        pendingInterview: interviewsYetToSchedule,
        feePending: feePendingCount,
        selectedCandidates: bankSelectedCount,
        onHoldCandidates: statusMap['On Hold'] || 0,
        commissionPending: commissionMap['PENDING'] || 0,
      },
      selected: bankSelectedCount,
      rejected: statusMap['Rejected'] || 0,
      dropped: statusMap['Dropped'] || 0,
      enrolled: enrolledCount,
    });
  } catch (error) {
    sendError(res, 'Failed to fetch dashboard stats.', 500);
  }
};

export const deleteApplication = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    sendError(res, 'Invalid application ID.', 400);
    return;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const application = await Application.findById(id).session(session);
    if (!application) {
      await session.abortTransaction();
      sendError(res, 'Application not found.', 404);
      return;
    }

    const snapshot = {
      applicationNumber: application.applicationNumber,
      candidateName: application.candidateName,
      candidateEmail: application.candidateEmail,
      candidateMobile: application.candidateMobile,
      bankName: application.bankName,
      programName: application.programName,
      overallStatus: application.overallStatus,
    };

    const candidateId = application.candidateId;

    // Delete linked financial, loan, campus, and application documents
    const linkMatch = {
      $or: [
        { applicationId: application._id },
        { applicationNumber: application.applicationNumber },
      ],
    };

    await Promise.all([
      Payment.deleteMany(linkMatch, { session }),
      LoanStatus.deleteMany(linkMatch, { session }),
      CampusStatus.deleteMany(linkMatch, { session }),
      Application.deleteOne({ _id: application._id }, { session }),
    ]);

    // Clean up or decrement parent Candidate record
    let resumePathToDelete: string | undefined;
    let candidateDeleted = false;

    if (candidateId) {
      const remainingApps = await Application.countDocuments({ candidateId }).session(session);
      if (remainingApps === 0) {
        const candidateDoc = await Candidate.findById(candidateId).session(session);
        resumePathToDelete = candidateDoc?.resumeUrl;
        await Promise.all([
          Payment.deleteMany({ candidateId }, { session }),
          LoanStatus.deleteMany({ candidateId }, { session }),
          CampusStatus.deleteMany({ candidateId }, { session }),
          Candidate.deleteOne({ _id: candidateId }, { session }),
        ]);
        candidateDeleted = true;
      } else {
        await Candidate.findByIdAndUpdate(
          candidateId,
          { $inc: { totalApplicationsCount: -1 } },
          { session }
        );
      }
    }

    await session.commitTransaction();

    // Safely remove uploaded resume file from disk if candidate was completely removed
    if (candidateDeleted && resumePathToDelete) {
      try {
        if (fs.existsSync(resumePathToDelete)) {
          fs.unlinkSync(resumePathToDelete);
        }
      } catch { }
    }

    await logActivity({
      req,
      action: 'APPLICATION_DELETED',
      entityType: 'APPLICATION',
      entityId: id,
      applicationNumber: snapshot.applicationNumber,
      candidateName: snapshot.candidateName,
      previousState: snapshot,
      details: `Permanently deleted candidate ${snapshot.candidateName} (${snapshot.applicationNumber}) and linked payment/loan/campus records`,
    });

    sendSuccess(
      res,
      { deletedId: id, candidateDeleted },
      `Candidate ${snapshot.candidateName} (${snapshot.applicationNumber}) deleted permanently.`
    );
  } catch (error: any) {
    await session.abortTransaction();
    console.error('[DeleteApplication] Error:', error);
    sendError(res, error.message || 'Failed to delete candidate permanently.', 500);
  } finally {
    session.endSession();
  }
};

// ---- EXCEL IMPORT & EXPORT ----

export const downloadCandidateImportTemplate = async (_req: Request, res: Response): Promise<void> => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Candidate Import Template');

    // Header columns
    sheet.columns = [
      { header: 'Full Name *', key: 'fullName', width: 26 },
      { header: 'Mobile Number *', key: 'mobileNumber', width: 18 },
      { header: 'Email Address *', key: 'email', width: 28 },
      { header: 'Date of Birth (YYYY-MM-DD)', key: 'dateOfBirth', width: 24 },
      { header: 'State', key: 'state', width: 18 },
      { header: 'City / District', key: 'district', width: 18 },
      { header: 'Bank Name *', key: 'bankName', width: 24 },
      { header: 'Program Name *', key: 'programName', width: 32 },
      { header: 'Vendor Name', key: 'vendorName', width: 20 },
      { header: 'HR Reference (Emp ID or Name)', key: 'hrReference', width: 28 },
      { header: 'Batch Number', key: 'batchNumber', width: 18 },
      { header: 'Payment Route (Vendor Loan / Full Payment)', key: 'paymentRoute', width: 32 },
    ];

    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2744' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;

    // Sample data rows
    sheet.addRow({
      fullName: 'Rahul Sharma',
      mobileNumber: '9876543210',
      email: 'rahul.sharma@example.com',
      dateOfBirth: '1999-05-15',
      state: 'Tamil Nadu',
      district: 'Chennai',
      bankName: 'Axis',
      programName: 'Axis Operations Executive',
      vendorName: 'Manipal',
      hrReference: 'HR001',
      batchNumber: 'Batch 2026-A',
      paymentRoute: 'ROUTE_A_VENDOR_LOAN',
    });

    sheet.addRow({
      fullName: 'Priya Sundaram',
      mobileNumber: '9845123456',
      email: 'priya.sundaram@example.com',
      dateOfBirth: '2001-08-22',
      state: 'Karnataka',
      district: 'Bangalore',
      bankName: 'HDFC Life',
      programName: 'HDFC Life Advisor Program',
      vendorName: 'Crack-ed',
      hrReference: '',
      batchNumber: 'Batch 2026-B',
      paymentRoute: 'ROUTE_B_FULL_PAYMENT',
    });

    // Reference worksheet for valid banks, programs, vendors & HR
    const refSheet = workbook.addWorksheet('Reference - Valid Masters');
    const [banks, programs, vendors, hrs] = await Promise.all([
      Bank.find({ status: 'ACTIVE' }).select('name code'),
      Program.find({ status: 'ACTIVE' }).select('name bankName code'),
      Vendor.find({ status: 'ACTIVE' }).select('name code'),
      User.find({ role: { $in: ['HR_EXECUTIVE', 'ADMIN', 'SUPER_ADMIN'] } }).select('name employeeId'),
    ]);

    refSheet.columns = [
      { header: 'Available Banks', key: 'banks', width: 26 },
      { header: 'Available Programs (Bank)', key: 'programs', width: 36 },
      { header: 'Available Vendors', key: 'vendors', width: 22 },
      { header: 'Available HR References', key: 'hrs', width: 28 },
    ];
    const refHeader = refSheet.getRow(1);
    refHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    refHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };

    const maxLen = Math.max(banks.length, programs.length, vendors.length, hrs.length);
    for (let i = 0; i < maxLen; i++) {
      refSheet.addRow({
        banks: banks[i]?.name || '',
        programs: programs[i] ? `${programs[i].name} (${programs[i].bankName})` : '',
        vendors: vendors[i]?.name || '',
        hrs: hrs[i] ? `${hrs[i].name} (${hrs[i].employeeId})` : '',
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=FIC_Candidate_Import_Template.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('Download template error:', error);
    sendError(res, 'Failed to generate candidate template.', 500);
  }
};

export const importCandidatesExcel = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = (req as any).file;
    if (!file || !file.buffer) {
      sendError(res, 'Please upload an Excel (.xlsx) file to import candidates.', 400);
      return;
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      sendError(res, 'The uploaded Excel file contains no worksheets.', 400);
      return;
    }

    // Pre-fetch master data into lookup maps
    const [banks, programs, vendors, users] = await Promise.all([
      Bank.find({}),
      Program.find({}),
      Vendor.find({}),
      User.find({}),
    ]);

    const bankMap = new Map<string, any>();
    banks.forEach((b) => {
      bankMap.set(b.name.toLowerCase().trim(), b);
      bankMap.set(b.code.toLowerCase().trim(), b);
      bankMap.set(b._id.toString(), b);
    });

    const programList = programs;

    const vendorMap = new Map<string, any>();
    vendors.forEach((v) => {
      vendorMap.set(v.name.toLowerCase().trim(), v);
      vendorMap.set(v.code.toLowerCase().trim(), v);
    });

    const userMap = new Map<string, any>();
    users.forEach((u) => {
      userMap.set(u.employeeId.toLowerCase().trim(), u);
      userMap.set(u.name.toLowerCase().trim(), u);
      userMap.set(u.email.toLowerCase().trim(), u);
    });

    const errors: Array<{ row: number; candidate: string; error: string }> = [];
    const createdApplications: any[] = [];
    const seenMobiles = new Set<string>();
    const seenEmails = new Set<string>();

    let totalRows = 0;

    // Iterate through sheet rows (skip header row 1)
    const rows: any[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        rows.push({ rowNumber, values: row.values as any[] });
      }
    });

    totalRows = rows.length;

    for (const item of rows) {
      const { rowNumber, values } = item;
      // cell 1 is empty or index 1 based
      const fullName = String(values[1] || '').trim();
      const mobileNumber = String(values[2] || '').trim().replace(/\D/g, '');
      const email = String(values[3] || '').trim().toLowerCase();
      const dobVal = values[4];
      const state = String(values[5] || '').trim();
      const district = String(values[6] || '').trim();
      const bankNameInput = String(values[7] || '').trim();
      const programNameInput = String(values[8] || '').trim();
      const vendorNameInput = String(values[9] || '').trim();
      const hrRefInput = String(values[10] || '').trim();
      const batchNumber = String(values[11] || '').trim();
      const paymentRouteInput = String(values[12] || '').trim().toUpperCase();

      // Skip row if completely empty
      if (!fullName && !mobileNumber && !email) {
        continue;
      }

      // 1. Validation: Name, Mobile, Email
      if (!fullName) {
        errors.push({ row: rowNumber, candidate: fullName || `Row ${rowNumber}`, error: 'Candidate Full Name is required.' });
        continue;
      }

      if (!mobileNumber || mobileNumber.length < 10) {
        errors.push({ row: rowNumber, candidate: fullName, error: `Invalid mobile number '${values[2]}'. Must have at least 10 digits.` });
        continue;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        errors.push({ row: rowNumber, candidate: fullName, error: `Invalid email address '${values[3]}'.` });
        continue;
      }

      // Check duplicate within the uploaded sheet
      if (seenMobiles.has(mobileNumber)) {
        errors.push({ row: rowNumber, candidate: fullName, error: `Duplicate mobile number '${mobileNumber}' within the same Excel sheet.` });
        continue;
      }
      if (seenEmails.has(email)) {
        errors.push({ row: rowNumber, candidate: fullName, error: `Duplicate email '${email}' within the same Excel sheet.` });
        continue;
      }

      // Check duplicate against existing database
      const existingCandidate = await Candidate.findOne({
        $or: [{ mobileNumber }, { email }],
      });
      if (existingCandidate) {
        errors.push({
          row: rowNumber,
          candidate: fullName,
          error: `Candidate already registered in system with this ${existingCandidate.mobileNumber === mobileNumber ? 'mobile number' : 'email'} (${existingCandidate.fullName}).`,
        });
        continue;
      }

      // 2. Resolve Bank
      if (!bankNameInput) {
        errors.push({ row: rowNumber, candidate: fullName, error: 'Bank Name is required.' });
        continue;
      }

      let resolvedBank = bankMap.get(bankNameInput.toLowerCase());
      if (!resolvedBank) {
        // Fallback fuzzy search
        resolvedBank = banks.find(
          (b) =>
            b.name.toLowerCase().includes(bankNameInput.toLowerCase()) ||
            bankNameInput.toLowerCase().includes(b.name.toLowerCase())
        );
      }
      if (!resolvedBank) {
        errors.push({ row: rowNumber, candidate: fullName, error: `Bank '${bankNameInput}' was not found in system masters.` });
        continue;
      }

      // 3. Resolve Program
      if (!programNameInput) {
        errors.push({ row: rowNumber, candidate: fullName, error: 'Program Name is required.' });
        continue;
      }

      const cleanProgInput = programNameInput.toLowerCase();
      let resolvedProgram = programList.find(
        (p) =>
          (p.bankId?.toString() === resolvedBank._id.toString() || p.bankName?.toLowerCase() === resolvedBank.name.toLowerCase()) &&
          (p.name.toLowerCase() === cleanProgInput || p.code?.toLowerCase() === cleanProgInput)
      );

      if (!resolvedProgram) {
        // Broad search across bank's programs
        resolvedProgram = programList.find(
          (p) =>
            p.bankId?.toString() === resolvedBank._id.toString() &&
            (p.name.toLowerCase().includes(cleanProgInput) || cleanProgInput.includes(p.name.toLowerCase()))
        );
      }

      if (!resolvedProgram) {
        // Broad search across any program matching name
        resolvedProgram = programList.find(
          (p) => p.name.toLowerCase() === cleanProgInput || p.name.toLowerCase().includes(cleanProgInput)
        );
      }

      if (!resolvedProgram) {
        errors.push({ row: rowNumber, candidate: fullName, error: `Program '${programNameInput}' not found for bank '${resolvedBank.name}'.` });
        continue;
      }

      // 4. Resolve Vendor (optional)
      let resolvedVendor: any = null;
      if (vendorNameInput) {
        resolvedVendor = vendorMap.get(vendorNameInput.toLowerCase()) ||
          vendors.find((v) => v.name.toLowerCase().includes(vendorNameInput.toLowerCase()));
      }

      // 5. Resolve HR Reference (optional)
      let resolvedHr: any = null;
      if (hrRefInput) {
        resolvedHr = userMap.get(hrRefInput.toLowerCase()) ||
          users.find((u) => u.name.toLowerCase().includes(hrRefInput.toLowerCase()));
      }

      // Payment route
      const paymentRoute = paymentRouteInput.includes('FULL')
        ? 'ROUTE_B_FULL_PAYMENT'
        : 'ROUTE_A_VENDOR_LOAN';

      // Parse Date of Birth
      let parsedDob: Date | undefined;
      if (dobVal) {
        const d = new Date(dobVal);
        if (!isNaN(d.getTime())) parsedDob = d;
      }

      // Create Candidate
      const candidate = await Candidate.create({
        fullName,
        email,
        mobileNumber,
        dateOfBirth: parsedDob,
        state: state || undefined,
        district: district || undefined,
        city: district || undefined,
      });

      // Build initial interview rounds from program configuration
      const sortedRounds = [...(resolvedProgram.interviewRoundsConfig || [])].sort((a, b) => a.order - b.order);
      const interviewRounds = sortedRounds.map((r) => ({
        roundId: r.roundId,
        roundName: r.roundName,
        isMandatory: r.isMandatory !== undefined ? r.isMandatory : true,
        order: r.order,
        currentStatus: 'Yet to Schedule' as const,
        interviewMode: r.defaultMode || 'Online',
        attempts: [],
      }));

      // Generate unique application number
      const applicationNumber = await generateApplicationNumber();

      // Create Application
      const application = await Application.create({
        applicationNumber,
        candidateId: candidate._id,
        candidateName: candidate.fullName,
        candidateEmail: candidate.email,
        candidateMobile: candidate.mobileNumber,
        bankId: resolvedBank._id,
        bankName: resolvedBank.name,
        programId: resolvedProgram._id,
        programName: resolvedProgram.name,
        vendorId: resolvedVendor?._id || undefined,
        vendorName: resolvedVendor?.name || '',
        hrReferenceId: resolvedHr?._id || undefined,
        hrReferenceName: resolvedHr?.name || '',
        batchNumber: batchNumber || undefined,
        paymentRoute,
        overallStatus: 'Registered',
        interviewRounds,
        registrationDate: new Date(),
      });

      // Create initial Payment record if Route A
      if (paymentRoute === 'ROUTE_A_VENDOR_LOAN') {
        await Payment.create({
          applicationId: application._id,
          applicationNumber: application.applicationNumber,
          candidateId: candidate._id,
          bankId: resolvedBank._id,
          programId: resolvedProgram._id,
          enrollmentFeeAmount: resolvedProgram.enrollmentFeeAmount || 0,
          paymentTrigger: resolvedProgram.paymentTrigger || 'AFTER_SELECTION',
          paymentStatus: 'Pending',
          amountPaid: 0,
          balanceAmount: resolvedProgram.enrollmentFeeAmount || 0,
          transactions: [],
        });
      }

      seenMobiles.add(mobileNumber);
      seenEmails.add(email);
      createdApplications.push(application.applicationNumber);
    }

    if (createdApplications.length > 0) {
      await logActivity({
        req,
        action: 'CANDIDATE_REGISTERED',
        entityType: 'APPLICATION',
        entityId: createdApplications[0],
        details: `Bulk imported ${createdApplications.length} candidate(s) via Excel.`,
      });
    }

    sendSuccess(
      res,
      {
        totalRows,
        importedCount: createdApplications.length,
        skippedCount: errors.length,
        errors,
      },
      `Excel import complete. Successfully registered ${createdApplications.length} candidate(s).`
    );
  } catch (error: any) {
    console.error('Import candidates error:', error);
    sendError(res, error.message || 'Failed to process Excel import.', 500);
  }
};

export const exportCandidatesExcel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, bankId, programId, search } = req.query;
    const filter: any = {};

    if (status && status !== 'ALL') filter.overallStatus = status;
    if (bankId && bankId !== 'ALL') filter.bankId = bankId;
    if (programId && programId !== 'ALL') filter.programId = programId;
    if (search) {
      const q = String(search).trim();
      filter.$or = [
        { candidateName: { $regex: q, $options: 'i' } },
        { candidateEmail: { $regex: q, $options: 'i' } },
        { candidateMobile: { $regex: q, $options: 'i' } },
        { applicationNumber: { $regex: q, $options: 'i' } },
      ];
    }

    const applications = await Application.find(filter)
      .populate('candidateId', 'state district city dateOfBirth')
      .sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('FIC Candidates Export');

    sheet.columns = [
      { header: 'Application No.', key: 'appNo', width: 22 },
      { header: 'Candidate Name', key: 'name', width: 26 },
      { header: 'Mobile Number', key: 'mobile', width: 18 },
      { header: 'Email Address', key: 'email', width: 28 },
      { header: 'Bank Name', key: 'bank', width: 22 },
      { header: 'Program Name', key: 'program', width: 30 },
      { header: 'Vendor Name', key: 'vendor', width: 20 },
      { header: 'HR Reference', key: 'hr', width: 24 },
      { header: 'Batch Number', key: 'batch', width: 18 },
      { header: 'Overall Status', key: 'status', width: 24 },
      { header: 'Interview Progress', key: 'interviewProgress', width: 32 },
      { header: 'Payment Route', key: 'route', width: 22 },
      { header: 'State', key: 'state', width: 18 },
      { header: 'City', key: 'city', width: 18 },
      { header: 'Registration Date', key: 'date', width: 18 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2744' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 26;

    applications.forEach((app: any) => {
      const cand = app.candidateId || {};
      const interviewSummary = (app.interviewRounds || [])
        .map((r: any) => `${r.roundName}: ${r.result || r.currentStatus}`)
        .join(' | ') || 'None';

      sheet.addRow({
        appNo: app.applicationNumber,
        name: app.candidateName,
        mobile: app.candidateMobile,
        email: app.candidateEmail,
        bank: app.bankName,
        program: app.programName,
        vendor: app.vendorName || '-',
        hr: app.hrReferenceName || '-',
        batch: app.batchNumber || '-',
        status: app.overallStatus,
        interviewProgress: interviewSummary,
        route: app.paymentRoute === 'ROUTE_A_VENDOR_LOAN' ? 'Vendor Loan' : 'Full Payment',
        state: cand.state || '-',
        city: cand.city || cand.district || '-',
        date: app.registrationDate ? new Date(app.registrationDate).toLocaleDateString('en-IN') : '-',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=FIC_Candidates_Export_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('Export candidates error:', error);
    sendError(res, 'Failed to export candidate records to Excel.', 500);
  }
};


