import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { auditApi } from '../../api/endpoints';
import { ActivityLog } from '../../types';
import { Button, EmptyState, LoadingSpinner, PageHeader } from '../../components/ui';
import { formatDateTime } from '../../utils/statusHelpers';
import { useToast } from '../../contexts/ToastContext';

const ENTITY_TYPES = ['CANDIDATE', 'APPLICATION', 'INTERVIEW', 'PAYMENT', 'LOAN', 'CAMPUS', 'USER', 'MASTER_DATA', 'AUTH', 'SECURITY'];

const entityBadge: Record<string, string> = {
  AUTH: 'bg-blue-100 text-blue-700',
  SECURITY: 'bg-red-100 text-red-700',
  APPLICATION: 'bg-purple-100 text-purple-700',
  INTERVIEW: 'bg-cyan-100 text-cyan-700',
  PAYMENT: 'bg-green-100 text-green-700',
  LOAN: 'bg-teal-100 text-teal-700',
  CAMPUS: 'bg-orange-100 text-orange-700',
  USER: 'bg-indigo-100 text-indigo-700',
  MASTER_DATA: 'bg-slate-100 text-slate-600',
  CANDIDATE: 'bg-amber-100 text-amber-700',
};

export const AuditLogsPage = () => {
  const toast = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ entityType: '', action: '', search: '', fromDate: '', toDate: '' });

  const load = async (pg = 1) => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: String(pg), limit: '100' };
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.action) params.action = filters.action;
      if (filters.search) params.search = filters.search;
      if (filters.fromDate) params.fromDate = filters.fromDate;
      if (filters.toDate) params.toDate = filters.toDate;
      const res = await auditApi.list(params);
      setLogs(res.data || []);
      setTotal(res.meta?.total || 0);
      setPage(pg);
    } catch { toast.error('Failed to load audit logs.'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => load(1), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Logs" description={`${total} log entries`}
        actions={<Button variant="secondary" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => load(1)}>Refresh</Button>} />

      <div className="bg-white rounded-xl border border-fic-border p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input className="fic-input text-sm h-9" placeholder="Search actor, action, candidate..."
            value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          <select className="fic-input text-sm h-9" value={filters.entityType} onChange={e => setFilters(f => ({ ...f, entityType: e.target.value }))}>
            <option value="">All Categories</option>
            {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="fic-input text-sm h-9" placeholder="Filter by action..." value={filters.action}
            onChange={e => setFilters(f => ({ ...f, action: e.target.value }))} />
          <input type="date" className="fic-input text-sm h-9" value={filters.fromDate}
            onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))} />
          <input type="date" className="fic-input text-sm h-9" value={filters.toDate}
            onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : logs.length === 0 ? (
        <EmptyState title="No audit logs found" icon={<Shield className="w-12 h-12" />} description="Activity logs will appear here as the system is used." />
      ) : (
        <div className="bg-white rounded-xl border border-fic-border overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr>
                {['Timestamp', 'Actor', 'Role', 'Category', 'Action', 'Target', 'Details'].map(h => (
                  <th key={h} className="fic-table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log._id} className="hover:bg-slate-50">
                  <td className="fic-table-cell text-xs text-slate-500 whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                  <td className="fic-table-cell text-sm font-medium text-slate-700">{log.actorName}</td>
                  <td className="fic-table-cell text-xs text-slate-400">{log.actorRole?.replace(/_/g, ' ')}</td>
                  <td className="fic-table-cell">
                    <span className={`status-badge text-xs ${entityBadge[log.entityType] || 'bg-gray-100 text-gray-500'}`}>{log.entityType}</span>
                  </td>
                  <td className="fic-table-cell text-xs font-mono text-slate-700">{log.action?.replace(/_/g, ' ')}</td>
                  <td className="fic-table-cell text-xs text-slate-500">{log.candidateName || log.applicationNumber || '-'}</td>
                  <td className="fic-table-cell text-xs text-slate-400 max-w-xs truncate">{log.details || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > 100 && (
            <div className="flex justify-between items-center px-4 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">Showing {Math.min(100, logs.length)} of {total} entries</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => load(page - 1)}>Prev</Button>
                <Button size="sm" variant="secondary" disabled={page * 100 >= total} onClick={() => load(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

