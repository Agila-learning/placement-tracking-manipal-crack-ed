import React, { useEffect, useState } from 'react';
import { Plus, Edit2, ToggleRight, ToggleLeft, UserCheck } from 'lucide-react';
import { usersApi } from '../../api/endpoints';
import { User, UserRole } from '../../types';
import { Button, Modal, Input, Select, Badge, EmptyState, LoadingSpinner, PageHeader, ConfirmDialog } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin / MD' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'HR_EXECUTIVE', label: 'HR Executive' },
  { value: 'ACCOUNTS', label: 'Accounts' },
];

const roleBadge: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  HR_EXECUTIVE: 'bg-teal-100 text-teal-700',
  ACCOUNTS: 'bg-amber-100 text-amber-700',
};

export const UsersPage = () => {
  const toast = useToast();
  const { user: currentUser, hasRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ employeeId: '', name: '', email: '', password: '', phone: '', role: 'HR_EXECUTIVE' as UserRole });
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<User | null>(null);
  const [filterRole, setFilterRole] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterRole) params.role = filterRole;
      if (search) params.search = search;
      const res = await usersApi.list(params);
      setUsers(res.data || []);
    } catch { toast.error('Failed to load users.'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, [filterRole, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ employeeId: '', name: '', email: '', password: '', phone: '', role: 'HR_EXECUTIVE' });
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ employeeId: u.employeeId, name: u.name, email: u.email, password: '', phone: u.phone || '', role: u.role });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing && (!form.employeeId || !form.email || !form.password)) {
      toast.error('Employee ID, Email and Password are required for new users.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { employeeId, email, ...updateData } = form;
        const targetId = editing.id || (editing as any)._id;
        await usersApi.update(targetId, updateData);
        toast.success('User updated!');
      } else {
        await usersApi.create(form);
        toast.success('User account created!');
      }
      setShowModal(false);
      load();
    } catch (err: any) { toast.error(err.message || 'Failed to save user.'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (u: User) => {
    try {
      const targetId = u.id || (u as any)._id;
      await usersApi.toggleStatus(targetId);
      toast.success(`Account ${u.status === 'ACTIVE' ? 'deactivated' : 'activated'}.`);
      load();
    } catch (err: any) { toast.error(err.message || 'Failed to update status.'); }
    finally { setConfirmToggle(null); }
  };

  const availableRoles = hasRole('SUPER_ADMIN') ? ROLES : ROLES.filter(r => r.value !== 'SUPER_ADMIN');

  return (
    <div className="space-y-5">
      <PageHeader title="HR & User Management" description="Manage employee accounts and access roles"
        actions={<Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>Add User</Button>} />

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <input className="fic-input pl-9 h-9 text-sm" placeholder="Search by name, email, ID..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="fic-input w-auto h-9 text-sm" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : users.length === 0 ? (
        <EmptyState title="No users found" icon={<UserCheck className="w-12 h-12" />}
          action={<Button onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>Add First User</Button>} />
      ) : (
        <div className="bg-white rounded-xl border border-fic-border overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr>
                {['Employee ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className="fic-table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const uId = u.id || (u as any)._id;
                const isSelf = uId === (currentUser?.id || (currentUser as any)?._id);
                return (
                  <tr key={uId} className={`hover:bg-slate-50 ${isSelf ? 'bg-blue-50/40' : ''}`}>
                    <td className="fic-table-cell font-mono text-xs text-fic-navy">{u.employeeId}</td>
                    <td className="fic-table-cell font-medium text-slate-800">
                      {u.name} {isSelf && <span className="text-xs text-blue-500 font-normal ml-1">(you)</span>}
                    </td>
                    <td className="fic-table-cell text-slate-500 text-xs">{u.email}</td>
                    <td className="fic-table-cell text-slate-500 text-xs">{u.phone || '-'}</td>
                    <td className="fic-table-cell">
                      <Badge className={roleBadge[u.role]}>{u.role.replace('_', ' ')}</Badge>
                    </td>
                    <td className="fic-table-cell">
                      <Badge className={u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>{u.status}</Badge>
                    </td>
                    <td className="fic-table-cell text-xs text-slate-400">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}
                    </td>
                    <td className="fic-table-cell">
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" leftIcon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => openEdit(u)}>Edit</Button>
                        {!isSelf && (
                          <Button size="sm" variant="ghost" onClick={() => setConfirmToggle(u)}
                            leftIcon={u.status === 'ACTIVE' ? <ToggleRight className="w-3.5 h-3.5 text-green-600" /> : <ToggleLeft className="w-3.5 h-3.5" />}>
                            {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit User Account' : 'Create User Account'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Employee ID *" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value.toUpperCase() }))}
              placeholder="e.g. FIC-HR-001" required disabled={!!editing} />
            <Input label="Full Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Employee name" required />
          </div>
          <Input label="Official Email *" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="employee@forgeindia.com" required disabled={!!editing} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={editing ? 'New Password (leave blank to keep)' : 'Password *'} type="password"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder={editing ? 'Leave blank to keep current' : 'Min 8 characters'} required={!editing} />
            <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Contact number" />
          </div>
          <Select label="Role *" options={availableRoles} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))} />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button className="flex-1" type="submit" isLoading={saving}>{editing ? 'Update' : 'Create'} Account</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!confirmToggle} onClose={() => setConfirmToggle(null)}
        onConfirm={() => confirmToggle && handleToggle(confirmToggle)}
        title={`${confirmToggle?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} Account`}
        message={`Are you sure you want to ${confirmToggle?.status === 'ACTIVE' ? 'deactivate' : 'activate'} "${confirmToggle?.name}"? ${confirmToggle?.status === 'ACTIVE' ? 'They will not be able to log in.' : ''}`}
        confirmLabel={confirmToggle?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        confirmVariant={confirmToggle?.status === 'ACTIVE' ? 'danger' : 'primary'}
      />
    </div>
  );
};

