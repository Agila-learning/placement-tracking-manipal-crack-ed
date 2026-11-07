import React, { useState } from 'react';
import { Download, BarChart2, FileText } from 'lucide-react';
import { reportsApi } from '../../api/endpoints';
import { Application, ALL_APPLICATION_STATUSES } from '../../types';
import { Button, Badge, EmptyState, LoadingSpinner, PageHeader } from '../../components/ui';
import { appStatusBadge, interviewStatusBadge, paymentStatusBadge, loanStatusBadge, formatDate, formatCurrency } from '../../utils/statusHelpers';
import { useToast } from '../../contexts/ToastContext';

export const ReportsPage = () => {
  const toast = useToast();
  const [activeReport, setActiveReport] = useState<'interview' | 'enrollment'>('interview');
  const [data, setData] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [filters, setFilters] = useState({
    bank: '', program: '', vendor: '', hr: '', status: '', fromDate: '', toDate: '', paymentStatus: '', loanStatus: '',
  });

  const setFilter = (key: string, value: string) => setFilters(f => ({ ...f, [key]: value }));

  const buildParams = () => {
    const p: Record<string, string> = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) p[k] = v; });
    return p;
  };

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const params = buildParams();
      const res = activeReport === 'interview'
        ? await reportsApi.interviewStatus(params)
        : await reportsApi.enrollmentFee(params);
      setData(res.data || []);
      setHasLoaded(true);
    } catch { toast.error('Failed to generate report.'); }
    finally { setIsLoading(false); }
  };

  const handleExport = () => {
    const params = buildParams();
    const token = localStorage.getItem('fic_token');
    const url = activeReport === 'interview'
      ? reportsApi.exportInterview(params)
      : reportsApi.exportEnrollment(params);
    window.open(`${url}&_t=${token}`, '_blank');
  };

  const allRoundNames = Array.from(new Set(data.flatMap(a => a.interviewRounds?.map(r => r.roundName) || [])));

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" description="Interview status and enrollment fee reports"
        actions={
          hasLoaded && data.length > 0 ? (
            <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />} onClick={handleExport}>
              Export Excel
            </Button>
          ) : undefined
        }
      />

      {/* Report Type Tabs */}
      <div className="bg-white rounded-xl border border-fic-border p-1 flex flex-wrap gap-1 w-full sm:w-fit">
        {[
          { id: 'interview' as const, label: 'Interview Status Report', icon: <BarChart2 className="w-4 h-4" /> },
          { id: 'enrollment' as const, label: 'Enrollment Fee Report', icon: <FileText className="w-4 h-4" /> },
        ].map(tab => (
          <button key={tab.id} onClick={() => { setActiveReport(tab.id); setData([]); setHasLoaded(false); }}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex-1 sm:flex-initial ${activeReport === tab.id ? 'bg-fic-navy text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-fic-border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <input className="fic-input text-sm h-9" placeholder="Bank" value={filters.bank} onChange={e => setFilter('bank', e.target.value)} />
          <input className="fic-input text-sm h-9" placeholder="Program" value={filters.program} onChange={e => setFilter('program', e.target.value)} />
          <input className="fic-input text-sm h-9" placeholder="Vendor" value={filters.vendor} onChange={e => setFilter('vendor', e.target.value)} />
          <input className="fic-input text-sm h-9" placeholder="HR Reference" value={filters.hr} onChange={e => setFilter('hr', e.target.value)} />
          <select className="fic-input text-sm h-9" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">All App. Statuses</option>
            {ALL_APPLICATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {activeReport === 'enrollment' && (
            <>
              <select className="fic-input text-sm h-9" value={filters.paymentStatus} onChange={e => setFilter('paymentStatus', e.target.value)}>
                <option value="">All Payment Statuses</option>
                {['Pending', 'Partially Paid', 'Paid', 'Refund Pending', 'Refunded', 'Not Applicable'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="fic-input text-sm h-9" value={filters.loanStatus} onChange={e => setFilter('loanStatus', e.target.value)}>
                <option value="">All Loan Statuses</option>
                {['Sanctioned', 'Not Sanctioned', 'Not Applicable'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </>
          )}
          <input type="date" className="fic-input text-sm h-9" value={filters.fromDate} onChange={e => setFilter('fromDate', e.target.value)} />
          <input type="date" className="fic-input text-sm h-9" value={filters.toDate} onChange={e => setFilter('toDate', e.target.value)} />
        </div>
        <div className="flex gap-3 mt-3">
          <Button onClick={loadReport} isLoading={isLoading} leftIcon={<BarChart2 className="w-4 h-4" />}>
            Generate Report
          </Button>
          <Button variant="ghost" onClick={() => setFilters({ bank: '', program: '', vendor: '', hr: '', status: '', fromDate: '', toDate: '', paymentStatus: '', loanStatus: '' })}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : !hasLoaded ? (
        <EmptyState title="Generate a report" description="Apply filters and click 'Generate Report' to view data."
          icon={<BarChart2 className="w-12 h-12" />} />
      ) : data.length === 0 ? (
        <EmptyState title="No results found" description="Try adjusting your filter criteria." icon={<FileText className="w-12 h-12" />} />
      ) : (
        <div className="bg-white rounded-xl border border-fic-border overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">{data.length} records</span>
          </div>
          <div className="overflow-x-auto">
            {activeReport === 'interview' ? (
              <table className="min-w-full">
                <thead>
                  <tr>
                    {['App No.', 'Candidate', 'Bank', 'Program', 'Vendor', 'HR Ref', ...allRoundNames, 'Overall Status'].map(h => (
                      <th key={h} className="fic-table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map(app => {
                    const roundMap: Record<string, string> = {};
                    app.interviewRounds?.forEach(r => { roundMap[r.roundName] = r.currentStatus; });
                    return (
                      <tr key={app._id} className="hover:bg-slate-50">
                        <td className="fic-table-cell font-mono text-xs text-fic-navy">{app.applicationNumber}</td>
                        <td className="fic-table-cell font-medium text-sm">{app.candidateName}</td>
                        <td className="fic-table-cell text-xs">{app.bankName}</td>
                        <td className="fic-table-cell text-xs">{app.programName}</td>
                        <td className="fic-table-cell text-xs">{app.vendorName}</td>
                        <td className="fic-table-cell text-xs">{app.hrReferenceName}</td>
                        {allRoundNames.map(rn => {
                          const st = roundMap[rn] as any;
                          return (
                            <td key={rn} className="fic-table-cell">
                              {st ? <Badge className={(interviewStatusBadge as any)[st]}>{st}</Badge> : <span className="text-xs text-slate-300">-</span>}
                            </td>
                          );
                        })}
                        <td className="fic-table-cell">
                          <Badge className={appStatusBadge[app.overallStatus]}>{app.overallStatus}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full">
                <thead>
                  <tr>
                    {['App No.', 'Candidate', 'Bank', 'Program', 'Vendor', 'Route', 'Fee', 'Paid', 'Balance', 'Payment Status', 'Refund', 'Loan'].map(h => (
                      <th key={h} className="fic-table-header">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((app: any) => (
                    <tr key={app._id} className="hover:bg-slate-50">
                      <td className="fic-table-cell font-mono text-xs text-fic-navy">{app.applicationNumber}</td>
                      <td className="fic-table-cell font-medium text-sm">{app.candidateName}</td>
                      <td className="fic-table-cell text-xs">{app.bankName}</td>
                      <td className="fic-table-cell text-xs">{app.programName}</td>
                      <td className="fic-table-cell text-xs">{app.vendorName}</td>
                      <td className="fic-table-cell text-xs">{app.paymentRoute === 'ROUTE_B_FULL_PAYMENT' ? 'Full Payment' : 'Vendor Loan'}</td>
                      <td className="fic-table-cell text-xs font-medium">{app.payment ? formatCurrency(app.payment.enrollmentFeeAmount) : '-'}</td>
                      <td className="fic-table-cell text-xs text-green-600 font-medium">{app.payment ? formatCurrency(app.payment.amountPaid) : '-'}</td>
                      <td className="fic-table-cell text-xs text-red-500">{app.payment ? formatCurrency(app.payment.balanceAmount) : '-'}</td>
                      <td className="fic-table-cell">
                        {app.payment ? <Badge className={(paymentStatusBadge as any)[app.payment.paymentStatus]}>{app.payment.paymentStatus}</Badge> : '-'}
                      </td>
                      <td className="fic-table-cell text-xs">{app.payment?.refund?.refundStatus || '-'}</td>
                      <td className="fic-table-cell">
                        {app.loan ? <Badge className={(loanStatusBadge as any)[app.loan.loanStatus]}>{app.loan.loanStatus}</Badge> : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
