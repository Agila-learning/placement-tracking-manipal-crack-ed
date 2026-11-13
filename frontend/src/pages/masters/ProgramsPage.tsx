import React, { useEffect, useState } from 'react';
import { Plus, Edit2, ToggleRight, ToggleLeft, Building2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { programsApi, banksApi } from '../../api/endpoints';
import { Program, Bank } from '../../types';
import { Button, Modal, Input, Select, Badge, EmptyState, LoadingSpinner, PageHeader, ConfirmDialog } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';

const DEFAULT_ROUNDS = [
  { roundId: 'r_l1', roundName: 'L1', isMandatory: true, order: 1, defaultMode: 'Online' },
  { roundId: 'r_l2', roundName: 'L2', isMandatory: true, order: 2, defaultMode: 'Online' },
  { roundId: 'r_mock', roundName: 'Mock', isMandatory: false, order: 3, defaultMode: 'Online' },
];

export const ProgramsPage = () => {
  const toast = useToast();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Program | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<Program | null>(null);
  const [filterBank, setFilterBank] = useState('');
  const [expandedRounds, setExpandedRounds] = useState(false);

  const [form, setForm] = useState<any>({
    bankId: '', name: '', code: '', designation: '', salaryPackage: '', location: '',
    enrollmentFeeAmount: '', paymentTrigger: 'AFTER_SELECTION', isRefundable: true,
    loanAvailable: true, campusApplicable: true, batchNumber: '', status: 'ACTIVE',
    interviewRoundsConfig: [...DEFAULT_ROUNDS],
  });

  const load = async () => {
    setIsLoading(true);
    try {
      const [p, b] = await Promise.all([programsApi.list(), banksApi.list()]);
      setPrograms(p.data || []);
      setBanks((b.data || []).filter(item => item.status !== 'INACTIVE'));
    } catch { toast.error('Failed to load programs.'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ bankId: '', name: '', code: '', designation: '', salaryPackage: '', location: '', enrollmentFeeAmount: '', paymentTrigger: 'AFTER_SELECTION', isRefundable: true, loanAvailable: true, campusApplicable: true, batchNumber: '', status: 'ACTIVE', interviewRoundsConfig: [...DEFAULT_ROUNDS] });
    setShowModal(true);
  };

  const openEdit = (p: Program) => {
    setEditing(p);
    const bankId = p.bankId && typeof p.bankId === 'object' ? (p.bankId as any)._id : (p.bankId || '');
    setForm({
      bankId, name: p.name, code: p.code, designation: p.designation || '', salaryPackage: p.salaryPackage || '',
      location: p.location || '', enrollmentFeeAmount: String(p.enrollmentFeeAmount || 0),
      paymentTrigger: p.paymentTrigger, isRefundable: p.isRefundable, loanAvailable: p.loanAvailable,
      campusApplicable: p.campusApplicable, batchNumber: p.batchNumber || '', status: p.status,
      interviewRoundsConfig: p.interviewRoundsConfig?.length ? [...p.interviewRoundsConfig] : [...DEFAULT_ROUNDS],
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bankId || !form.name || !form.code) { toast.error('Bank, Name and Code are required.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, enrollmentFeeAmount: Number(form.enrollmentFeeAmount) || 0 };
      if (editing) { await programsApi.update(editing._id, payload); toast.success('Program updated!'); }
      else { await programsApi.create(payload); toast.success('Program created!'); }
      setShowModal(false); load();
    } catch (err: any) { toast.error(err.message || 'Failed to save program.'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (p: Program) => {
    try {
      await programsApi.toggleStatus(p._id);
      toast.success(`Program ${p.status === 'ACTIVE' ? 'deactivated' : 'activated'}.`);
      load();
    } catch { toast.error('Failed to update status.'); }
    finally { setConfirmToggle(null); }
  };

  const addRound = () => {
    const nextOrder = form.interviewRoundsConfig.length + 1;
    setForm((f: any) => ({
      ...f, interviewRoundsConfig: [...f.interviewRoundsConfig, {
        roundId: `r_custom_${Date.now()}`, roundName: '', isMandatory: false, order: nextOrder, defaultMode: 'Online'
      }]
    }));
  };

  const removeRound = (idx: number) => {
    setForm((f: any) => ({ ...f, interviewRoundsConfig: f.interviewRoundsConfig.filter((_: any, i: number) => i !== idx) }));
  };

  const updateRound = (idx: number, field: string, value: any) => {
    setForm((f: any) => {
      const rounds = [...f.interviewRoundsConfig];
      rounds[idx] = { ...rounds[idx], [field]: value };
      return { ...f, interviewRoundsConfig: rounds };
    });
  };

  const filtered = filterBank ? programs.filter(p => {
    const bid = typeof p.bankId === 'object' ? (p.bankId as any)._id : p.bankId;
    return bid === filterBank;
  }) : programs;

  return (
    <div className="space-y-5">
      <PageHeader title="Program Master" description="Configure bank programs and interview rounds"
        actions={<Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>Add Program</Button>} />

      <div className="flex gap-3">
        <select className="fic-input w-auto text-sm" value={filterBank} onChange={e => setFilterBank(e.target.value)}>
          <option value="">All Banks</option>
          {banks.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No programs configured" icon={<Building2 className="w-12 h-12" />}
          action={<Button onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>Add First Program</Button>} />
      ) : (
        <div className="bg-white rounded-xl border border-fic-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  {['Program Name', 'Bank', 'Code', 'Designation', 'Fee (₹)', 'Rounds', 'Status', 'Actions'].map(h => (
                    <th key={h} className="fic-table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td className="fic-table-cell font-medium text-slate-800">{p.name}</td>
                    <td className="fic-table-cell text-slate-600">{p.bankName}</td>
                    <td className="fic-table-cell"><span className="font-mono text-xs bg-blue-50 text-fic-navy px-2 py-0.5 rounded">{p.code}</span></td>
                    <td className="fic-table-cell text-slate-500 text-xs">{p.designation || '-'}</td>
                    <td className="fic-table-cell font-medium text-slate-700">₹{p.enrollmentFeeAmount?.toLocaleString('en-IN')}</td>
                    <td className="fic-table-cell">
                      <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                        {p.interviewRoundsConfig?.length || 0} rounds
                      </span>
                    </td>
                    <td className="fic-table-cell">
                      <Badge className={p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>{p.status}</Badge>
                    </td>
                    <td className="fic-table-cell">
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" leftIcon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => openEdit(p)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmToggle(p)}
                          leftIcon={p.status === 'ACTIVE' ? <ToggleRight className="w-3.5 h-3.5 text-green-600" /> : <ToggleLeft className="w-3.5 h-3.5" />}>
                          {p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Program' : 'Add Program'} size="2xl">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Bank *" options={banks.map(b => ({ value: b._id, label: b.name }))} value={form.bankId}
              onChange={e => setForm((f: any) => ({ ...f, bankId: e.target.value }))} placeholder="Select Bank" required />
            <Input label="Program Name *" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="e.g. HDFC Life Advisor" required />
            <Input label="Program Code *" value={form.code} onChange={e => setForm((f: any) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. HDFC-LIFE-AP" required disabled={!!editing} />
            <Input label="Designation" value={form.designation} onChange={e => setForm((f: any) => ({ ...f, designation: e.target.value }))} placeholder="e.g. Sales Advisor" />
            <Input label="Salary Package" value={form.salaryPackage} onChange={e => setForm((f: any) => ({ ...f, salaryPackage: e.target.value }))} placeholder="e.g. 3.5 LPA" />
            <Input label="Location" value={form.location} onChange={e => setForm((f: any) => ({ ...f, location: e.target.value }))} placeholder="e.g. Pan India" />
            <Input label="Enrollment Fee (₹)" type="number" value={form.enrollmentFeeAmount} onChange={e => setForm((f: any) => ({ ...f, enrollmentFeeAmount: e.target.value }))} placeholder="0" />
            <Select label="Payment Trigger" options={[{ value: 'AFTER_SELECTION', label: 'After Selection' }, { value: 'BEFORE_INTERVIEW', label: 'Before Interview' }]}
              value={form.paymentTrigger} onChange={e => setForm((f: any) => ({ ...f, paymentTrigger: e.target.value }))} />
            <Input label="Batch Number" value={form.batchNumber} onChange={e => setForm((f: any) => ({ ...f, batchNumber: e.target.value }))} placeholder="Optional batch" />
          </div>

          <div className="flex gap-6">
            {[{ key: 'isRefundable', label: 'Fee Refundable' }, { key: 'loanAvailable', label: 'Loan Available' }, { key: 'campusApplicable', label: 'Campus Applicable' }].map(opt => (
              <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form[opt.key]} onChange={e => setForm((f: any) => ({ ...f, [opt.key]: e.target.checked }))} className="rounded" />
                {opt.label}
              </label>
            ))}
          </div>

          {/* Interview Rounds */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <button type="button" className="text-sm font-medium text-slate-700 flex items-center gap-1" onClick={() => setExpandedRounds(!expandedRounds)}>
                Interview Rounds ({form.interviewRoundsConfig.length})
                {expandedRounds ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedRounds && (
                <Button type="button" size="sm" variant="secondary" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={addRound}>Add Round</Button>
              )}
            </div>
            {expandedRounds && (
              <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                {form.interviewRoundsConfig.map((r: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-400 w-5">{idx + 1}.</span>
                    <input className="fic-input text-sm flex-1" placeholder="Round Name" value={r.roundName}
                      onChange={e => updateRound(idx, 'roundName', e.target.value)} />
                    <select className="fic-input text-sm w-28" value={r.defaultMode}
                      onChange={e => updateRound(idx, 'defaultMode', e.target.value)}>
                      {['Online', 'Offline', 'Telephonic'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-slate-600 whitespace-nowrap">
                      <input type="checkbox" checked={r.isMandatory} onChange={e => updateRound(idx, 'isMandatory', e.target.checked)} /> Mandatory
                    </label>
                    {form.interviewRoundsConfig.length > 1 && (
                      <button type="button" onClick={() => removeRound(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button className="flex-1" type="submit" isLoading={saving}>{editing ? 'Update' : 'Create'} Program</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!confirmToggle} onClose={() => setConfirmToggle(null)}
        onConfirm={() => confirmToggle && handleToggle(confirmToggle)}
        title={`${confirmToggle?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} Program`}
        message={`Are you sure you want to ${confirmToggle?.status === 'ACTIVE' ? 'deactivate' : 'activate'} "${confirmToggle?.name}"?`}
        confirmLabel={confirmToggle?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        confirmVariant={confirmToggle?.status === 'ACTIVE' ? 'danger' : 'primary'}
      />
    </div>
  );
};

