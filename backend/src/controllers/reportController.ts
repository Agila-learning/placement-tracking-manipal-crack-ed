import { Request, Response } from 'express';
import { Application } from '../models/Application';
import { Payment } from '../models/Payment';
import { LoanStatus } from '../models/LoanStatus';
import { CampusStatus } from '../models/CampusStatus';
import ExcelJS from 'exceljs';
import { sendSuccess, sendError } from '../utils/response';

const buildCommonFilter = (query: any) => {
  const { bank, program, vendor, hr, status, fromDate, toDate, paymentStatus, loanStatus } = query;
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
  return filter;
};

export const getInterviewStatusReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = buildCommonFilter(req.query);
    const { programId } = req.query;
    if (programId) filter.programId = programId;

    const applications = await Application.find(filter)
      .select('applicationNumber candidateName bankName programName vendorName hrReferenceName overallStatus interviewRounds paymentRoute registrationDate')
      .sort({ registrationDate: -1 })
      .limit(5000)
      .lean();

    sendSuccess(res, applications, 'Interview status report generated.');
  } catch (error) {
    sendError(res, 'Failed to generate interview status report.', 500);
  }
};

export const getEnrollmentFeeReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = buildCommonFilter(req.query);
    const { paymentStatus, loanStatus } = req.query;

    const applications = await Application.find(filter)
      .select('applicationNumber candidateName bankName programName vendorName paymentRoute registrationDate')
      .sort({ registrationDate: -1 })
      .lean();

    const appIds = applications.map((a: any) => a._id);

    const paymentFilter: any = { applicationId: { $in: appIds } };
    if (paymentStatus) paymentFilter.paymentStatus = String(paymentStatus);

    const loanFilter: any = { applicationId: { $in: appIds } };
    if (loanStatus) loanFilter.loanStatus = String(loanStatus);

    const [payments, loans] = await Promise.all([
      Payment.find(paymentFilter).lean(),
      LoanStatus.find(loanFilter).lean(),
    ]);

    const paymentMap: Record<string, any> = {};
    payments.forEach((p) => { paymentMap[p.applicationId.toString()] = p; });

    const loanMap: Record<string, any> = {};
    loans.forEach((l) => { loanMap[l.applicationId.toString()] = l; });

    // Filter out applications that don't match paymentStatus/loanStatus if those were requested
    const enriched = applications
      .map((app: any) => ({
        ...app,
        payment: paymentMap[app._id.toString()] || null,
        loan: loanMap[app._id.toString()] || null,
      }))
      .filter((app) => {
        if (paymentStatus && (!app.payment || app.payment.paymentStatus !== paymentStatus)) return false;
        if (loanStatus && (!app.loan || app.loan.loanStatus !== loanStatus)) return false;
        return true;
      });

    sendSuccess(res, enriched, 'Enrollment fee report generated.');
  } catch (error) {
    sendError(res, 'Failed to generate enrollment fee report.', 500);
  }
};

export const exportInterviewReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = buildCommonFilter(req.query);

    const applications = await Application.find(filter)
      .select('applicationNumber candidateName bankName programName vendorName hrReferenceName overallStatus interviewRounds registrationDate')
      .sort({ registrationDate: -1 })
      .limit(10000)
      .lean();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Interview Status Report');

    // Collect all unique round names across all results
    const roundNamesSet = new Set<string>();
    applications.forEach((app: any) => {
      app.interviewRounds?.forEach((r: any) => { roundNamesSet.add(r.roundName); });
    });
    const roundNames = Array.from(roundNamesSet);

    const headers = [
      'Application Number', 'Candidate Name', 'Bank', 'Program', 'Vendor',
      'HR Reference', 'Overall Status', 'Registration Date',
      ...roundNames,
    ];

    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2744' } };

    applications.forEach((app: any) => {
      const roundMap: Record<string, string> = {};
      app.interviewRounds?.forEach((r: any) => { roundMap[r.roundName] = r.currentStatus || '-'; });

      const row = [
        app.applicationNumber,
        app.candidateName,
        app.bankName,
        app.programName,
        app.vendorName,
        app.hrReferenceName,
        app.overallStatus,
        app.registrationDate ? new Date(app.registrationDate).toLocaleDateString('en-IN') : '-',
        ...roundNames.map((rn) => roundMap[rn] || 'Not Applicable'),
      ];
      sheet.addRow(row);
    });

    sheet.columns.forEach((col) => { col.width = 20; });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=FIC_Interview_Status_Report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    sendError(res, 'Failed to export interview report.', 500);
  }
};

export const exportEnrollmentReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter = buildCommonFilter(req.query);

    const applications = await Application.find(filter)
      .select('applicationNumber candidateName bankName programName vendorName paymentRoute registrationDate')
      .sort({ registrationDate: -1 })
      .lean();

    const appIds = applications.map((a: any) => a._id);

    const [payments, loans] = await Promise.all([
      Payment.find({ applicationId: { $in: appIds } }).lean(),
      LoanStatus.find({ applicationId: { $in: appIds } }).lean(),
    ]);

    const paymentMap: Record<string, any> = {};
    payments.forEach((p) => { paymentMap[p.applicationId.toString()] = p; });

    const loanMap: Record<string, any> = {};
    loans.forEach((l) => { loanMap[l.applicationId.toString()] = l; });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Enrollment Fee Report');

    const headers = [
      'Application Number', 'Candidate Name', 'Bank', 'Program', 'Vendor',
      'Payment Route', 'Enrollment Fee (₹)', 'Amount Paid (₹)', 'Balance (₹)',
      'Payment Status', 'Refund Status', 'Loan Required', 'Loan Status',
    ];

    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2744' } };

    applications.forEach((app: any) => {
      const p = paymentMap[app._id.toString()];
      const l = loanMap[app._id.toString()];

      sheet.addRow([
        app.applicationNumber,
        app.candidateName,
        app.bankName,
        app.programName,
        app.vendorName,
        app.paymentRoute === 'ROUTE_B_FULL_PAYMENT' ? 'Full Payment' : 'Vendor Loan',
        p?.enrollmentFeeAmount ?? '-',
        p?.amountPaid ?? '-',
        p?.balanceAmount ?? '-',
        p?.paymentStatus ?? '-',
        p?.refund?.refundStatus ?? '-',
        l?.isLoanRequired ? 'Yes' : 'No',
        l?.loanStatus ?? '-',
      ]);
    });

    sheet.columns.forEach((col) => { col.width = 22; });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=FIC_Enrollment_Fee_Report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    sendError(res, 'Failed to export enrollment report.', 500);
  }
};

