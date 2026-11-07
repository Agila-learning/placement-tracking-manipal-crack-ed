import React, { useEffect, useState } from 'react';
import { Plus, Edit2, ToggleLeft, ToggleRight, Landmark } from 'lucide-react';
import { banksApi } from '../../api/endpoints';
import { Bank } from '../../types';
import { Button, Modal, Input, Textarea, Badge, EmptyState, LoadingSpinner, PageHeader, ConfirmDialog } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';

export const BanksPage = () => {
  const toast = useToast();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Bank | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<Bank | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await banksApi.list();
      setBanks(res.data || []);
    } catch { toast.error('Failed to load banks.'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', code: '', description: '' }); setShowModal(true); };
  const openEdit = (bank: Bank) => { setEditing(bank); setForm({ name: bank.name, code: bank.code, description: bank.description || '' }); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) { toast.error('Name and Code are required.'); return; }
    setSaving(true);
    try {
      if (editing) { await banksApi.update(editing._id, form); toast.success('Bank updated!'); }
      else { await banksApi.create(form); toast.success('Bank created!'); }
      setShowModal(false); load();
    } catch (err: any) { toast.error(err.message || 'Failed to save bank.'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (bank: Bank) => {
    try {
      await banksApi.toggleStatus(bank._id);
      toast.success(`Bank marked as ${bank.status === 'ACTIVE' ? 'Inactive' : 'Active'}.`);
      load();
    } catch { toast.error('Failed to update bank status.'); }
    finally { setConfirmToggle(null); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Bank Master" description="Manage bank configurations"
        actions={<Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>Add Bank</Button>} />
      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : banks.length === 0 ? (
        <EmptyState title="No banks configured" icon={<Landmark className="w-12 h-12" />}
          action={<Button onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>Add First Bank</Button>} />
      ) : (
        <div className="bg-white rounded-xl border border-fic-border overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr>
                {['Bank Name', 'Code', 'Description', 'Status', 'Actions'].map(h => (
                  <th key={h} className="fic-table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {banks.map(bank => (
                <tr key={bank._id} className="hover:bg-slate-50">
                  <td className="fic-table-cell font-medium text-slate-800">{bank.name}</td>
                  <td className="fic-table-cell"><span className="font-mono text-xs bg-blue-50 text-fic-navy px-2 py-0.5 rounded">{bank.code}</span></td>
                  <td className="fic-table-cell text-slate-500">{bank.description || '-'}</td>
                  <td className="fic-table-cell">
                    <Badge className={bank.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>{bank.status}</Badge>
                  </td>
                  <td className="fic-table-cell">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" leftIcon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => openEdit(bank)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmToggle(bank)}
                        leftIcon={bank.status === 'ACTIVE' ? <ToggleRight className="w-3.5 h-3.5 text-green-600" /> : <ToggleLeft className="w-3.5 h-3.5 text-slate-400" />}>
                        {bank.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Bank' : 'Add New Bank'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Bank Name *" placeholder="e.g. HDFC Life" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Bank Code *" placeholder="e.g. HDFC-LIFE" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required disabled={!!editing} hint="Unique identifier. Cannot be changed after creation." />
          <Textarea label="Description" placeholder="Optional description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button className="flex-1" type="submit" isLoading={saving}>{editing ? 'Update' : 'Create'} Bank</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmToggle}
        onClose={() => setConfirmToggle(null)}
        onConfirm={() => confirmToggle && handleToggle(confirmToggle)}
        title={`${confirmToggle?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} Bank`}
        message={`Are you sure you want to ${confirmToggle?.status === 'ACTIVE' ? 'deactivate' : 'activate'} "${confirmToggle?.name}"?`}
        confirmLabel={confirmToggle?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        confirmVariant={confirmToggle?.status === 'ACTIVE' ? 'danger' : 'primary'}
      />
    </div>
  );
};

