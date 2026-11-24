import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, User, Calendar, FileText, CreditCard, Building2,
  Activity, MapPin, Phone, Mail, Edit2, AlertCircle, CheckCircle, ShieldCheck, RefreshCw, Trash2, Plus
} from 'lucide-react';
import { applicationsApi, banksApi, programsApi, vendorsApi, usersApi } from '../../api/endpoints';
import { BASE_URL } from '../../api/client';
import { Application, Bank, Program, Vendor, User as UserType } from '../../types';
import {
  Tabs, Button, Badge, LoadingSpinner, PageHeader, Card, Modal, Select, Textarea, ConfirmDialog
} from '../../components/ui';
import {
  appStatusBadge, interviewStatusBadge, paymentStatusBadge, loanStatusBadge,
  campusStatusBadge, formatDate, formatCurrency, formatDateTime, paymentRouteLabel
} from '../../utils/statusHelpers';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { ALL_APPLICATION_STATUSES, ALL_INTERVIEW_STATUSES } from '../../types';

export const CandidateDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { hasRole } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') || 'details';
  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab === 'commission' && !hasRole('SUPER_ADMIN')) return 'details';
    return initialTab;
  });

  // Sync tab with URL search parameter when user navigates
  useEffect(() => {
    const tabParam = new URLSearchParams(location.search).get('tab');
    if (tabParam) {
      if (tabParam === 'commission' && !hasRole('SUPER_ADMIN')) {
        setActiveTab('details');
      } else {
        setActiveTab(tabParam);
      }
    }
  }, [location.search, hasRole]);

  // Status Update Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [holdReason, setHoldReason] = useState('Awaiting Candidate Documents');
  const [holdFollowUpDate, setHoldFollowUpDate] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  // Interview Modal
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedRound, setSelectedRound] = useState<any>(null);
  const [interviewForm, setInterviewForm] = useState<any>({});
  const [interviewLoading, setInterviewLoading] = useState(false);

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ transactionId: '', amount: '', paymentMode: 'UPI', paymentDate: '', referenceNotes: '', paymentStatus: '' });
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Program Fee & Installments Edit Modal
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [feeForm, setFeeForm] = useState<{
    totalProgramFee: string;
    enrollmentFeeAmount: string;
    installments: Array<{
      installmentNumber: number;
      name: string;
      amount: string;
      dueDate?: string;
      remarks?: string;
    }>;
    remarks: string;
  }>({
    totalProgramFee: '',
    enrollmentFeeAmount: '',
    installments: [],
    remarks: '',
  });
  const [feeLoading, setFeeLoading] = useState(false);

  // Commission Modal
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionForm, setCommissionForm] = useState({ commissionStatus: '', commissionAmount: '', commissionCollectedDate: '', commissionNotes: '' });
  const [commissionLoading, setCommissionLoading] = useState(false);

  // Loan Modal
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [loanForm, setLoanForm] = useState({ loanStatus: '', sanctionDate: '', sanctionAmount: '', remarks: '' });
  const [loanLoading, setLoanLoading] = useState(false);

  // Campus Modal
  const [showCampusModal, setShowCampusModal] = useState(false);
  const [campusForm, setCampusForm] = useState({ campusStatus: '', arrivalDate: '', campusLocation: '', reportingBatch: '', remarks: '' });
  const [campusLoading, setCampusLoading] = useState(false);

  // Edit Candidate Details Modal
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [hrList, setHrList] = useState<UserType[]>([]);
  const [filteredEditPrograms, setFilteredEditPrograms] = useState<Program[]>([]);
  const [detailsForm, setDetailsForm] = useState({
    applicationNumber: '',
    fullName: '',
    email: '',
    mobileNumber: '',
    state: '',
    city: '',
    dateOfBirth: '',
    bankId: '',
    programId: '',
    vendorId: '',
    hrReferenceId: '',
    paymentRoute: 'ROUTE_A_VENDOR_LOAN',
    batchNumber: '',
    remarks: '',
    processType: 'Manipal',
    registrationDate: '',
  });
  const [statusDate, setStatusDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Verify transaction loading set
  const [verifyingTxn, setVerifyingTxn] = useState<string | null>(null);

  // Logs
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [syncingFee, setSyncingFee] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingCandidate, setDeletingCandidate] = useState(false);

  const handleDeleteCandidate = async () => {
    if (!id) return;
    setDeletingCandidate(true);
    try {
      const res = await applicationsApi.delete(id);
      toast.success(res.message || 'Candidate deleted permanently.');
      setShowDeleteConfirm(false);
      window.dispatchEvent(new Event('fic:stats-refresh'));
      navigate('/candidates');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete candidate.');
    } finally {
      setDeletingCandidate(false);
    }
  };

  const load = async (isInitial = false) => {
    if (!id) return;
    if (isInitial || !application) {
      setIsLoading(true);
    }
    try {
      const res = await applicationsApi.get(id);
      if (res.success && res.data) setApplication(res.data);
    } catch {
      toast.error('Failed to load application.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncProgramFee = async () => {
    if (!id) return;
    setSyncingFee(true);
    try {
      const res = await applicationsApi.syncProgramFee(id);
      if (res.success) {
        toast.success(res.message || 'Fee synced with Program Master!');
        await load(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync fee from Program Master.');
    } finally {
      setSyncingFee(false);
    }
  };

  const loadLogs = async () => {
    if (!application?.applicationNumber) return;
    setLogsLoading(true);
    try {
      const res = await applicationsApi.activityLogs(application.applicationNumber);
      setLogs(res.data || []);
    } catch {}
    finally { setLogsLoading(false); }
  };

  useEffect(() => { load(true); }, [id]);

  useEffect(() => {
    if (activeTab === 'activity') loadLogs();
  }, [activeTab, application]);

  // Auto-refresh when stats or application records update
  useEffect(() => {
    const handleAutoRefresh = () => {
      load(false);
      if (activeTab === 'activity') loadLogs();
    };
    window.addEventListener('fic:stats-refresh', handleAutoRefresh);
    window.addEventListener('focus', handleAutoRefresh);
    return () => {
      window.removeEventListener('fic:stats-refresh', handleAutoRefresh);
      window.removeEventListener('focus', handleAutoRefresh);
    };
  }, [id, activeTab]);

  // Tab navigation shortcuts (Alt+1 to Alt+6)
  useEffect(() => {
    const handleKeyNav = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key === '1') { e.preventDefault(); setActiveTab('details'); }
        else if (e.key === '2') { e.preventDefault(); setActiveTab('interviews'); }
        else if (e.key === '3') { e.preventDefault(); setActiveTab('payments'); }
        else if (e.key === '4') { e.preventDefault(); setActiveTab('loans'); }
        else if (e.key === '5') { e.preventDefault(); setActiveTab('campus'); }
        else if (e.key === '6') { e.preventDefault(); setActiveTab('activity'); }
      }
    };
    window.addEventListener('keydown', handleKeyNav);
    return () => window.removeEventListener('keydown', handleKeyNav);
  }, []);

  const openEditDetailsModal = async () => {
    if (!application) return;
    const cand = typeof application.candidateId === 'object' ? application.candidateId : null;

    try {
      const [b, p, v, hr] = await Promise.all([
        banksApi.list(),
        programsApi.list(),
        vendorsApi.list(),
        usersApi.hrReferences(),
      ]);
      const validBanks = (b.data || []).filter((item) => item.status !== 'INACTIVE');
      const validPrograms = (p.data || []).filter((item) => item.status !== 'INACTIVE');
      const validVendors = (v.data || []).filter((item) => item.status !== 'INACTIVE');
      const validHrs = hr.data || [];

      setBanks(validBanks);
      setPrograms(validPrograms);
      setVendors(validVendors);
      setHrList(validHrs);

      const currentBankId = application.bankId
        ? typeof application.bankId === 'object'
          ? (application.bankId as any)._id
          : application.bankId
        : '';
      const currentProgramId = application.programId
        ? typeof application.programId === 'object'
          ? (application.programId as any)._id
          : application.programId
        : '';
      const currentVendorId = application.vendorId
        ? typeof application.vendorId === 'object'
          ? (application.vendorId as any)._id
          : application.vendorId
        : '';
      const currentHrId = application.hrReferenceId
        ? typeof application.hrReferenceId === 'object'
          ? (application.hrReferenceId as any)._id
          : application.hrReferenceId
        : '';

      setDetailsForm({
        applicationNumber: application.applicationNumber || '',
        fullName: application.candidateName || '',
        email: application.candidateEmail || '',
        mobileNumber: application.candidateMobile || (cand as any)?.mobileNumber || '',
        state: (cand as any)?.state || '',
        city: (cand as any)?.city || (cand as any)?.district || '',
        dateOfBirth: (cand as any)?.dateOfBirth ? (cand as any).dateOfBirth.substring(0, 10) : '',
        bankId: currentBankId || '',
        programId: currentProgramId || '',
        vendorId: currentVendorId || '',
        hrReferenceId: currentHrId || '',
        paymentRoute: application.paymentRoute || 'ROUTE_A_VENDOR_LOAN',
        batchNumber: application.batchNumber || '',
        remarks: application.remarks || '',
        processType: application.processType || (/crack/i.test(application.vendorName || '') ? 'Crack-ed' : 'Manipal'),
        registrationDate: application.registrationDate ? application.registrationDate.substring(0, 10) : '',
      });

      if (currentBankId) {
        const selectedBank = validBanks.find((bk) => bk._id === currentBankId);
        const bankNameLower = selectedBank?.name?.toLowerCase().trim() || '';
        let matched = validPrograms.filter(
          (prg) =>
            prg.bankId === currentBankId ||
            (prg.bankId as any)?._id === currentBankId ||
            String(prg.bankId) === String(currentBankId) ||
            String((prg.bankId as any)?._id) === String(currentBankId)
        );
        if (matched.length === 0 && bankNameLower) {
          matched = validPrograms.filter((prg) => {
            const pBankName = (prg.bankName || (prg.bankId as any)?.name || '').toLowerCase().trim();
            return pBankName.includes(bankNameLower) || bankNameLower.includes(pBankName);
          });
        }
        setFilteredEditPrograms(matched.length > 0 ? matched : validPrograms);
      } else {
        setFilteredEditPrograms(validPrograms);
      }
    } catch {
      toast.error('Failed to load master data for editing.');
    }

    setShowEditDetailsModal(true);
  };

  const handleEditBankChange = (newBankId: string) => {
    setDetailsForm((prev) => ({ ...prev, bankId: newBankId, programId: '' }));
    if (!newBankId) {
      setFilteredEditPrograms(programs);
      return;
    }
    const selectedBank = banks.find((b) => b._id === newBankId);
    const bankNameLower = selectedBank?.name?.toLowerCase().trim() || '';

    let matched = programs.filter(
      (p) =>
        p.bankId === newBankId ||
        (p.bankId as any)?._id === newBankId ||
        String(p.bankId) === String(newBankId) ||
        String((p.bankId as any)?._id) === String(newBankId)
    );

    if (matched.length === 0 && bankNameLower) {
      matched = programs.filter((p) => {
        const pBankName = (p.bankName || (p.bankId as any)?.name || '').toLowerCase().trim();
        return pBankName.includes(bankNameLower) || bankNameLower.includes(pBankName);
      });
    }

    setFilteredEditPrograms(matched.length > 0 ? matched : programs);
  };

  const handleSaveDetails = async () => {
    if (!detailsForm.fullName.trim() || !detailsForm.mobileNumber.trim()) {
      toast.error('Candidate Full Name and Mobile Number are required.');
      return;
    }
    setDetailsLoading(true);
    try {
      const selectedVendor = vendors.find((v) => v._id === detailsForm.vendorId);
      const isCrk = Boolean(
        (selectedVendor && /crack/i.test(selectedVendor.name)) ||
        (detailsForm.processType && /crack/i.test(detailsForm.processType))
      );
      const payload = {
        ...detailsForm,
        batchNumber: isCrk ? '' : detailsForm.batchNumber,
      };
      await applicationsApi.updateCandidateDetails(id!, payload);
      toast.success('Candidate details updated successfully!');
      setShowEditDetailsModal(false);
      window.dispatchEvent(new Event('fic:stats-refresh'));
      await load(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update candidate details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('edit') === 'true' && application) {
      params.delete('edit');
      const newSearch = params.toString() ? `?${params.toString()}` : '';
      navigate(`${location.pathname}${newSearch}`, { replace: true });
      openEditDetailsModal();
    }
  }, [location.search, application, navigate]);

  const handleStatusUpdate = async () => {
    if (!newStatus || !id) return;
    setStatusLoading(true);
    try {
      let finalRemarks = statusRemarks.trim();
      if (newStatus === 'On Hold') {
        const followUpText = holdFollowUpDate ? ` [Target Follow-up: ${holdFollowUpDate}]` : '';
        finalRemarks = `[ON HOLD: ${holdReason}]${followUpText}${finalRemarks ? ` — ${finalRemarks}` : ''}`;
      }
      await applicationsApi.updateStatus(id, { overallStatus: newStatus, remarks: finalRemarks, statusDate });
      toast.success(`Candidate status updated to ${newStatus}!`);
      setShowStatusModal(false);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const openInterviewModal = (round: any) => {
    setSelectedRound(round);
    let outcomeVal = 'Scheduled';
    if (['Passed', 'Selected'].includes(round.result || '') || ['Selected', 'Passed'].includes(round.currentStatus)) {
      outcomeVal = 'Passed';
    } else if (['Failed', 'Rejected'].includes(round.result || '') || ['Rejected', 'Failed'].includes(round.currentStatus)) {
      outcomeVal = 'Rejected';
    } else if (round.result === 'Absent' || round.currentStatus === 'Absent') {
      outcomeVal = 'Absent';
    } else if (round.result === 'On Hold' || round.currentStatus === 'On Hold') {
      outcomeVal = 'On Hold';
    } else if (round.currentStatus === 'Yet to Schedule') {
      outcomeVal = 'Yet to Schedule';
    }

    setInterviewForm({
      outcome: outcomeVal,
      currentStatus: round.currentStatus || 'Yet to Schedule',
      scheduledDate: round.scheduledDate ? round.scheduledDate.substring(0, 10) : '',
      scheduledTime: round.scheduledTime || '',
      interviewMode: round.interviewMode || 'Online',
      venueOrLink: round.venueOrLink || '',
      result: round.result || '',
      remarks: round.remarks || '',
    });
    setShowInterviewModal(true);
  };

  const handleInterviewUpdate = async () => {
    if (!id || !selectedRound) return;
    setInterviewLoading(true);
    try {
      const payload: any = { ...interviewForm };
      if (interviewForm.outcome === 'Passed') {
        payload.currentStatus = 'Selected';
        payload.result = 'Passed';
      } else if (interviewForm.outcome === 'Rejected') {
        payload.currentStatus = 'Rejected';
        payload.result = 'Rejected';
      } else if (interviewForm.outcome === 'Absent') {
        payload.currentStatus = 'Absent';
        payload.result = 'Absent';
      } else if (interviewForm.outcome === 'On Hold') {
        payload.currentStatus = 'On Hold';
        payload.result = 'On Hold';
      } else if (interviewForm.outcome === 'Scheduled') {
        payload.currentStatus = 'Scheduled';
      } else if (interviewForm.outcome === 'Yet to Schedule') {
        payload.currentStatus = 'Yet to Schedule';
        payload.result = '';
      }

      await applicationsApi.updateInterview(id, selectedRound.roundId, payload);
      toast.success(`${selectedRound.roundName} updated successfully!`);
      setShowInterviewModal(false);
      window.dispatchEvent(new Event('fic:stats-refresh'));
      await load(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update interview.');
    } finally {
      setInterviewLoading(false);
    }
  };

  const handlePaymentRecord = async () => {
    if (!id) return;
    if (!paymentForm.paymentStatus && !paymentForm.amount) {
      toast.error('Please enter an amount or select a payment status.');
      return;
    }
    setPaymentLoading(true);
    try {
      await applicationsApi.recordPayment(id, paymentForm);
      toast.success('Payment updated successfully!');
      setShowPaymentModal(false);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const openFeeModal = () => {
    const payment = a.payment;
    const enrollAmount = payment?.enrollmentFeeAmount || 0;
    const totalFee = payment?.totalProgramFee || enrollAmount || 0;

    let initialInstallments = payment?.installments?.map((inst, idx) => ({
      installmentNumber: inst.installmentNumber || idx + 1,
      name: inst.name || `Installment ${idx + 1}`,
      amount: String(inst.amount || 0),
      dueDate: inst.dueDate ? inst.dueDate.substring(0, 10) : '',
      remarks: inst.remarks || '',
    })) || [];

    if (initialInstallments.length === 0) {
      initialInstallments = [
        {
          installmentNumber: 1,
          name: 'Installment 1 (Enrollment Fee)',
          amount: String(enrollAmount),
          dueDate: '',
          remarks: 'Admission / Seat booking',
        },
      ];
      if (totalFee > enrollAmount) {
        initialInstallments.push({
          installmentNumber: 2,
          name: 'Installment 2',
          amount: String(totalFee - enrollAmount),
          dueDate: '',
          remarks: 'Remaining balance',
        });
      }
    }

    setFeeForm({
      totalProgramFee: String(totalFee),
      enrollmentFeeAmount: String(enrollAmount),
      installments: initialInstallments,
      remarks: payment?.notes || '',
    });
    setShowFeeModal(true);
  };

  const addFeeInstallment = () => {
    setFeeForm((prev) => {
      const nextNum = prev.installments.length + 1;
      return {
        ...prev,
        installments: [
          ...prev.installments,
          {
            installmentNumber: nextNum,
            name: `Installment ${nextNum}`,
            amount: '0',
            dueDate: '',
            remarks: '',
          },
        ],
      };
    });
  };

  const removeFeeInstallment = (idx: number) => {
    setFeeForm((prev) => ({
      ...prev,
      installments: prev.installments.filter((_, i) => i !== idx),
    }));
  };

  const updateFeeInstallment = (idx: number, field: string, val: string) => {
    setFeeForm((prev) => {
      const nextInsts = [...prev.installments];
      nextInsts[idx] = { ...nextInsts[idx], [field]: val };
      return { ...prev, installments: nextInsts };
    });
  };

  const autoBalanceInstallments = () => {
    const total = Number(feeForm.totalProgramFee) || 0;
    const enroll = Number(feeForm.enrollmentFeeAmount) || 0;
    if (total <= 0) return;

    if (feeForm.installments.length <= 1) {
      setFeeForm((prev) => ({
        ...prev,
        installments: [
          {
            installmentNumber: 1,
            name: 'Installment 1 (Enrollment Fee)',
            amount: String(enroll),
            dueDate: '',
            remarks: 'Admission / Seat booking',
          },
          {
            installmentNumber: 2,
            name: 'Installment 2',
            amount: String(Math.max(0, total - enroll)),
            dueDate: '',
            remarks: 'Tuition / Term balance',
          },
        ],
      }));
    } else {
      const remaining = Math.max(0, total - enroll);
      const otherCount = feeForm.installments.length - 1;
      const perOther = Math.floor(remaining / otherCount);
      const remainder = remaining % otherCount;

      setFeeForm((prev) => {
        const nextInsts = prev.installments.map((inst, i) => {
          if (i === 0) {
            return { ...inst, amount: String(enroll) };
          }
          const addAmt = i === 1 ? perOther + remainder : perOther;
          return { ...inst, amount: String(addAmt) };
        });
        return { ...prev, installments: nextInsts };
      });
    }
  };

  const handleFeeUpdate = async () => {
    if (!id) return;
    setFeeLoading(true);
    try {
      const totalFeeNum = Number(feeForm.totalProgramFee) || Number(feeForm.enrollmentFeeAmount) || 0;
      const enrollFeeNum = Number(feeForm.enrollmentFeeAmount) || 0;

      const payload = {
        totalProgramFee: totalFeeNum,
        enrollmentFeeAmount: enrollFeeNum,
        installments: feeForm.installments.map((inst, idx) => ({
          installmentNumber: idx + 1,
          name: inst.name.trim() || `Installment ${idx + 1}`,
          amount: Number(inst.amount) || 0,
          dueDate: inst.dueDate || undefined,
          remarks: inst.remarks || '',
        })),
        remarks: feeForm.remarks,
      };

      await applicationsApi.updateEnrollmentFee(id, payload);
      toast.success('Program fee and installments updated successfully!');
      setShowFeeModal(false);
      window.dispatchEvent(new Event('fic:stats-refresh'));
      await load(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update program fee.');
    } finally {
      setFeeLoading(false);
    }
  };

  const handleCommissionUpdate = async () => {
    if (!id || !commissionForm.commissionStatus) {
      toast.error('Please select a commission status.');
      return;
    }
    setCommissionLoading(true);
    try {
      await applicationsApi.updateCommission(id, commissionForm);
      toast.success('Commission status updated!');
      setShowCommissionModal(false);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update commission status.');
    } finally {
      setCommissionLoading(false);
    }
  };

  const handleVerifyTransaction = async (txnMongoId: string) => {
    if (!id) return;
    setVerifyingTxn(txnMongoId);
    try {
      await applicationsApi.verifyPayment(id, txnMongoId);
      toast.success('Payment verified successfully!');
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify payment.');
    } finally {
      setVerifyingTxn(null);
    }
  };

  const handleLoanUpdate = async () => {
    if (!id || !loanForm.loanStatus) {
      toast.error('Please select a loan status.');
      return;
    }
    setLoanLoading(true);
    try {
      await applicationsApi.updateLoan(id, loanForm);
      toast.success('Loan status updated!');
      setShowLoanModal(false);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update loan status.');
    } finally {
      setLoanLoading(false);
    }
  };

  const handleCampusUpdate = async () => {
    if (!id || !campusForm.campusStatus) {
      toast.error('Please select a campus status.');
      return;
    }
    setCampusLoading(true);
    try {
      await applicationsApi.updateCampus(id, campusForm);
      toast.success('Campus status updated!');
      setShowCampusModal(false);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update campus status.');
    } finally {
      setCampusLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  if (!application) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-slate-600">Application not found.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/candidates')}>Go Back</Button>
      </div>
    );
  }

  const a = application;
  const candidate = typeof a.candidateId === 'object' ? a.candidateId : null;

  const tabs = [
    { id: 'details', label: 'Candidate Details', icon: <User className="w-4 h-4" /> },
    { id: 'interviews', label: 'Interview Tracking', icon: <Calendar className="w-4 h-4" /> },
    { id: 'payments', label: 'Enrollment & Payments', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'loan-campus', label: 'Loan & Campus', icon: <Building2 className="w-4 h-4" /> },
    ...(hasRole('SUPER_ADMIN') ? [{ id: 'commission', label: 'Commission', icon: <FileText className="w-4 h-4" /> }] : []),
    { id: 'activity', label: 'Activity History', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/candidates')} className="text-slate-400 hover:text-fic-navy p-2 rounded-lg hover:bg-slate-100 flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-fic-navy leading-tight">{a.candidateName}</h1>
            <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
              <span className="font-mono text-xs bg-blue-50 text-fic-navy px-2 py-0.5 rounded inline-flex items-center gap-1.5 border border-blue-200">
                {a.applicationNumber}
                {hasRole('SUPER_ADMIN', 'ADMIN', 'HR_EXECUTIVE') && (
                  <button
                    type="button"
                    onClick={openEditDetailsModal}
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-100/60 p-0.5 rounded transition-colors"
                    title="Edit Application Number"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </span>
              <Badge className={appStatusBadge[a.overallStatus]}>{a.overallStatus}</Badge>
              {(() => {
                const isCracked = a.processType
                  ? /crack/i.test(a.processType)
                  : /crack/i.test(a.vendorName || '') || /crack/i.test(a.programName || '');
                return isCracked ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border-2 border-emerald-300 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Crack-ED Process
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-800 border-2 border-blue-300 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    Manipal Process
                  </span>
                );
              })()}
              <span className="text-xs text-slate-400">Reg: {formatDate(a.registrationDate)}</span>
            </div>
          </div>
        </div>
        {hasRole('SUPER_ADMIN', 'ADMIN', 'HR_EXECUTIVE') && (
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={openEditDetailsModal}
              className="flex-1 sm:flex-initial justify-center"
            >
              Edit Details
            </Button>
            <Button
              size="sm"
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => { setNewStatus(a.overallStatus); setShowStatusModal(true); }}
              className="flex-1 sm:flex-initial justify-center"
            >
              Update Status
            </Button>
            {hasRole('SUPER_ADMIN', 'ADMIN') && (
              <Button
                size="sm"
                variant="danger"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 sm:flex-initial justify-center"
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Quick Info Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {[
          {
            label: 'Process',
            value: (/crack/i.test(a.processType || a.vendorName || '') ? 'Crack-ED Process' : 'Manipal Process'),
          },
          { label: 'Bank', value: a.bankName },
          { label: 'Program', value: a.programName },
          { label: 'Vendor', value: a.vendorName },
          { label: 'HR Reference', value: a.hrReferenceName },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-lg border border-fic-border px-4 py-3">
            <div className="text-xs text-slate-400">{item.label}</div>
            <div className="text-sm font-semibold text-slate-700 truncate">{item.value}</div>
          </div>
        ))}
      </div>

      {/* On Hold Prominent Tracking Banner */}
      {a.overallStatus === 'On Hold' && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center text-lg font-black flex-shrink-0">
              ⏸️
            </div>
            <div>
              <div className="text-sm font-bold text-amber-900">
                Candidate Is Currently On Hold
              </div>
              <p className="text-xs text-amber-800 mt-0.5 max-w-xl">
                {a.remarks || 'Reason not recorded. Use Update Status to add follow-up notes or resume candidate processing.'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setNewStatus('Interview in Progress');
              setShowStatusModal(true);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Resume Processing
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-fic-border overflow-hidden">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="p-4 sm:p-6">
          {/* TAB 1: Details */}
          {activeTab === 'details' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">Personal Information</h3>
                  {hasRole('SUPER_ADMIN', 'ADMIN', 'HR_EXECUTIVE') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<Edit2 className="w-3 h-3" />}
                      onClick={openEditDetailsModal}
                    >
                      Edit Info
                    </Button>
                  )}
                </div>
                <dl className="space-y-2">
                  {[
                    { label: 'Full Name', value: a.candidateName, icon: <User className="w-3.5 h-3.5" /> },
                    { label: 'Email', value: a.candidateEmail, icon: <Mail className="w-3.5 h-3.5" /> },
                    { label: 'Mobile', value: a.candidateMobile, icon: <Phone className="w-3.5 h-3.5" /> },
                    { label: 'State', value: (candidate as any)?.state || '-', icon: <MapPin className="w-3.5 h-3.5" /> },
                    { label: 'City', value: (candidate as any)?.city || '-', icon: <MapPin className="w-3.5 h-3.5" /> },
                    { label: 'Date of Birth', value: candidate ? formatDate((candidate as any).dateOfBirth) : '-', icon: <Calendar className="w-3.5 h-3.5" /> },
                  ].map((f) => (
                    <div key={f.label} className="flex items-start gap-2">
                      <span className="text-slate-400 mt-0.5">{f.icon}</span>
                      <div>
                        <span className="text-xs text-slate-400">{f.label}: </span>
                        <span className="text-sm text-slate-700">{f.value || '-'}</span>
                      </div>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Application Details</h3>
                <dl className="space-y-2">
                  {[
                    { label: 'Payment Route', value: paymentRouteLabel[a.paymentRoute] },
                    { label: 'Batch Number', value: a.batchNumber || '-' },
                    { label: 'Remarks', value: a.remarks || '-' },
                  ].map((f) => (
                    <div key={f.label}>
                      <span className="text-xs text-slate-400">{f.label}: </span>
                      <span className="text-sm text-slate-700">{f.value}</span>
                    </div>
                  ))}
                </dl>
                {(candidate as any)?.resumeUrl && (
                  <div className="mt-4">
                    <a
                      href={`${BASE_URL}/files/resume/${(candidate as any).resumeUrl.split('/').pop()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-fic-navy hover:underline"
                    >
                      <FileText className="w-4 h-4" />
                      {(candidate as any).resumeOriginalName || 'View Resume'}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Interviews */}
          {activeTab === 'interviews' && (
            <div className="space-y-4">
              {a.interviewRounds?.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No interview rounds configured for this program.</p>
              ) : (
                a.interviewRounds?.map((round) => (
                  <div key={round.roundId} className="border border-fic-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{round.roundName}</span>
                        {round.isMandatory && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Mandatory</span>
                        )}
                        <Badge className={interviewStatusBadge[round.currentStatus]}>{round.currentStatus}</Badge>
                      </div>
                      {hasRole('SUPER_ADMIN', 'ADMIN', 'HR_EXECUTIVE') && (
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<Edit2 className="w-3 h-3" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            openInterviewModal(round);
                          }}
                        >
                          Update
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600">
                      <div><span className="text-slate-400">Date:</span> {formatDate(round.scheduledDate)}</div>
                      <div><span className="text-slate-400">Time:</span> {round.scheduledTime || '-'}</div>
                      <div><span className="text-slate-400">Mode:</span> {round.interviewMode || '-'}</div>
                      <div><span className="text-slate-400">Result:</span> {round.result || '-'}</div>
                    </div>
                    {round.remarks && <p className="text-xs text-slate-500 mt-2 italic">{round.remarks}</p>}
                    {round.attempts?.length > 0 && (
                      <details className="mt-3">
                        <summary className="text-xs text-slate-400 cursor-pointer hover:text-fic-navy">
                          {round.attempts.length} previous attempt{round.attempts.length !== 1 ? 's' : ''}
                        </summary>
                        <div className="mt-2 space-y-1 pl-3 border-l-2 border-slate-100">
                          {round.attempts.map((att) => (
                            <div key={att._id} className="text-xs text-slate-500">
                              #{att.attemptNumber} · {formatDate(att.scheduledDate)} · {att.status}
                              {att.remarks && <span className="italic"> – {att.remarks}</span>}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: Payments */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              {a.payment && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                      { label: 'Payment Route', value: paymentRouteLabel[a.payment.paymentRoute] },
                      { label: 'Total Program Fee', value: formatCurrency(a.payment.totalProgramFee || a.payment.enrollmentFeeAmount) },
                      { label: 'Enrollment Fee', value: formatCurrency(a.payment.enrollmentFeeAmount) },
                      { label: 'Total Paid', value: formatCurrency(a.payment.amountPaid), textClass: 'text-emerald-700' },
                      {
                        label: 'Total Balance',
                        value: formatCurrency(
                          a.payment.totalProgramFee
                            ? Math.max(0, a.payment.totalProgramFee - a.payment.amountPaid)
                            : a.payment.balanceAmount
                        ),
                        textClass: 'text-amber-700',
                      },
                    ].map((item) => (
                      <div key={item.label} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                        <div className="text-[11px] font-medium text-slate-400">{item.label}</div>
                        <div className={`text-sm font-bold text-slate-800 mt-0.5 ${item.textClass || ''}`}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Installments Breakdown Table */}
                  {a.payment.installments && a.payment.installments.length > 0 && (
                    <div className="bg-white rounded-xl border border-fic-border p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-fic-navy" />
                          Installment Schedule
                        </h4>
                        <span className="text-xs text-slate-500 font-medium">
                          {a.payment.installments.length} installment{a.payment.installments.length !== 1 ? 's' : ''} configured
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="fic-table text-xs">
                          <thead>
                            <tr>
                              <th className="fic-table-header">#</th>
                              <th className="fic-table-header">Installment Name</th>
                              <th className="fic-table-header text-right">Due Amount</th>
                              <th className="fic-table-header text-right">Paid Amount</th>
                              <th className="fic-table-header text-right">Balance</th>
                              <th className="fic-table-header">Due Date</th>
                              <th className="fic-table-header">Status</th>
                              <th className="fic-table-header">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {a.payment.installments.map((inst, idx) => {
                              const instBal = Math.max(0, (inst.amount || 0) - (inst.paidAmount || 0));
                              return (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="fic-table-cell font-mono text-slate-400">{inst.installmentNumber || idx + 1}</td>
                                  <td className="fic-table-cell font-medium text-slate-800">{inst.name}</td>
                                  <td className="fic-table-cell text-right font-semibold text-slate-800">{formatCurrency(inst.amount)}</td>
                                  <td className="fic-table-cell text-right font-semibold text-emerald-600">{formatCurrency(inst.paidAmount || 0)}</td>
                                  <td className="fic-table-cell text-right font-medium text-slate-600">{formatCurrency(instBal)}</td>
                                  <td className="fic-table-cell text-slate-500">{inst.dueDate ? formatDate(inst.dueDate) : '-'}</td>
                                  <td className="fic-table-cell">
                                    <Badge className={
                                      inst.status === 'Paid'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : inst.status === 'Partially Paid'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }>
                                      {inst.status || 'Pending'}
                                    </Badge>
                                  </td>
                                  <td className="fic-table-cell text-slate-400 italic">{inst.remarks || '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Badge className={paymentStatusBadge[a.payment.paymentStatus]}>{a.payment.paymentStatus}</Badge>
                    <div className="flex gap-2 flex-wrap items-center">
                      {hasRole('SUPER_ADMIN', 'ADMIN', 'ACCOUNTS', 'HR_EXECUTIVE') && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${syncingFee ? 'animate-spin' : ''}`} />}
                            onClick={handleSyncProgramFee}
                            disabled={syncingFee}
                            title="Update candidate enrollment and program fee to match the latest from Program Master"
                          >
                            {syncingFee ? 'Syncing…' : 'Sync from Program'}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                            onClick={openFeeModal}
                          >
                            Edit Fee & Installments
                          </Button>
                        </>
                      )}
                      {hasRole('SUPER_ADMIN', 'ADMIN', 'ACCOUNTS', 'HR_EXECUTIVE') &&
                        a.payment.paymentStatus !== 'Not Applicable' &&
                        a.payment.paymentStatus !== 'Paid' && (
                          <Button size="sm" leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                            onClick={() => setShowPaymentModal(true)}>
                            Record Payment
                          </Button>
                        )}
                    </div>
                  </div>

                  {/* Refund Info */}
                  {a.payment.refund && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-slate-600 mb-1">Refund</p>
                      <div className="text-xs text-slate-500 space-y-0.5">
                        <div>Refundable: {a.payment.refund.isRefundable ? 'Yes' : 'No'}</div>
                        <div>Status: {a.payment.refund.refundStatus}</div>
                        {a.payment.refund.refundAmount > 0 && <div>Amount: {formatCurrency(a.payment.refund.refundAmount)}</div>}
                      </div>
                    </div>
                  )}

                  {/* Transaction History */}
                  {a.payment.transactions?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Transaction History</h4>
                      <div className="space-y-2">
                        {a.payment.transactions.map((txn) => (
                          <div key={txn._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-fic-border rounded-lg text-xs gap-2">
                            <div>
                              <span className="font-mono font-medium text-fic-navy">{txn.transactionId}</span>
                              <span className="text-slate-400 ml-2">{txn.paymentMode}</span>
                            </div>
                            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1">
                              <div className="font-bold text-green-600">{formatCurrency(txn.amount)}</div>
                              <div className="text-slate-400 text-[11px]">{formatDate(txn.paymentDate)}</div>
                            </div>
                            {txn.isVerified ? (
                              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs flex items-center gap-1 w-fit">
                                <CheckCircle className="w-3 h-3" /> Verified
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">Unverified</span>
                                {hasRole('SUPER_ADMIN', 'ADMIN') && (
                                  <button
                                    onClick={() => handleVerifyTransaction(txn._id)}
                                    disabled={verifyingTxn === txn._id}
                                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
                                  >
                                    <ShieldCheck className="w-3 h-3" />
                                    {verifyingTxn === txn._id ? 'Verifying…' : 'Verify'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 4: Loan & Campus */}
          {activeTab === 'loan-campus' && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Loan disabled notice when full payment */}
              {a.payment && (a.payment.paymentStatus === 'Paid' || a.payment.paymentRoute === 'ROUTE_B_FULL_PAYMENT') && (
                <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Loan Not Applicable</strong> — Full payment has been confirmed for this candidate. Loan processing is not required.
                  </div>
                </div>
              )}
              {a.loan && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700">Loan Status</h3>
                    {hasRole('SUPER_ADMIN', 'ADMIN', 'HR_EXECUTIVE') && (
                      <button
                        onClick={() => {
                          setLoanForm({
                            loanStatus: a.loan?.loanStatus || '',
                            sanctionDate: a.loan?.sanctionDate ? a.loan.sanctionDate.substring(0, 10) : '',
                            sanctionAmount: a.loan?.sanctionAmount ? String(a.loan.sanctionAmount) : '',
                            remarks: a.loan?.remarks || '',
                          });
                          setShowLoanModal(true);
                        }}
                        className="flex items-center gap-1 text-xs bg-fic-navy text-white px-2.5 py-1 rounded-lg hover:bg-blue-900 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" /> Update Loan
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500">Loan Required</span>
                      <span className="font-medium">{a.loan.isLoanRequired ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500">Status</span>
                      <Badge className={loanStatusBadge[a.loan.loanStatus]}>{a.loan.loanStatus}</Badge>
                    </div>
                    {a.loan.sanctionDate && (
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">Sanction Date</span>
                        <span>{formatDate(a.loan.sanctionDate)}</span>
                      </div>
                    )}
                    {a.loan.sanctionAmount && (
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">Sanction Amount</span>
                        <span className="font-medium text-green-700">{formatCurrency(a.loan.sanctionAmount)}</span>
                      </div>
                    )}
                    {a.loan.remarks && <p className="text-xs text-slate-400 italic">{a.loan.remarks}</p>}
                  </div>
                </div>
              )}
              {a.campus && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700">Campus Status</h3>
                    {hasRole('SUPER_ADMIN', 'ADMIN', 'HR_EXECUTIVE') && (
                      <button
                        onClick={() => {
                          setCampusForm({
                            campusStatus: a.campus?.campusStatus || '',
                            arrivalDate: a.campus?.arrivalDate ? a.campus.arrivalDate.substring(0, 10) : '',
                            campusLocation: a.campus?.campusLocation || '',
                            reportingBatch: a.campus?.reportingBatch || '',
                            remarks: a.campus?.remarks || '',
                          });
                          setShowCampusModal(true);
                        }}
                        className="flex items-center gap-1 text-xs bg-fic-navy text-white px-2.5 py-1 rounded-lg hover:bg-blue-900 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" /> Update Campus
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500">Campus Status</span>
                      <Badge className={campusStatusBadge[a.campus.campusStatus]}>{a.campus.campusStatus}</Badge>
                    </div>
                    {a.campus.arrivalDate && (
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">Arrival Date</span>
                        <span>{formatDate(a.campus.arrivalDate)}</span>
                      </div>
                    )}
                    {a.campus.campusLocation && (
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">Campus Location</span>
                        <span>{a.campus.campusLocation}</span>
                      </div>
                    )}
                    {a.campus.reportingBatch && (
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">Reporting Batch</span>
                        <span>{a.campus.reportingBatch}</span>
                      </div>
                    )}
                    {a.campus.remarks && <p className="text-xs text-slate-400 italic">{a.campus.remarks}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Commission (Super Admin Only) */}
          {activeTab === 'commission' && hasRole('SUPER_ADMIN') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Commission Status</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Track commission collection for this placement</p>
                </div>
                {hasRole('SUPER_ADMIN') && (
                  <Button size="sm" leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setCommissionForm({
                        commissionStatus: a.commissionStatus || '',
                        commissionAmount: a.commissionAmount ? String(a.commissionAmount) : '',
                        commissionCollectedDate: a.commissionCollectedDate ? a.commissionCollectedDate.substring(0, 10) : '',
                        commissionNotes: a.commissionNotes || '',
                      });
                      setShowCommissionModal(true);
                    }}>
                    Update Commission
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-xl border-2 ${
                  a.commissionStatus === 'COLLECTED' ? 'border-green-300 bg-green-50' :
                  a.commissionStatus === 'PENDING' ? 'border-amber-300 bg-amber-50' :
                  a.commissionStatus === 'NOT_APPLICABLE' ? 'border-slate-200 bg-slate-50' :
                  'border-dashed border-slate-200 bg-slate-50/50'
                }`}>
                  <div className="text-xs text-slate-500 mb-1 font-medium">Commission Status</div>
                  <div className={`text-sm font-bold ${
                    a.commissionStatus === 'COLLECTED' ? 'text-green-700' :
                    a.commissionStatus === 'PENDING' ? 'text-amber-700' :
                    a.commissionStatus === 'NOT_APPLICABLE' ? 'text-slate-500' :
                    'text-slate-400'
                  }`}>
                    {a.commissionStatus ? a.commissionStatus.replace(/_/g, ' ') : 'Not Set'}
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-fic-border bg-slate-50">
                  <div className="text-xs text-slate-500 mb-1 font-medium">Commission Amount</div>
                  <div className="text-sm font-bold text-slate-800">
                    {a.commissionAmount ? `₹${a.commissionAmount.toLocaleString('en-IN')}` : '—'}
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-fic-border bg-slate-50">
                  <div className="text-xs text-slate-500 mb-1 font-medium">Collection Date</div>
                  <div className="text-sm font-bold text-slate-800">
                    {a.commissionCollectedDate ? formatDate(a.commissionCollectedDate) : '—'}
                  </div>
                </div>
              </div>

              {a.commissionNotes && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium mb-1">Notes</p>
                  <p className="text-sm text-slate-700 italic">{a.commissionNotes}</p>
                </div>
              )}

              {!a.commissionStatus && (
                <div className="text-center py-8 text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm">No commission status set yet.</p>
                  {hasRole('SUPER_ADMIN', 'ADMIN') && (
                    <p className="text-xs mt-1">Click "Update Commission" to set the status.</p>
                  )}
                </div>
              )}

              {a.commissionUpdatedByName && (
                <p className="text-xs text-slate-400">
                  Last updated by <span className="font-medium">{a.commissionUpdatedByName}</span>
                  {a.commissionUpdatedAt ? ` on ${formatDateTime(a.commissionUpdatedAt)}` : ''}
                </p>
              )}
            </div>
          )}

          {/* TAB 5: Activity */}
          {activeTab === 'activity' && (
            <div>
              {logsLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : logs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No activity logs found.</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log._id} className="flex gap-3 pb-3 border-b border-slate-50 last:border-0">
                      <div className="w-7 h-7 bg-fic-navy/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-fic-navy">{log.actorName?.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-semibold text-slate-700">{log.actorName}</span>
                            <span className="text-xs text-slate-400 ml-2 capitalize">{log.actorRole?.toLowerCase().replace('_', ' ')}</span>
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">{formatDateTime(log.timestamp)}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{log.action?.replace(/_/g, ' ')}</p>
                        {log.details && <p className="text-xs text-slate-400 italic mt-0.5">{log.details}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Application Lifecycle Status">
        <div className="space-y-4">
          <div>
            <label className="fic-label">New Lifecycle Status *</label>
            <select
              className="fic-input font-medium"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <optgroup label="📋 Phase 1: Registration & Sourcing">
                <option value="Registered">Registered</option>
                <option value="Documents Pending">Documents Pending</option>
                <option value="Referred">Referred</option>
              </optgroup>
              <optgroup label="🎤 Phase 2: Interview Process">
                <option value="Awaiting Interview">Awaiting Interview</option>
                <option value="Interview in Progress">Interview in Progress</option>
              </optgroup>
              <optgroup label="🏆 Phase 3: Selection & Campus Onboarding">
                <option value="Selected">Selected (Bank Cleared)</option>
                <option value="Enrollment Fee Pending">Enrollment Fee Pending</option>
                <option value="Loan Processing">Loan Processing</option>
                <option value="Campus Reporting Pending">Campus Reporting Pending</option>
                <option value="Arrived in Campus">Arrived in Campus</option>
              </optgroup>
              <optgroup label="⏸️ Phase 4: Exceptions & Holds">
                <option value="On Hold">⏸️ On Hold (Action/Follow-up Required)</option>
                <option value="Rejected">❌ Rejected</option>
                <option value="Dropped">⚠️ Dropped</option>
                <option value="Not Interested">🚫 Not Interested</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="fic-label">Process / Status Effective Date (Optional)</label>
            <input
              type="date"
              className="fic-input text-xs"
              value={statusDate}
              onChange={(e) => setStatusDate(e.target.value)}
            />
            <p className="text-[11px] text-slate-400 mt-0.5">
              Enter the date this process milestone was completed or scheduled (optional, for maintaining proper records).
            </p>
          </div>

          {/* Intelligent On Hold Tracker Box */}
          {newStatus === 'On Hold' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wide">
                <span>⏸️</span>
                <span>Track Hold Reason &amp; Follow-Up Schedule</span>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Why is this candidate on hold? *
                </label>
                <select
                  className="fic-input text-xs"
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                >
                  <option value="Awaiting Candidate Documents">📄 Awaiting Candidate Documents (Certificates/ID)</option>
                  <option value="Interview Reschedule Requested">📅 Interview Reschedule Requested by Candidate</option>
                  <option value="Loan / Co-applicant Delay">💳 Loan Sanction / Co-Applicant Processing Delay</option>
                  <option value="Medical / Personal Emergency">🏥 Medical / Personal Emergency Delay</option>
                  <option value="Awaiting Next Batch Announcement">⏳ Awaiting Next Batch Announcement</option>
                  <option value="Candidate Unreachable">📞 Candidate Unreachable (Follow-up Scheduled)</option>
                  <option value="Candidate Considering Offer">🤔 Candidate Considering Alternate Offer</option>
                  <option value="Other">📝 Other Reason (Specify below)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Target Follow-Up Date
                </label>
                <input
                  type="date"
                  className="fic-input text-xs"
                  value={holdFollowUpDate}
                  onChange={(e) => setHoldFollowUpDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step-by-Step Transition Validation Banner */}
          {(() => {
            const isAdvancedStage = [
              'Selected',
              'Enrollment Fee Pending',
              'Loan Processing',
              'Campus Reporting Pending',
              'Arrived in Campus',
            ].includes(newStatus);
            const pendingMandatory = (a?.interviewRounds || []).filter(
              (r) =>
                r.isMandatory &&
                !['Selected', 'Passed', 'Completed'].includes(r.currentStatus) &&
                !['Selected', 'Passed'].includes(r.result || '')
            );

            if (isAdvancedStage && pendingMandatory.length > 0) {
              return (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 text-xs text-amber-900 shadow-2xs">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800">
                    <span>⚠️</span>
                    <span>Step-by-Step Transition Required</span>
                  </p>
                  <p className="mt-1 leading-relaxed">
                    Candidate cannot be marked as <strong>{newStatus}</strong>. Mandatory interview round(s) (
                    <strong className="underline text-amber-900">
                      {pendingMandatory.map((r) => r.roundName).join(', ')}
                    </strong>
                    ) must be evaluated and marked as Passed / Selected first.
                  </p>
                </div>
              );
            }
            return null;
          })()}

          <Textarea
            label="Remarks / Activity Note (Optional)"
            placeholder="Add specific context or follow-up notes..."
            value={statusRemarks}
            onChange={(e) => setStatusRemarks(e.target.value)}
          />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowStatusModal(false)}>Cancel</Button>
            {(() => {
              const isAdvancedStage = [
                'Selected',
                'Enrollment Fee Pending',
                'Loan Processing',
                'Campus Reporting Pending',
                'Arrived in Campus',
              ].includes(newStatus);
              const pendingMandatory = (a?.interviewRounds || []).filter(
                (r) =>
                  r.isMandatory &&
                  !['Selected', 'Passed', 'Completed'].includes(r.currentStatus) &&
                  !['Selected', 'Passed'].includes(r.result || '')
              );
              const isBlocked = isAdvancedStage && pendingMandatory.length > 0;

              return (
                <Button
                  className="flex-1"
                  isLoading={statusLoading}
                  disabled={statusLoading || isBlocked}
                  onClick={handleStatusUpdate}
                >
                  {isBlocked ? 'Interviews Incomplete' : 'Save Status'}
                </Button>
              );
            })()}
          </div>
        </div>
      </Modal>

      {/* Interview Update Modal */}
      <Modal
        isOpen={showInterviewModal}
        onClose={() => setShowInterviewModal(false)}
        title={`Update ${selectedRound?.roundName} Interview`}
      >
        <div
          className="space-y-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const target = e.target as HTMLElement;
              if (target.tagName === 'TEXTAREA' || target.getAttribute('type') === 'submit') return;
              e.preventDefault();
              const container = e.currentTarget;
              const focusables = Array.from(
                container.querySelectorAll<HTMLElement>(
                  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]:not([disabled])'
                )
              );
              const idx = focusables.indexOf(target);
              if (idx > -1 && idx < focusables.length - 1) {
                focusables[idx + 1].focus();
              }
            }
          }}
        >
          {/* Round Header Badge */}
          <div className="flex items-center justify-between bg-blue-50/80 p-3 rounded-xl border border-blue-200">
            <div>
              <span className="text-xs font-bold text-fic-navy uppercase tracking-wider block">
                Round: {selectedRound?.roundName}
              </span>
              <span className="text-[11px] text-slate-500">
                {selectedRound?.isMandatory ? 'Mandatory Round (Required for Selection)' : 'Optional Round'}
              </span>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                interviewStatusBadge[selectedRound?.currentStatus as keyof typeof interviewStatusBadge] ||
                'bg-slate-100 text-slate-700'
              }`}
            >
              Current: {selectedRound?.currentStatus || 'Yet to Schedule'}
            </span>
          </div>

          {/* Primary Action: Outcome / Result */}
          <div>
            <label className="fic-label font-bold text-slate-800">
              Round Outcome / Decision *
            </label>
            <select
              className="fic-input border-2 border-fic-navy/40 font-semibold text-slate-800 bg-white"
              value={interviewForm.outcome || 'Scheduled'}
              onChange={(e) => setInterviewForm({ ...interviewForm, outcome: e.target.value })}
            >
              <option value="Passed">✅ Passed / Selected (Round Cleared)</option>
              <option value="Scheduled">📅 Scheduled (Set Date &amp; Time below)</option>
              <option value="Rejected">❌ Failed / Rejected</option>
              <option value="On Hold">⏳ On Hold (Re-evaluating)</option>
              <option value="Absent">🚫 Absent / No Show</option>
              <option value="Yet to Schedule">🔄 Reset to Yet to Schedule</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Selecting <strong>Passed / Selected</strong> automatically advances the round status and candidate progress.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            <div>
              <label className="fic-label">Interview Date</label>
              <input
                type="date"
                className="fic-input"
                value={interviewForm.scheduledDate || ''}
                onChange={(e) => setInterviewForm({ ...interviewForm, scheduledDate: e.target.value })}
              />
            </div>
            <div>
              <label className="fic-label">Time</label>
              <input
                type="time"
                className="fic-input"
                value={interviewForm.scheduledTime || ''}
                onChange={(e) => setInterviewForm({ ...interviewForm, scheduledTime: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="fic-label">Interview Mode</label>
              <select
                className="fic-input"
                value={interviewForm.interviewMode || 'Online'}
                onChange={(e) => setInterviewForm({ ...interviewForm, interviewMode: e.target.value })}
              >
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Telephonic">Telephonic</option>
              </select>
            </div>
            <div>
              <label className="fic-label">Venue / Meeting Link</label>
              <input
                className="fic-input"
                placeholder="Google Meet link or campus venue..."
                value={interviewForm.venueOrLink || ''}
                onChange={(e) => setInterviewForm({ ...interviewForm, venueOrLink: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="fic-label">Remarks / Interviewer Feedback</label>
            <textarea
              rows={2}
              className="fic-input"
              placeholder="Candidate performance, communication, scores..."
              value={interviewForm.remarks || ''}
              onChange={(e) => setInterviewForm({ ...interviewForm, remarks: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowInterviewModal(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-fic-navy text-white hover:bg-slate-800"
              isLoading={interviewLoading}
              onClick={handleInterviewUpdate}
            >
              Save Round Outcome
            </Button>
          </div>
        </div>
      </Modal>

      {/* Payment Record Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record / Update Payment">
        <div className="space-y-4">
          <div>
            <label className="fic-label">Quick Status Action (Optional)</label>
            <select
              className="fic-input"
              value={paymentForm.paymentStatus}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'Paid') {
                  setPaymentForm({
                    ...paymentForm,
                    paymentStatus: 'Paid',
                    amount: String(a.payment?.balanceAmount || a.payment?.enrollmentFeeAmount || 15000),
                  });
                } else if (val === 'Pending') {
                  setPaymentForm({ ...paymentForm, paymentStatus: 'Pending', amount: '0' });
                } else {
                  setPaymentForm({ ...paymentForm, paymentStatus: val });
                }
              }}
            >
              <option value="">Standard Payment Entry</option>
              <option value="Paid">✅ Mark as Paid (Full Payment)</option>
              <option value="Partially Paid">⏳ Mark as Partially Paid</option>
              <option value="Pending">❌ Mark as Pending (Not Paid)</option>
            </select>
          </div>
          <div>
            <label className="fic-label">Transaction ID / UTR (Optional)</label>
            <input className="fic-input" placeholder="e.g. UPI / NEFT UTR or leave blank" value={paymentForm.transactionId}
              onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })} />
            <p className="text-[11px] text-slate-400 mt-1">If empty, a manual tracking reference will be generated automatically.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="fic-label">Amount (₹)</label>
              <input type="number" className="fic-input" placeholder="0" value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
            </div>
            <Select
              label="Payment Mode"
              options={[
                { value: 'UPI', label: 'UPI' }, { value: 'NEFT/RTGS', label: 'NEFT/RTGS' },
                { value: 'NetBanking', label: 'Net Banking' }, { value: 'Cheque', label: 'Cheque' },
                { value: 'Cash', label: 'Cash' },
              ]}
              value={paymentForm.paymentMode}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
            />
          </div>
          <div>
            <label className="fic-label">Payment Date</label>
            <input type="date" className="fic-input" value={paymentForm.paymentDate}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} />
          </div>
          <div>
            <label className="fic-label">Reference Notes</label>
            <input className="fic-input" placeholder="e.g. Paid via cash, partial waiver, etc." value={paymentForm.referenceNotes}
              onChange={(e) => setPaymentForm({ ...paymentForm, referenceNotes: e.target.value })} />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button className="flex-1" isLoading={paymentLoading} onClick={handlePaymentRecord}>Save Payment</Button>
          </div>
        </div>
      </Modal>
      {/* Program Fee & Installments Edit Modal */}
      <Modal
        isOpen={showFeeModal}
        onClose={() => setShowFeeModal(false)}
        title="Edit Program Fee & Installments"
        size="2xl"
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 leading-relaxed">
            Configure the <strong>Total Program Fee</strong>, <strong>Enrollment / Booking Fee</strong>, and customizable <strong>Installments Schedule</strong> for this candidate. Balances and payment statuses are automatically recalculated.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="fic-label">Total Program Fee (₹) *</label>
              <input
                type="number"
                className="fic-input font-semibold text-slate-800"
                placeholder="e.g. 250000"
                value={feeForm.totalProgramFee}
                onChange={(e) => setFeeForm({ ...feeForm, totalProgramFee: e.target.value })}
              />
              <p className="text-[11px] text-slate-400 mt-1">Full overall cost of the training program</p>
            </div>
            <div>
              <label className="fic-label">Enrollment / Booking Fee (₹) *</label>
              <input
                type="number"
                className="fic-input font-semibold text-slate-800"
                placeholder="e.g. 20000"
                value={feeForm.enrollmentFeeAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  setFeeForm((prev) => {
                    const nextInsts = [...prev.installments];
                    if (nextInsts.length > 0) {
                      nextInsts[0] = { ...nextInsts[0], amount: val };
                    }
                    return { ...prev, enrollmentFeeAmount: val, installments: nextInsts };
                  });
                }}
              />
              <p className="text-[11px] text-slate-400 mt-1">Initial fee required to confirm admission</p>
            </div>
          </div>

          {/* Installments Schedule Section */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-fic-navy" />
                  Installment Breakdown ({feeForm.installments.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Add or customize installment amounts and due dates
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="text-xs"
                  onClick={autoBalanceInstallments}
                >
                  Auto-Balance
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={addFeeInstallment}
                >
                  Add Installment
                </Button>
              </div>
            </div>

            {/* Installments List */}
            <div className="space-y-2">
              {feeForm.installments.map((inst, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-2.5 rounded-lg border border-slate-200 items-center text-xs"
                >
                  <div className="sm:col-span-1 text-slate-400 font-mono font-medium text-center">
                    #{idx + 1}
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      className="fic-input text-xs h-8"
                      placeholder="Installment Name"
                      value={inst.name}
                      onChange={(e) => updateFeeInstallment(idx, 'name', e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      className="fic-input text-xs h-8 font-semibold"
                      placeholder="Amount (₹)"
                      value={inst.amount}
                      onChange={(e) => updateFeeInstallment(idx, 'amount', e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="date"
                      className="fic-input text-xs h-8"
                      value={inst.dueDate || ''}
                      onChange={(e) => updateFeeInstallment(idx, 'dueDate', e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-center">
                    {feeForm.installments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFeeInstallment(idx)}
                        className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Delete installment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="sm:col-span-12">
                    <input
                      type="text"
                      className="fic-input text-[11px] h-7 text-slate-500"
                      placeholder="Installment notes (e.g. Paid via Loan, Post-Selection, etc.)"
                      value={inst.remarks || ''}
                      onChange={(e) => updateFeeInstallment(idx, 'remarks', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Reconciliation Bar */}
            {(() => {
              const sumInstallments = feeForm.installments.reduce(
                (acc, curr) => acc + (Number(curr.amount) || 0),
                0
              );
              const totalProgFee = Number(feeForm.totalProgramFee) || 0;
              const diff = totalProgFee - sumInstallments;
              const isMatch = Math.abs(diff) === 0;

              return (
                <div
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border text-xs gap-2 ${
                    isMatch
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50/70 border-amber-200 text-amber-900'
                  }`}
                >
                  <div>
                    <span className="font-semibold">Sum of Installments: </span>
                    <span className="font-bold">₹{sumInstallments.toLocaleString('en-IN')}</span>
                    <span className="text-slate-400 mx-2">|</span>
                    <span className="font-semibold">Total Program Fee: </span>
                    <span className="font-bold">₹{totalProgFee.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium">
                    {isMatch ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Installments Match Program Fee
                      </span>
                    ) : (
                      <>
                        <span className="text-amber-800">
                          Difference: ₹{Math.abs(diff).toLocaleString('en-IN')} {diff > 0 ? 'unallocated' : 'exceeds total'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFeeForm({ ...feeForm, totalProgramFee: String(sumInstallments) })}
                          className="text-[11px] underline text-blue-700 hover:text-blue-900 font-medium"
                        >
                          Match Total
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          <div>
            <label className="fic-label">Remarks / Change Reason (Optional)</label>
            <input
              className="fic-input"
              placeholder="e.g. Scholarship waiver, revised program cost, restructured installment schedule..."
              value={feeForm.remarks}
              onChange={(e) => setFeeForm({ ...feeForm, remarks: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-200">
            <Button variant="secondary" className="flex-1" onClick={() => setShowFeeModal(false)}>
              Cancel
            </Button>
            <Button className="flex-1" isLoading={feeLoading} onClick={handleFeeUpdate}>
              Save Program Fee & Installments
            </Button>
          </div>
        </div>
      </Modal>

      {/* Commission Update Modal */}
      <Modal isOpen={showCommissionModal} onClose={() => setShowCommissionModal(false)} title="Update Commission Status">
        <div className="space-y-4">
          <div>
            <label className="fic-label">Commission Status *</label>
            <select className="fic-input" value={commissionForm.commissionStatus}
              onChange={(e) => setCommissionForm({ ...commissionForm, commissionStatus: e.target.value })}>
              <option value="">Select Status</option>
              <option value="PENDING">⏳ Pending</option>
              <option value="COLLECTED">✅ Collected</option>
              <option value="NOT_APPLICABLE">🚫 Not Applicable</option>
            </select>
          </div>
          <div>
            <label className="fic-label">Commission Amount (₹)</label>
            <input type="number" className="fic-input" placeholder="Enter commission amount"
              value={commissionForm.commissionAmount}
              onChange={(e) => setCommissionForm({ ...commissionForm, commissionAmount: e.target.value })} />
          </div>
          <div>
            <label className="fic-label">Collection Date</label>
            <input type="date" className="fic-input" value={commissionForm.commissionCollectedDate}
              onChange={(e) => setCommissionForm({ ...commissionForm, commissionCollectedDate: e.target.value })} />
          </div>
          <div>
            <label className="fic-label">Notes</label>
            <textarea className="fic-input" rows={3} placeholder="Any additional notes..."
              value={commissionForm.commissionNotes}
              onChange={(e) => setCommissionForm({ ...commissionForm, commissionNotes: e.target.value })} />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCommissionModal(false)}>Cancel</Button>
            <Button className="flex-1" isLoading={commissionLoading} onClick={handleCommissionUpdate}>Update</Button>
          </div>
        </div>
      </Modal>

      {/* Loan Update Modal */}
      <Modal isOpen={showLoanModal} onClose={() => setShowLoanModal(false)} title="Update Loan Status">
        <div className="space-y-4">
          <div>
            <label className="fic-label">Loan Status *</label>
            <select className="fic-input" value={loanForm.loanStatus}
              onChange={(e) => setLoanForm({ ...loanForm, loanStatus: e.target.value })}>
              <option value="">Select Status</option>
              <option value="Not Sanctioned">❌ Not Sanctioned</option>
              <option value="Applied">📋 Applied</option>
              <option value="Under Review">🔍 Under Review</option>
              <option value="Sanctioned">✅ Sanctioned</option>
              <option value="Disbursed">💰 Disbursed</option>
              <option value="Rejected">🚫 Rejected</option>
              <option value="Not Applicable">— Not Applicable</option>
            </select>
          </div>
          <div>
            <label className="fic-label">Sanction Date</label>
            <input type="date" className="fic-input" value={loanForm.sanctionDate}
              onChange={(e) => setLoanForm({ ...loanForm, sanctionDate: e.target.value })} />
          </div>
          <div>
            <label className="fic-label">Sanction Amount (₹)</label>
            <input type="number" className="fic-input" placeholder="e.g. 150000"
              value={loanForm.sanctionAmount}
              onChange={(e) => setLoanForm({ ...loanForm, sanctionAmount: e.target.value })} />
          </div>
          <div>
            <label className="fic-label">Remarks</label>
            <textarea className="fic-input" rows={2} placeholder="Any remarks about loan status..."
              value={loanForm.remarks}
              onChange={(e) => setLoanForm({ ...loanForm, remarks: e.target.value })} />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowLoanModal(false)}>Cancel</Button>
            <Button className="flex-1" isLoading={loanLoading} onClick={handleLoanUpdate}>Update Loan</Button>
          </div>
        </div>
      </Modal>

      {/* Campus Update Modal */}
      <Modal isOpen={showCampusModal} onClose={() => setShowCampusModal(false)} title="Update Campus Status">
        <div className="space-y-4">
          <div>
            <label className="fic-label">Campus Status *</label>
            <select className="fic-input" value={campusForm.campusStatus}
              onChange={(e) => setCampusForm({ ...campusForm, campusStatus: e.target.value })}>
              <option value="">Select Status</option>
              <option value="Pending">⏳ Pending</option>
              <option value="Scheduled">📅 Scheduled</option>
              <option value="Arrived in Campus">✅ Arrived in Campus / Reported</option>
              <option value="Completed">🎓 Completed</option>
              <option value="Dropped">⚠️ Dropped</option>
              <option value="Cancelled">🚫 Cancelled</option>
              <option value="Not Applicable">— Not Applicable</option>
            </select>
          </div>
          <div>
            <label className="fic-label">Arrival / Reporting Date</label>
            <input type="date" className="fic-input" value={campusForm.arrivalDate}
              onChange={(e) => setCampusForm({ ...campusForm, arrivalDate: e.target.value })} />
          </div>
          <div>
            <label className="fic-label">Campus Location</label>
            <input type="text" className="fic-input" placeholder="e.g. Mumbai Training Centre"
              value={campusForm.campusLocation}
              onChange={(e) => setCampusForm({ ...campusForm, campusLocation: e.target.value })} />
          </div>
          <div>
            <label className="fic-label">Reporting Batch</label>
            <input type="text" className="fic-input" placeholder="e.g. Batch 2026-B"
              value={campusForm.reportingBatch}
              onChange={(e) => setCampusForm({ ...campusForm, reportingBatch: e.target.value })} />
          </div>
          <div>
            <label className="fic-label">Remarks</label>
            <textarea className="fic-input" rows={2} placeholder="Any remarks..."
              value={campusForm.remarks}
              onChange={(e) => setCampusForm({ ...campusForm, remarks: e.target.value })} />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCampusModal(false)}>Cancel</Button>
            <Button className="flex-1" isLoading={campusLoading} onClick={handleCampusUpdate}>Update Campus</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Candidate Details Modal */}
      <Modal
        isOpen={showEditDetailsModal}
        onClose={() => setShowEditDetailsModal(false)}
        title={`Edit Complete Candidate Details — ${a.candidateName}`}
        size="2xl"
      >
        <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
          {/* Section 1: Candidate Personal Details */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              1. Candidate Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="fic-label">Application Number *</label>
                <input
                  type="text"
                  className="fic-input font-mono uppercase font-semibold text-fic-navy"
                  value={detailsForm.applicationNumber}
                  onChange={(e) => setDetailsForm({ ...detailsForm, applicationNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. ABCP-125027 or FIC-202611-ABCD"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Unique application identifier. Updating this will update all interview rounds, payments, loans, and campus records.
                </p>
              </div>

              <div>
                <label className="fic-label">Candidate Full Name *</label>
                <input
                  type="text"
                  className="fic-input"
                  value={detailsForm.fullName}
                  onChange={(e) => setDetailsForm({ ...detailsForm, fullName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="fic-label">Mobile Number *</label>
                <input
                  type="tel"
                  className="fic-input"
                  value={detailsForm.mobileNumber}
                  onChange={(e) => setDetailsForm({ ...detailsForm, mobileNumber: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="fic-label">Email Address *</label>
                <input
                  type="email"
                  className="fic-input"
                  value={detailsForm.email}
                  onChange={(e) => setDetailsForm({ ...detailsForm, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="fic-label">Date of Birth</label>
                <input
                  type="date"
                  className="fic-input"
                  value={detailsForm.dateOfBirth}
                  onChange={(e) => setDetailsForm({ ...detailsForm, dateOfBirth: e.target.value })}
                />
              </div>

              <div>
                <label className="fic-label">State</label>
                <input
                  type="text"
                  className="fic-input"
                  placeholder="e.g. Tamil Nadu"
                  value={detailsForm.state}
                  onChange={(e) => setDetailsForm({ ...detailsForm, state: e.target.value })}
                />
              </div>

              <div>
                <label className="fic-label">City / District</label>
                <input
                  type="text"
                  className="fic-input"
                  placeholder="e.g. Chennai"
                  value={detailsForm.city}
                  onChange={(e) => setDetailsForm({ ...detailsForm, city: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Bank, Program, HR & Vendor Assignments */}
          <div className="pt-2 border-t border-slate-200">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              2. Bank, Program &amp; Assignment Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="fic-label">Bank *</label>
                <select
                  className="fic-input"
                  value={detailsForm.bankId}
                  onChange={(e) => handleEditBankChange(e.target.value)}
                  required
                >
                  <option value="">Select Bank</option>
                  {banks.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="fic-label">Program *</label>
                <select
                  className="fic-input"
                  value={detailsForm.programId}
                  onChange={(e) => setDetailsForm({ ...detailsForm, programId: e.target.value })}
                  required
                >
                  <option value="">
                    {detailsForm.bankId ? 'Select Program' : 'Select Bank First'}
                  </option>
                  {filteredEditPrograms.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.bankName ? `${p.name} (${p.bankName})` : p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="fic-label">HR Reference</label>
                <select
                  className="fic-input"
                  value={detailsForm.hrReferenceId}
                  onChange={(e) => setDetailsForm({ ...detailsForm, hrReferenceId: e.target.value })}
                >
                  <option value="">Select HR Reference</option>
                  {hrList.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="fic-label">Vendor</label>
                <select
                  className="fic-input"
                  value={detailsForm.vendorId}
                  onChange={(e) => {
                    const vendId = e.target.value;
                    const v = vendors.find((vend) => vend._id === vendId);
                    const isCrk = v && /crack/i.test(v.name);
                    setDetailsForm({
                      ...detailsForm,
                      vendorId: vendId,
                      ...(isCrk ? { processType: 'Crack-ed', batchNumber: '' } : {}),
                    });
                  }}
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="fic-label">Process Type *</label>
                <select
                  className="fic-input font-bold"
                  value={detailsForm.processType}
                  onChange={(e) => {
                    const pType = e.target.value;
                    const isCrk = /crack/i.test(pType);
                    setDetailsForm({
                      ...detailsForm,
                      processType: pType,
                      ...(isCrk ? { batchNumber: '' } : {}),
                    });
                  }}
                >
                  <option value="Manipal">🎓 Manipal Process</option>
                  <option value="Crack-ed">⚡ Crack-ED Process</option>
                </select>
              </div>

              <div>
                <label className="fic-label">Process / Registration Date (Optional)</label>
                <input
                  type="date"
                  className="fic-input"
                  value={detailsForm.registrationDate}
                  onChange={(e) => setDetailsForm({ ...detailsForm, registrationDate: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="fic-label">Payment Route</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="editPaymentRoute"
                      value="ROUTE_A_VENDOR_LOAN"
                      checked={detailsForm.paymentRoute === 'ROUTE_A_VENDOR_LOAN'}
                      onChange={(e) => setDetailsForm({ ...detailsForm, paymentRoute: e.target.value })}
                    />
                    Vendor Loan
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="editPaymentRoute"
                      value="ROUTE_B_FULL_PAYMENT"
                      checked={detailsForm.paymentRoute === 'ROUTE_B_FULL_PAYMENT'}
                      onChange={(e) => setDetailsForm({ ...detailsForm, paymentRoute: e.target.value })}
                    />
                    Full Payment
                  </label>
                </div>
              </div>

              {!Boolean(
                (vendors.find((v) => v._id === detailsForm.vendorId) &&
                  /crack/i.test(vendors.find((v) => v._id === detailsForm.vendorId)?.name || '')) ||
                (detailsForm.processType && /crack/i.test(detailsForm.processType))
              ) && (
                <div>
                  <label className="fic-label">Batch Number</label>
                  <input
                    type="text"
                    className="fic-input"
                    placeholder="e.g. Batch 2026-A"
                    value={detailsForm.batchNumber}
                    onChange={(e) => setDetailsForm({ ...detailsForm, batchNumber: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="fic-label">Remarks</label>
                <input
                  type="text"
                  className="fic-input"
                  placeholder="e.g. Profile notes or reason for edit"
                  value={detailsForm.remarks}
                  onChange={(e) => setDetailsForm({ ...detailsForm, remarks: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-200">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowEditDetailsModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              isLoading={detailsLoading}
              onClick={handleSaveDetails}
            >
              Save All Changes
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteCandidate}
        isLoading={deletingCandidate}
        title="Delete Candidate Permanently?"
        message={`Are you sure you want to permanently delete "${a.candidateName}" (${a.applicationNumber})? This will erase the candidate profile, application, interview history, payment records, loan, and campus status. This cannot be undone.`}
        confirmLabel="Delete Permanently"
        confirmVariant="danger"
      />
    </div>
  );
};

