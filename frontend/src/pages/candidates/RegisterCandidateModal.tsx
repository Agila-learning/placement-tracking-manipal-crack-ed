import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Select, Textarea } from '../../components/ui';
import { banksApi, vendorsApi, programsApi, usersApi, applicationsApi } from '../../api/endpoints';
import { Bank, Vendor, Program, User } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { IndiaLocationSelector } from '../../components/common/IndiaLocationSelector';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface IDupCheckResult {
  candidateExists?: boolean;
  emailExists?: boolean;
  mobileExists?: boolean;
  isDuplicateProgram?: boolean;
  duplicateApplication?: {
    applicationNumber: string;
    programName?: string;
    bankName?: string;
    overallStatus?: string;
  } | null;
  existingCandidate?: {
    id: string;
    name: string;
    email: string;
    mobile: string;
    state?: string;
    stateCode?: string;
    district?: string;
    city?: string;
  } | null;
  existingApplications?: Array<{
    applicationNumber: string;
    bankName?: string;
    programName?: string;
    programId?: string;
    status?: string;
  }>;
}

export const RegisterCandidateModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const toast = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [hrList, setHrList] = useState<User[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<Program[]>([]);

  const [dupCheck, setDupCheck] = useState<IDupCheckResult | null>(null);
  const [existingCandidateId, setExistingCandidateId] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    dateOfBirth: '',
    state: '',
    stateCode: '',
    district: '',
    city: '',
    bankId: '',
    programId: '',
    vendorId: '',
    hrReferenceId: '',
    batchNumber: '',
    paymentRoute: 'ROUTE_A_VENDOR_LOAN',
    processType: 'Manipal',
    registrationDate: new Date().toISOString().slice(0, 10),
    resume: null as File | null,
  });

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      try {
        const [b, v, p, hr] = await Promise.all([
          banksApi.list(),
          vendorsApi.list(),
          programsApi.list(),
          usersApi.hrReferences(),
        ]);
        setBanks((b.data || []).filter((item) => item.status !== 'INACTIVE'));
        setVendors((v.data || []).filter((item) => item.status !== 'INACTIVE'));
        setPrograms((p.data || []).filter((item) => item.status !== 'INACTIVE'));
        setHrList(hr.data || []);
      } catch {}
    };
    load();
  }, [isOpen]);

  useEffect(() => {
    if (!form.bankId) {
      setFilteredPrograms(programs);
      return;
    }
    const selectedBank = banks.find((b) => b._id === form.bankId);
    const bankNameLower = selectedBank?.name?.toLowerCase().trim() || '';

    // 1. Direct ID match
    let matched = programs.filter(
      (p) =>
        p.bankId === form.bankId ||
        (p.bankId as any)?._id === form.bankId ||
        String(p.bankId) === String(form.bankId) ||
        String((p.bankId as any)?._id) === String(form.bankId)
    );

    // 2. Fallback to bank name match (e.g. "Axis" matches "Axis Operations", "Axis Retail Lending", etc.)
    if (matched.length === 0 && bankNameLower) {
      matched = programs.filter((p) => {
        const pBankName = (p.bankName || (p.bankId as any)?.name || '').toLowerCase().trim();
        return pBankName.includes(bankNameLower) || bankNameLower.includes(pBankName);
      });
    }

    // 3. Fallback to all programs so dropdown is never blocked
    setFilteredPrograms(matched.length > 0 ? matched : programs);
    setForm((f) => ({ ...f, programId: '' }));
  }, [form.bankId, programs, banks]);

  const checkDuplicate = async (overrideProgramId?: string, overrideBankId?: string) => {
    if (!form.email && !form.mobileNumber) return;
    try {
      const pId = overrideProgramId !== undefined ? overrideProgramId : form.programId;
      const bId = overrideBankId !== undefined ? overrideBankId : form.bankId;
      const res = await applicationsApi.checkDuplicate(
        form.email || undefined,
        form.mobileNumber || undefined,
        pId || undefined,
        bId || undefined
      );
      if (res.success && res.data) {
        const data = res.data as IDupCheckResult;
        setDupCheck(data);
        if (data.existingCandidate) {
          const c = data.existingCandidate;
          setForm((f) => ({
            ...f,
            fullName: f.fullName || c.name || '',
            state: f.state || c.state || '',
            stateCode: f.stateCode || c.stateCode || '',
            district: f.district || c.district || c.city || '',
            city: f.city || c.city || c.district || '',
          }));
        }
      }
    } catch {}
  };

  const selectedVendor = vendors.find((v) => v._id === form.vendorId);
  const isCrackSelected = Boolean(
    (selectedVendor && /crack/i.test(selectedVendor.name)) ||
    (form.processType && /crack/i.test(form.processType))
  );

  const handleChange = (field: string, value: string) => {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'vendorId') {
        const v = vendors.find((vend) => vend._id === value);
        if (v && /crack/i.test(v.name)) {
          next.processType = 'Crack-ed';
          next.batchNumber = '';
        }
      }
      if (field === 'processType' && /crack/i.test(value)) {
        next.batchNumber = '';
      }
      return next;
    });

    if (field === 'programId' && (form.email || form.mobileNumber)) {
      checkDuplicate(value, form.bankId);
    } else if (field === 'bankId' && (form.email || form.mobileNumber)) {
      checkDuplicate(form.programId, value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.mobileNumber || !form.bankId || !form.programId) {
      toast.error('Full Name, Email, Mobile, Bank, and Program are required.');
      return;
    }

    if (dupCheck && dupCheck.isDuplicateProgram) {
      toast.error(
        `Duplicate lead prohibited: Candidate already has an active application (${dupCheck.duplicateApplication?.applicationNumber || ''}) for ${dupCheck.duplicateApplication?.programName || 'this program'}. Same candidate cannot be registered for the same program twice.`
      );
      return;
    }

    setIsLoading(true);
    try {
      const fd = new FormData();
      fd.append('fullName', form.fullName);
      fd.append('email', form.email);
      fd.append('mobileNumber', form.mobileNumber);
      if (form.dateOfBirth) fd.append('dateOfBirth', form.dateOfBirth);
      if (form.state) fd.append('state', form.state);
      if (form.stateCode) fd.append('stateCode', form.stateCode);
      if (form.district || form.city) {
        fd.append('district', form.district || form.city);
        fd.append('city', form.district || form.city);
      }
      fd.append('bankId', form.bankId);
      fd.append('programId', form.programId);
      if (form.vendorId) fd.append('vendorId', form.vendorId);
      if (user?.role === 'HR_EXECUTIVE') {
        fd.append('hrReferenceId', user.id);
      } else if (form.hrReferenceId) {
        fd.append('hrReferenceId', form.hrReferenceId);
      }
      if (!isCrackSelected && form.batchNumber) fd.append('batchNumber', form.batchNumber);
      fd.append('paymentRoute', form.paymentRoute);
      if (form.processType) fd.append('processType', form.processType);
      if (form.registrationDate) fd.append('registrationDate', form.registrationDate);
      const candIdToUse = existingCandidateId || dupCheck?.existingCandidate?.id;
      if (candIdToUse) fd.append('existingCandidateId', candIdToUse);
      if (form.resume) fd.append('resume', form.resume);

      await applicationsApi.register(fd);
      toast.success('Candidate registered successfully!');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to register candidate.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedProgram = programs.find((p) => p._id === form.programId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register New Candidate & Application" size="2xl">
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const target = e.target as HTMLElement;
            if (target.tagName === 'TEXTAREA' || target.getAttribute('type') === 'submit') return;
            e.preventDefault();
            const formEl = e.currentTarget;
            const focusables = Array.from(
              formEl.querySelectorAll<HTMLElement>(
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
        {/* Candidate Details */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Candidate Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Full Name *" placeholder="Enter full name" value={form.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)} required />
            <Input label="Mobile Number *" placeholder="10-digit mobile" value={form.mobileNumber}
              onChange={(e) => handleChange('mobileNumber', e.target.value)}
              onBlur={() => checkDuplicate()} required />
            <Input label="Email Address *" type="email" placeholder="candidate@email.com" value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => checkDuplicate()} required />
            <Input label="Date of Birth" type="date" value={form.dateOfBirth}
              onChange={(e) => handleChange('dateOfBirth', e.target.value)} />
            <IndiaLocationSelector
              selectedState={form.state}
              selectedDistrict={form.district || form.city}
              onStateChange={(state, stateCode) => {
                setForm((f) => ({ ...f, state, stateCode: stateCode || '', district: '', city: '' }));
              }}
              onDistrictChange={(district) => {
                setForm((f) => ({ ...f, district, city: district }));
              }}
            />
          </div>
        </div>

        {/* Duplicate Program Error (Strictly Prohibited for same Bank & Program) */}
        {dupCheck?.isDuplicateProgram && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3.5 flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-red-900 font-bold flex items-center gap-1.5">
                <span>🚫 Duplicate Lead Not Allowed For Same Program</span>
              </p>
              <p className="text-xs text-red-700 mt-1 leading-relaxed">
                Candidate <strong>{dupCheck.existingCandidate?.name || form.fullName}</strong> is already registered for <strong>{dupCheck.duplicateApplication?.programName || selectedProgram?.name}</strong> (Application #{dupCheck.duplicateApplication?.applicationNumber}). Duplicate leads for the same bank and program are strictly prohibited around the entire CRM.
              </p>
            </div>
          </div>
        )}

        {/* Existing Candidate Multi-Program Information (Allowed!) */}
        {dupCheck?.candidateExists && !dupCheck?.isDuplicateProgram && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3.5 flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-blue-900 font-bold flex items-center gap-1.5">
                <span>Existing Candidate Recognized – Allowed For New Program</span>
              </p>
              <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                Profile found for <strong>{dupCheck.existingCandidate?.name}</strong> ({dupCheck.existingCandidate?.mobile || dupCheck.existingCandidate?.email}).
                The candidate is permitted to be enrolled into this distinct program.
              </p>
              {dupCheck.existingApplications && dupCheck.existingApplications.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="text-[11px] text-blue-600 font-medium self-center">Existing program(s):</span>
                  {dupCheck.existingApplications.map((app: any) => (
                    <span
                      key={app.applicationNumber}
                      className="text-[11px] font-semibold text-blue-800 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200"
                    >
                      {app.programName} ({app.applicationNumber})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Application Details */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Application Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Bank *"
              options={banks.map((b) => ({ value: b._id, label: b.name }))}
              value={form.bankId}
              onChange={(e) => handleChange('bankId', e.target.value)}
              placeholder="Select Bank"
              required
            />
            <Select
              label="Program *"
              options={filteredPrograms.map((p) => ({
                value: p._id,
                label: p.bankName ? `${p.name} (${p.bankName})` : p.name,
              }))}
              value={form.programId}
              onChange={(e) => handleChange('programId', e.target.value)}
              placeholder={form.bankId ? 'Select Program' : 'Select Bank First'}
              disabled={!form.bankId}
              required
            />
            <Select
              label="Vendor"
              options={vendors.map((v) => ({ value: v._id, label: v.name }))}
              value={form.vendorId}
              onChange={(e) => handleChange('vendorId', e.target.value)}
              placeholder="Select Vendor"
            />
            {user?.role === 'HR_EXECUTIVE' ? (
              <div>
                <label className="fic-label">HR Reference</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={`${user.name} (Assigned to You)`}
                  className="fic-input bg-slate-100 text-slate-700 cursor-not-allowed font-medium"
                />
              </div>
            ) : (
              <Select
                label="HR Reference"
                options={hrList.map((h) => ({ value: h.id, label: `${h.name} (${h.employeeId})` }))}
                value={form.hrReferenceId}
                onChange={(e) => handleChange('hrReferenceId', e.target.value)}
                placeholder="Select HR"
              />
            )}
            <Select
              label="Process Type *"
              options={[
                { value: 'Manipal', label: '🎓 Manipal Process' },
                { value: 'Crack-ed', label: '⚡ Crack-ED Process' },
              ]}
              value={form.processType}
              onChange={(e) => handleChange('processType', e.target.value)}
              required
            />
            <Input
              label="Process / Registration Date (Optional)"
              type="date"
              value={form.registrationDate}
              onChange={(e) => handleChange('registrationDate', e.target.value)}
            />
            {!isCrackSelected && (
              <Input
                label="Batch Number"
                placeholder="Optional batch"
                value={form.batchNumber}
                onChange={(e) => handleChange('batchNumber', e.target.value)}
              />
            )}
            <div>
              <label className="fic-label">Payment Route</label>
              <div className="flex gap-3 mt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="paymentRoute"
                    value="ROUTE_A_VENDOR_LOAN"
                    checked={form.paymentRoute === 'ROUTE_A_VENDOR_LOAN'}
                    onChange={(e) => handleChange('paymentRoute', e.target.value)}
                  />
                  Vendor Loan
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="paymentRoute"
                    value="ROUTE_B_FULL_PAYMENT"
                    checked={form.paymentRoute === 'ROUTE_B_FULL_PAYMENT'}
                    onChange={(e) => handleChange('paymentRoute', e.target.value)}
                  />
                  Full Payment
                </label>
              </div>
              {form.paymentRoute === 'ROUTE_B_FULL_PAYMENT' && (
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />{' '}
                  {isCrackSelected
                    ? 'Direct full payment confirmed. No loan processing will be created.'
                    : 'Direct full payment confirmed. No vendor loan will be created.'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Program Info */}
        {selectedProgram && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div><span className="text-slate-500">Fee:</span> <span className="font-medium">₹{selectedProgram.enrollmentFeeAmount.toLocaleString('en-IN')}</span></div>
              <div><span className="text-slate-500">Trigger:</span> <span className="font-medium">{selectedProgram.paymentTrigger === 'BEFORE_INTERVIEW' ? 'Before Interview' : 'After Selection'}</span></div>
              <div><span className="text-slate-500">Loan:</span> <span className="font-medium">{selectedProgram.loanAvailable ? 'Available' : 'Not Available'}</span></div>
              <div><span className="text-slate-500">Campus:</span> <span className="font-medium">{selectedProgram.campusApplicable ? 'Applicable' : 'Not Applicable'}</span></div>
            </div>
          </div>
        )}

        {/* Resume Upload */}
        <div>
          <label className="fic-label">Resume (Optional – PDF, DOC, DOCX – Max 5MB)</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setForm((f) => ({ ...f, resume: e.target.files?.[0] || null }))}
            className="fic-input text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-fic-navy file:text-white file:text-xs file:cursor-pointer"
          />
          {form.resume && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> {form.resume.name}
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button
            type="submit"
            className="flex-1"
            isLoading={isLoading}
            disabled={isLoading || Boolean(dupCheck?.isDuplicateProgram)}
          >
            {dupCheck?.candidateExists && !dupCheck?.isDuplicateProgram
              ? 'Register Application (New Program)'
              : 'Register Candidate'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

