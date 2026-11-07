import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Filter, Download, ChevronLeft, ChevronRight,
  RefreshCw, Eye, Users, Edit2
} from 'lucide-react';
import { applicationsApi, banksApi, vendorsApi, programsApi, usersApi } from '../../api/endpoints';
import { Application, Bank, Vendor, Program, User, ALL_APPLICATION_STATUSES } from '../../types';
import { appStatusBadge, interviewStatusBadge, paymentStatusBadge, loanStatusBadge, campusStatusBadge, formatDate } from '../../utils/statusHelpers';
import { Badge, Button, Select, EmptyState, LoadingSpinner, PageHeader } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { RegisterCandidateModal } from './RegisterCandidateModal';

export const CandidatesPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { hasRole } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showRegister, setShowRegister] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [filterBank, setFilterBank] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [filterHR, setFilterHR] = useState('');
  const [filterStatus, setFilterStatus] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('status') || '';
  });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Master data for filter dropdowns
  const [banks, setBanks] = useState<Bank[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [hrList, setHrList] = useState<User[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const loadMasters = useCallback(async () => {
    try {
      const [b, v, p, hr] = await Promise.all([
        banksApi.list({ status: 'ACTIVE' }),
        vendorsApi.list({ status: 'ACTIVE' }),
        programsApi.list({ status: 'ACTIVE' }),
        usersApi.hrReferences(),
      ]);
      setBanks(b.data || []);
      setVendors(v.data || []);
      setPrograms(p.data || []);
      setHrList(hr.data || []);
    } catch {}
  }, []);

  const loadApplications = useCallback(async (pg = 1) => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: String(pg), limit: '50' };
      if (search) params.search = search;
      if (filterBank) params.bank = filterBank;
      if (filterProgram) params.program = filterProgram;
      if (filterVendor) params.vendor = filterVendor;
      if (filterHR) params.hr = filterHR;
      if (filterStatus) params.status = filterStatus;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const res = await applicationsApi.list(params);
      if (res.success) {
        setApplications(res.data || []);
        setTotal(res.meta?.total || 0);
        setTotalPages(res.meta?.totalPages || 1);
        setPage(pg);
      }
    } catch {
      toast.error('Failed to load candidates.');
    } finally {
      setIsLoading(false);
    }
  }, [search, filterBank, filterProgram, filterVendor, filterHR, filterStatus, fromDate, toDate]);

  useEffect(() => {
    loadMasters();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadApplications(1), 350);
    return () => clearTimeout(timer);
  }, [search, filterBank, filterProgram, filterVendor, filterHR, filterStatus, fromDate, toDate]);

  const clearFilters = () => {
    setSearch('');
    setFilterBank('');
    setFilterProgram('');
    setFilterVendor('');
    setFilterHR('');
    setFilterStatus('');
    setFromDate('');
    setToDate('');
  };

  // Collect all unique round names from loaded data
  const allRoundNames = Array.from(
    new Set(
      applications.flatMap((a) => a.interviewRounds?.map((r) => r.roundName) || [])
    )
  );

  const handleExport = () => {
    const params: Record<string, string> = {};
    if (filterBank) params.bank = filterBank;
    if (filterProgram) params.program = filterProgram;
    if (filterVendor) params.vendor = filterVendor;
    if (filterStatus) params.status = filterStatus;
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    const url = `/api/reports/interview-status/export?${new URLSearchParams(params).toString()}`;
    const token = localStorage.getItem('fic_token');
    window.open(`${url}&_t=${token}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Candidate Tracking"
        description={`${total} application${total !== 1 ? 's' : ''} found`}
        actions={
          <>
            <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => loadApplications(page)}>
              Refresh
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExport}>
              Export
            </Button>
            {hasRole('SUPER_ADMIN', 'ADMIN', 'HR_EXECUTIVE') && (
              <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setShowRegister(true)}>
                Add Candidate
              </Button>
            )}
          </>
        }
      />

      {/* Quick Stage Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { label: 'All Candidates', value: '' },
          { label: '🎤 In Progress', value: 'Interview in Progress' },
          { label: '🏆 Bank Selected', value: 'Selected' },
          { label: '⏸️ On Hold', value: 'On Hold' },
          { label: '🏫 Arrived in Campus', value: 'Arrived in Campus' },
          { label: '❌ Rejected / Dropped', value: 'Rejected' },
        ].map((tab) => {
          const isActive = filterStatus === tab.value;
          return (
            <button
              key={tab.label}
              onClick={() => {
                setFilterStatus(tab.value);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-fic-navy text-white border-fic-navy shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-fic-border p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="fic-input pl-9 h-9 text-sm w-full"
                placeholder="Search name, app no., email, mobile..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadApplications(1)}
              />
            </div>
            <Button size="sm" leftIcon={<Search className="w-3.5 h-3.5" />} onClick={() => loadApplications(1)}>
              Search
            </Button>
          </div>
          <select
            className="fic-input w-auto h-9 text-sm font-medium"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
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
              <option value="On Hold">⏸️ On Hold (Action Required)</option>
              <option value="Rejected">❌ Rejected</option>
              <option value="Dropped">⚠️ Dropped</option>
              <option value="Not Interested">🚫 Not Interested</option>
            </optgroup>
          </select>
          <Button variant="secondary" size="sm" leftIcon={<Filter className="w-3.5 h-3.5" />}
            onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? 'Hide' : 'More'} Filters
          </Button>
          {(search || filterBank || filterProgram || filterVendor || filterHR || filterStatus || fromDate || toDate) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
            <select className="fic-input text-sm h-9" value={filterBank} onChange={(e) => setFilterBank(e.target.value)}>
              <option value="">All Banks</option>
              {banks.map((b) => <option key={b._id} value={b.name}>{b.name}</option>)}
            </select>
            <select className="fic-input text-sm h-9" value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)}>
              <option value="">All Programs</option>
              {programs.map((p) => <option key={p._id} value={p.name}>{p.name}</option>)}
            </select>
            <select className="fic-input text-sm h-9" value={filterVendor} onChange={(e) => setFilterVendor(e.target.value)}>
              <option value="">All Vendors</option>
              {vendors.map((v) => <option key={v._id} value={v.name}>{v.name}</option>)}
            </select>
            <select className="fic-input text-sm h-9" value={filterHR} onChange={(e) => setFilterHR(e.target.value)}>
              <option value="">All HR</option>
              {hrList.map((h) => <option key={h.id} value={h.name}>{h.name}</option>)}
            </select>
            <input type="date" className="fic-input text-sm h-9" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="From Date" />
            <input type="date" className="fic-input text-sm h-9" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="To Date" />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-fic-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : applications.length === 0 ? (
          <EmptyState
            title="No candidates found"
            description="Try adjusting your filters or add a new candidate."
            icon={<Users className="w-12 h-12" />}
            action={
              hasRole('SUPER_ADMIN', 'ADMIN', 'HR_EXECUTIVE') ? (
                <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowRegister(true)}>
                  Add First Candidate
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="fic-table-header sticky-header-1 w-40">Candidate</th>
                  <th className="fic-table-header sticky-header-2 w-36">App No.</th>
                  <th className="fic-table-header">Bank</th>
                  <th className="fic-table-header">Program</th>
                  <th className="fic-table-header">Vendor</th>
                  <th className="fic-table-header">HR Ref</th>
                  <th className="fic-table-header">Status</th>
                  {allRoundNames.map((rn) => (
                    <th key={rn} className="fic-table-header">{rn}</th>
                  ))}
                  <th className="fic-table-header">Payment</th>
                  <th className="fic-table-header">Loan</th>
                  <th className="fic-table-header">Campus</th>
                  <th className="fic-table-header">Reg. Date</th>
                  <th className="fic-table-header">Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => {
                  const roundMap: Record<string, string> = {};
                  app.interviewRounds?.forEach((r) => { roundMap[r.roundName] = r.currentStatus; });

                  return (
                    <tr
                      key={app._id}
                      className="fic-table-row"
                      onClick={() => navigate(`/candidates/${app._id}`)}
                    >
                      <td className="fic-table-cell sticky-col-1 w-40">
                        <div className="font-medium text-slate-800 text-sm truncate max-w-36">{app.candidateName}</div>
                        <div className="text-xs text-slate-400 truncate">{app.candidateEmail}</div>
                      </td>
                      <td className="fic-table-cell sticky-col-2 w-36">
                        <span className="font-mono text-xs text-fic-navy bg-blue-50 px-1.5 py-0.5 rounded">
                          {app.applicationNumber}
                        </span>
                      </td>
                      <td className="fic-table-cell">
                        <span className="text-xs text-slate-700 whitespace-nowrap">{app.bankName}</span>
                      </td>
                      <td className="fic-table-cell">
                        <span className="text-xs text-slate-600 max-w-32 block truncate">{app.programName}</span>
                      </td>
                      <td className="fic-table-cell">
                        <span className="text-xs text-slate-600">{app.vendorName}</span>
                      </td>
                      <td className="fic-table-cell">
                        <span className="text-xs text-slate-600">{app.hrReferenceName}</span>
                      </td>
                      <td className="fic-table-cell">
                        <Badge className={appStatusBadge[app.overallStatus] || 'bg-gray-100 text-gray-500'}>
                          {app.overallStatus}
                        </Badge>
                        {app.overallStatus === 'On Hold' && app.remarks && (
                          <div className="text-[10px] text-amber-700 font-semibold truncate max-w-[130px] mt-1" title={app.remarks}>
                            {app.remarks.includes('[ON HOLD:')
                              ? app.remarks.split(']')[0].replace('[ON HOLD:', '⏸️')
                              : `⏸️ ${app.remarks}`}
                          </div>
                        )}
                      </td>
                      {allRoundNames.map((rn) => {
                        const st = roundMap[rn] as any;
                        return (
                          <td key={rn} className="fic-table-cell">
                            {st ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/candidates/${app._id}?tab=interviews`); }}
                                className="focus:outline-none"
                              >
                                <Badge className={(interviewStatusBadge as any)[st] || 'bg-gray-100 text-gray-400 cursor-pointer hover:opacity-80'}>
                                  {st}
                                </Badge>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="fic-table-cell">
                        {app.payment ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/candidates/${app._id}?tab=payments`); }}
                            className="focus:outline-none"
                          >
                            <Badge className={paymentStatusBadge[app.payment.paymentStatus] || 'bg-gray-100 text-gray-400 cursor-pointer hover:opacity-80'}>
                              {app.payment.paymentStatus}
                            </Badge>
                          </button>
                        ) : <span className="text-xs text-slate-300">-</span>}
                      </td>
                      <td className="fic-table-cell">
                        {app.loan ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/candidates/${app._id}?tab=loan-campus`); }}
                            className="focus:outline-none"
                          >
                            <Badge className={loanStatusBadge[app.loan.loanStatus] || 'bg-gray-100 text-gray-400'}>
                              {app.loan.loanStatus}
                            </Badge>
                          </button>
                        ) : <span className="text-xs text-slate-300">-</span>}
                      </td>
                      <td className="fic-table-cell">
                        {app.campus ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/candidates/${app._id}?tab=loan-campus`); }}
                            className="focus:outline-none"
                          >
                            <Badge className={campusStatusBadge[app.campus.campusStatus] || 'bg-gray-100 text-gray-400'}>
                              {app.campus.campusStatus}
                            </Badge>
                          </button>
                        ) : <span className="text-xs text-slate-300">-</span>}
                      </td>
                      <td className="fic-table-cell whitespace-nowrap text-xs text-slate-500">
                        {formatDate(app.registrationDate)}
                      </td>
                      <td className="fic-table-cell" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => navigate(`/candidates/${app._id}`)}
                          >
                            View
                          </Button>
                          {hasRole('SUPER_ADMIN', 'ADMIN', 'HR_EXECUTIVE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                              onClick={() => navigate(`/candidates/${app._id}?edit=true`)}
                            >
                              Edit
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

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1}
                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                onClick={() => loadApplications(page - 1)}>
                Prev
              </Button>
              <span className="text-xs text-slate-600 font-medium">{page} / {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page >= totalPages}
                onClick={() => loadApplications(page + 1)}>
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {showRegister && (
        <RegisterCandidateModal
          isOpen={showRegister}
          onClose={() => setShowRegister(false)}
          onSuccess={() => {
            setShowRegister(false);
            loadApplications(1);
          }}
        />
      )}
    </div>
  );
};

