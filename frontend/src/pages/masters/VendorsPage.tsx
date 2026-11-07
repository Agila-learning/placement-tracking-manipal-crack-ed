import React, { useEffect, useState } from 'react';
import { Plus, Edit2, ToggleRight, ToggleLeft, Store } from 'lucide-react';
import { vendorsApi } from '../../api/endpoints';
import { Vendor } from '../../types';
import { Button, Modal, Input, Textarea, Badge, EmptyState, LoadingSpinner, PageHeader, ConfirmDialog } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';

export const VendorsPage = () => {
  const toast = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState({ name: '', code: '', contactPerson: '', email: '', phone: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<Vendor | null>(null);

  const load = async () => {
    setIsLoading(true);
    try { const res = await vendorsApi.list(); setVendors(res.data || []); }
    catch { toast.error('Failed to load vendors.'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', code: '', contactPerson: '', email: '', phone: '', notes: '' }); setShowModal(true); };
  const openEdit = (v: Vendor) => {
    setEditing(v);
    setForm({ name: v.name, code: v.code, contactPerson: v.contactPerson || '', email: v.email || '', phone: v.phone || '', notes: (v as any).notes || '' });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) { toast.error('Name and Code are required.'); return; }
    setSaving(true);
    try {
      if (editing) { await vendorsApi.update(editing._id, form); toast.success('Vendor updated!'); }
      else { await vendorsApi.create(form); toast.success('Vendor created!'); }
      setShowModal(false); load();
    } catch (err: any) { toast.error(err.message || 'Failed to save vendor.'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (v: Vendor) => {
    try {
      await vendorsApi.toggleStatus(v._id);
      toast.success(`Vendor ${v.status === 'ACTIVE' ? 'deactivated' : 'activated'}.`);
      load();
    } catch { toast.error('Failed to update status.'); }
    finally { setConfirmToggle(null); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Vendor Master" description="Manage placement vendors"
        actions={<Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>Add Vendor</Button>} />
      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : vendors.length === 0 ? (
        <EmptyState title="No vendors configured" icon={<Store className="w-12 h-12" />}
          action={<Button onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>Add First Vendor</Button>} />
      ) : (
        <div className="bg-white rounded-xl border border-fic-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  {['Vendor Name', 'Code', 'Contact Person', 'Email', 'Applications', 'Status', 'Actions'].map(h => (
                    <th key={h} className="fic-table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendors.map(v => (
                  <tr key={v._id} className="hover:bg-slate-50">
                    <td className="fic-table-cell font-medium text-slate-800">{v.name}</td>
                    <td className="fic-table-cell"><span className="font-mono text-xs bg-blue-50 text-fic-navy px-2 py-0.5 rounded">{v.code}</span></td>
                    <td className="fic-table-cell text-slate-600">{v.contactPerson || '-'}</td>
                    <td className="fic-table-cell text-slate-500 text-xs">{v.email || '-'}</td>
                    <td className="fic-table-cell">
                      <span className="font-semibold text-fic-navy">{v.candidateCount || 0}</span>
                    </td>
                    <td className="fic-table-cell">
                      <Badge className={v.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>{v.status}</Badge>
                    </td>
                    <td className="fic-table-cell">
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" leftIcon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => openEdit(v)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmToggle(v)}
                          leftIcon={v.status === 'ACTIVE' ? <ToggleRight className="w-3.5 h-3.5 text-green-600" /> : <ToggleLeft className="w-3.5 h-3.5" />}>
                          {v.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Vendor' : 'Add Vendor'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Vendor Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Manipal" required />
          <Input label="Vendor Code *" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. MANIPAL" required disabled={!!editing} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Contact Person" value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="Contact name" />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="vendor@email.com" />
          </div>
          <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Contact number" />
          <Textarea label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button className="flex-1" type="submit" isLoading={saving}>{editing ? 'Update' : 'Create'} Vendor</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmToggle} onClose={() => setConfirmToggle(null)}
        onConfirm={() => confirmToggle && handleToggle(confirmToggle)}
        title={`${confirmToggle?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} Vendor`}
        message={`Are you sure you want to ${confirmToggle?.status === 'ACTIVE' ? 'deactivate' : 'activate'} "${confirmToggle?.name}"?`}
        confirmLabel={confirmToggle?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        confirmVariant={confirmToggle?.status === 'ACTIVE' ? 'danger' : 'primary'}
      />
    </div>
  );
};

