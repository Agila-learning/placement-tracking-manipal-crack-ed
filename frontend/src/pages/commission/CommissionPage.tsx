import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Banknote,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  Edit2,
  Plus,
  Trash2,
  Calendar,
  Building,
  RefreshCw,
  X,
  ExternalLink,
  DollarSign,
  Users,
  Upload,
  Image,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';
import { applicationsApi } from '../../api/endpoints';
import { Application } from '../../types';
import { Button, Badge, LoadingSpinner, Modal } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/statusHelpers';

// Helper to convert numbers to Indian Rupee Words
function numberToWordsINR(amount: number): string {
  if (!amount || isNaN(amount)) return 'ZERO RUPEES ONLY';
  
  const a = ['', 'ONE ', 'TWO ', 'THREE ', 'FOUR ', 'FIVE ', 'SIX ', 'SEVEN ', 'EIGHT ', 'NINE ', 'TEN ', 'ELEVEN ', 'TWELVE ', 'THIRTEEN ', 'FOURTEEN ', 'FIFTEEN ', 'SIXTEEN ', 'SEVENTEEN ', 'EIGHTEEN ', 'NINETEEN '];
  const b = ['', '', 'TWENTY ', 'THIRTY ', 'FORTY ', 'FIFTY ', 'SIXTY ', 'SEVENTY ', 'EIGHTY ', 'NINETY '];

  function inWords(num: number): string {
    let str = '';
    if (num > 9999999) {
      str += inWords(Math.floor(num / 10000000)) + 'CRORE ';
      num %= 10000000;
    }
    if (num > 99999) {
      str += inWords(Math.floor(num / 100000)) + 'LAKH ';
      num %= 100000;
    }
    if (num > 999) {
      str += inWords(Math.floor(num / 1000)) + 'THOUSAND ';
      num %= 1000;
    }
    if (num > 99) {
      str += inWords(Math.floor(num / 100)) + 'HUNDRED ';
      num %= 100;
    }
    if (num > 0) {
      if (num < 20) {
        str += a[num];
      } else {
        str += b[Math.floor(num / 10)];
        if (num % 10 > 0) {
          str += a[num % 10];
        }
      }
    }
    return str;
  }

  const result = inWords(Math.floor(amount)).trim();
  return result ? `${result} RUPEES ONLY` : 'ZERO RUPEES ONLY';
}

type InvoiceFormat = 'UNEXT_MANIPAL' | 'CRACKED';

export const CommissionPage = () => {
  const toast = useToast();
  const { hasRole } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COLLECTED' | 'NOT_APPLICABLE'>('ALL');
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);

  // Commission Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [commissionForm, setCommissionForm] = useState({
    commissionStatus: 'PENDING',
    commissionAmount: '14000',
    commissionCollectedDate: '',
    commissionNotes: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  // Invoice State & Presets
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceFormat, setInvoiceFormat] = useState<InvoiceFormat>('UNEXT_MANIPAL');
  const [showEditorControls, setShowEditorControls] = useState(true);
  const [digitalSignatureUrl, setDigitalSignatureUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [invoiceHeader, setInvoiceHeader] = useState({
    headerName: 'AVINASH VENKATARAMAN',
    headerAddressLine1: 'Chinna mariyamman,kovil street,',
    headerAddressLine2: 'Krishnagiri 635001 - Tamilnadu',
    billToName: 'U-NEXT Learning Private Limited',
    billToAddress1: 'No.1/1, Swami Vivekananda Road,',
    billToAddress2: 'Off M G Road Bangalore, 560008',
    billToState: 'Karnataka-560008',
    cinNo: 'U80302KA2009PTC050865',
    panNo: 'AAGCM1498M',
    gstin: '29AAGCM1498M1ZR',
    refNo: 'FIC26089',
    invoiceNo: 'FIC26089',
    invoiceDate: '26th October 2026',
    poNumber: 'POSTD2602865',
    placeOfService: 'Tamil Nadu',
    stateCode: '33',
    hsnSac: '',
    signatoryName: 'Avinash Venkataraman',
  });

  // Fully editable invoice table headers (matching reference image)
  const [tableHeaders, setTableHeaders] = useState({
    col1: 'Sourcing for ABC B-7',
    col2: 'Application No.',
    col3: 'SLAB',
    col4: 'No. of Students',
    col5: 'Commission Amount',
  });

  // Invoice dynamic line items
  const [invoiceItems, setInvoiceItems] = useState<Array<{
    id: string;
    name: string;
    email: string;
    mobile: string;
    appNo: string;
    slab: string;
    students: number;
    amount: number;
  }>>([]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await applicationsApi.list({ limit: '100' });
      if (res.success && res.data) {
        setApplications(res.data);
      }
    } catch {
      toast.error('Failed to load candidate commissions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format Switcher
  const handleFormatChange = (format: InvoiceFormat) => {
    setInvoiceFormat(format);
    if (format === 'CRACKED') {
      setInvoiceHeader((prev) => ({
        ...prev,
        billToName: 'Crack-ed EdTech Private Limited',
        billToAddress1: 'Corporate Towers, Sector 44,',
        billToAddress2: 'Near Huda City Centre',
        billToState: 'Gurugram, Haryana - 122003',
        cinNo: 'U74999HR2020PTC085123',
        panNo: 'AAECK9281M',
        gstin: '06AAECK9281M1Z5',
        refNo: 'FIC-CRK-2026',
        invoiceNo: 'FIC-CRK-2026',
        poNumber: 'PO-CRK-9821',
      }));
      setTableHeaders((prev) => ({
        ...prev,
        col1: 'Sourcing for Crack-ed Talent B-1',
      }));
    } else {
      setInvoiceHeader((prev) => ({
        ...prev,
        billToName: 'U-NEXT Learning Private Limited',
        billToAddress1: 'No.1/1, Swami Vivekananda Road,',
        billToAddress2: 'Off M G Road Bangalore, 560008',
        billToState: 'Karnataka-560008',
        cinNo: 'U80302KA2009PTC050865',
        panNo: 'AAGCM1498M',
        gstin: '29AAGCM1498M1ZR',
        refNo: 'FIC26089',
        invoiceNo: 'FIC26089',
        poNumber: 'POSTD2602865',
      }));
      setTableHeaders((prev) => ({
        ...prev,
        col1: 'Sourcing for ABC B-7',
      }));
    }
  };

  // Digital Signature file upload handler
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Signature file must be under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setDigitalSignatureUrl(uploadEvent.target?.result as string);
        toast.success('Digital signature attached to invoice!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      if (statusFilter !== 'ALL') {
        const currentSt = app.commissionStatus || 'PENDING';
        if (currentSt !== statusFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (app.candidateName || '').toLowerCase();
        const appNo = (app.applicationNumber || '').toLowerCase();
        const bank = (app.bankName || '').toLowerCase();
        const vendor = (app.vendorName || '').toLowerCase();
        return name.includes(q) || appNo.includes(q) || bank.includes(q) || vendor.includes(q);
      }
      return true;
    });
  }, [applications, statusFilter, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let collectedCount = 0;
    let collectedAmount = 0;
    let pendingCount = 0;
    let pendingAmount = 0;

    applications.forEach((app) => {
      const amount = Number(app.commissionAmount) || 14000;
      if (app.commissionStatus === 'COLLECTED') {
        collectedCount += 1;
        collectedAmount += amount;
      } else if (app.commissionStatus === 'NOT_APPLICABLE') {
        // Ignored
      } else {
        pendingCount += 1;
        pendingAmount += amount;
      }
    });

    return {
      collectedCount,
      collectedAmount,
      pendingCount,
      pendingAmount,
      totalCount: applications.length,
    };
  }, [applications]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedAppIds(filteredApps.map((a) => a._id));
    } else {
      setSelectedAppIds([]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const openEditModal = (app: Application) => {
    setEditingApp(app);
    setCommissionForm({
      commissionStatus: app.commissionStatus || 'PENDING',
      commissionAmount: String(app.commissionAmount || '14000'),
      commissionCollectedDate: app.commissionCollectedDate ? app.commissionCollectedDate.substring(0, 10) : '',
      commissionNotes: app.commissionNotes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveCommission = async () => {
    if (!editingApp) return;
    setEditLoading(true);
    try {
      await applicationsApi.updateCommission(editingApp._id, commissionForm);
      toast.success('Commission updated successfully!');
      setShowEditModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update commission.');
    } finally {
      setEditLoading(false);
    }
  };

  // Launch Tax Invoice Generator
  const handleRaiseInvoice = () => {
    let selectedList = applications.filter((a) => selectedAppIds.includes(a._id));
    
    // Fallback: If none selected, default to all placed or available candidates
    if (selectedList.length === 0) {
      selectedList = applications.slice(0, 3);
    }

    if (selectedList.length === 0) {
      toast.error('No candidates available to generate invoice.');
      return;
    }

    const items = selectedList.map((app, idx) => ({
      id: app._id,
      name: app.candidateName || `Candidate ${idx + 1}`,
      email: app.candidateEmail || `${(app.candidateName || 'candidate').toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      mobile: app.candidateMobile || (app.candidateId as any)?.mobileNumber || '9442852938',
      appNo: app.applicationNumber || `ABCP-12502${idx + 7}`,
      slab: '1 to 5',
      students: 1,
      amount: Number(app.commissionAmount) || 14000,
    }));

    setInvoiceItems(items);
    setShowInvoiceModal(true);
  };

  const invoiceGrandTotal = useMemo(() => {
    return invoiceItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  }, [invoiceItems]);

  const getPreparedInvoiceHtml = (invoiceEl: HTMLElement): string => {
    const invoiceClone = invoiceEl.cloneNode(true) as HTMLElement;
    // Replace all inputs in the clone with spans containing their current values so they serialize and print accurately
    const originalInputs = invoiceEl.querySelectorAll('input');
    const cloneInputs = invoiceClone.querySelectorAll('input');
    originalInputs.forEach((origInput, idx) => {
      const cloneInput = cloneInputs[idx];
      if (cloneInput && cloneInput.parentNode) {
        const span = document.createElement('span');
        span.textContent = origInput.value;
        span.style.cssText = cloneInput.style.cssText;
        span.style.display = 'inline-block';
        span.style.border = 'none';
        span.style.outline = 'none';
        span.style.background = 'transparent';
        span.className = cloneInput.className;
        cloneInput.parentNode.replaceChild(span, cloneInput);
      }
    });
    return invoiceClone.outerHTML;
  };

  const handlePrint = () => {
    const invoiceEl = document.getElementById('printable-invoice');
    if (!invoiceEl) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=950,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const cleanInvoiceMarkup = getPreparedInvoiceHtml(invoiceEl);

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TAX INVOICE - ${invoiceHeader.invoiceNo}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000000;
      background-color: #ffffff;
      padding: 10px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    #printable-invoice {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 auto !important;
      box-shadow: none !important;
      border: none !important;
      padding: 0 !important;
    }
    .invoice-box {
      border: 1.5px solid #000 !important;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #000;
    }
  </style>
</head>
<body>
  ${cleanInvoiceMarkup}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`);
    printWindow.document.close();
  };

  const handleDownloadInvoiceHtml = () => {
    const invoiceEl = document.getElementById('printable-invoice');
    if (!invoiceEl) return;
    const cleanInvoiceMarkup = getPreparedInvoiceHtml(invoiceEl);
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TAX INVOICE - ${invoiceHeader.invoiceNo}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #000000; background: #ffffff; padding: 20px; }
    #printable-invoice { width: 100%; max-width: 850px; margin: 0 auto; border: none; padding: 10px; }
    .invoice-box { border: 1.5px solid #000; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; }
  </style>
</head>
<body>
  ${cleanInvoiceMarkup}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Tax_Invoice_${invoiceHeader.invoiceNo}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Invoice file downloaded successfully!');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-fic-border shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-fic-navy flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Banknote className="w-5 h-5" />
            </div>
            Placement Commission &amp; Tax Invoice Manager
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track commission collections across Manipal BFSI &amp; Crack-ed programs and generate standard GST Tax Invoices
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={loadData}
          >
            Refresh
          </Button>

          <Button
            size="sm"
            leftIcon={<FileText className="w-4 h-4" />}
            onClick={handleRaiseInvoice}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
          >
            Raise Tax Invoice ({selectedAppIds.length})
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Placed */}
        <div className="bg-white rounded-xl border border-fic-border p-4 shadow-2xs">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Candidates</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{metrics.totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tracked in CRM</div>
        </div>

        {/* Collected */}
        <div className="bg-emerald-50/60 rounded-xl border border-emerald-200 p-4 shadow-2xs">
          <div className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Commission Collected</div>
          <div className="text-2xl font-black text-emerald-800 mt-1">
            ₹{metrics.collectedAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5">{metrics.collectedCount} candidates settled</div>
        </div>

        {/* Pending */}
        <div className="bg-amber-50/60 rounded-xl border border-amber-200 p-4 shadow-2xs">
          <div className="text-xs text-amber-700 font-semibold uppercase tracking-wider">Commission Pending</div>
          <div className="text-2xl font-black text-amber-800 mt-1">
            ₹{metrics.pendingAmount.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-amber-600 mt-0.5">{metrics.pendingCount} candidates awaiting collection</div>
        </div>

        {/* Selected for Invoicing */}
        <div className="bg-purple-50/60 rounded-xl border border-purple-200 p-4 shadow-2xs">
          <div className="text-xs text-purple-700 font-semibold uppercase tracking-wider">Selected for Invoice</div>
          <div className="text-2xl font-black text-purple-800 mt-1">{selectedAppIds.length}</div>
          <div className="text-[11px] text-purple-600 mt-0.5">Click "Raise Tax Invoice" to generate</div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="bg-white rounded-xl border border-fic-border p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['ALL', 'PENDING', 'COLLECTED', 'NOT_APPLICABLE'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-fic-navy text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Candidates' : st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            className="fic-input pl-9 text-xs"
            placeholder="Search candidate, app no, bank..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Candidates Commission Table */}
      <div className="bg-white rounded-2xl border border-fic-border shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Banknote className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold">No candidates found matching the filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-fic-border text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                      checked={filteredApps.length > 0 && selectedAppIds.length === filteredApps.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-3.5">Candidate Details</th>
                  <th className="p-3.5">Application No.</th>
                  <th className="p-3.5">Bank / Program</th>
                  <th className="p-3.5">Overall Status</th>
                  <th className="p-3.5">Commission Status</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Settlement Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApps.map((app) => {
                  const isChecked = selectedAppIds.includes(app._id);
                  const commStatus = app.commissionStatus || 'PENDING';
                  const amount = Number(app.commissionAmount) || 14000;

                  return (
                    <tr
                      key={app._id}
                      className={`hover:bg-purple-50/30 transition-colors ${isChecked ? 'bg-purple-50/50' : ''}`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          checked={isChecked}
                          onChange={() => toggleSelect(app._id)}
                        />
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800 text-sm">{app.candidateName}</div>
                        <div className="text-[11px] text-slate-400">{app.candidateEmail}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono text-xs bg-blue-50 text-fic-navy px-2 py-0.5 rounded font-medium">
                          {app.applicationNumber}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-700">{app.bankName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{app.programName}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {app.overallStatus}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {commStatus === 'COLLECTED' ? (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Collected
                          </span>
                        ) : commStatus === 'NOT_APPLICABLE' ? (
                          <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full text-xs font-medium">
                            Not Applicable
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">
                        ₹{amount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {app.commissionCollectedDate ? formatDate(app.commissionCollectedDate) : '—'}
                      </td>
                      <td className="p-3.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Edit2 className="w-3 h-3" />}
                          onClick={() => openEditModal(app)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SINGLE CANDIDATE COMMISSION EDIT MODAL */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Update Commission — ${editingApp?.candidateName}`}
      >
        <div className="space-y-4">
          <div>
            <label className="fic-label">Commission Status *</label>
            <select
              className="fic-input"
              value={commissionForm.commissionStatus}
              onChange={(e) => setCommissionForm({ ...commissionForm, commissionStatus: e.target.value })}
            >
              <option value="PENDING">⏳ Pending Collection</option>
              <option value="COLLECTED">✅ Collected / Settled</option>
              <option value="NOT_APPLICABLE">🚫 Not Applicable</option>
            </select>
          </div>

          <div>
            <label className="fic-label">Commission Amount (₹) *</label>
            <input
              type="number"
              className="fic-input"
              value={commissionForm.commissionAmount}
              onChange={(e) => setCommissionForm({ ...commissionForm, commissionAmount: e.target.value })}
            />
          </div>

          <div>
            <label className="fic-label">Settlement / Collection Date</label>
            <input
              type="date"
              className="fic-input"
              value={commissionForm.commissionCollectedDate}
              onChange={(e) => setCommissionForm({ ...commissionForm, commissionCollectedDate: e.target.value })}
            />
          </div>

          <div>
            <label className="fic-label">Notes &amp; Remarks</label>
            <textarea
              rows={2}
              className="fic-input"
              placeholder="e.g. Batch 7 placement fee invoiced..."
              value={commissionForm.commissionNotes}
              onChange={(e) => setCommissionForm({ ...commissionForm, commissionNotes: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button className="flex-1" isLoading={editLoading} onClick={handleSaveCommission}>
              Save Commission
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================== */}
      {/* PROFESSIONAL TAX INVOICE MODAL WITH DEDICATED CONTROLS & PREVIEW */}
      {/* ============================================================== */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        title="Official GST Tax Invoice Generator"
        size="2xl"
      >
        <div className="space-y-6 max-h-[85vh] overflow-y-auto pr-1">
          {/* Top Control Bar: Print, Hide/Show Controls, Format Selector */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 no-print">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Select Invoice Template Format:
                </span>
                <div className="inline-flex p-1 bg-slate-200/80 rounded-xl mt-1.5 gap-1">
                  <button
                    type="button"
                    onClick={() => handleFormatChange('UNEXT_MANIPAL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      invoiceFormat === 'UNEXT_MANIPAL'
                        ? 'bg-fic-navy text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    UNEXT / Manipal BFSI
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFormatChange('CRACKED')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      invoiceFormat === 'CRACKED'
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Crack-ed Placement
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={showEditorControls ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  onClick={() => setShowEditorControls(!showEditorControls)}
                  className="flex-1 sm:flex-initial"
                >
                  {showEditorControls ? 'Hide Controls' : 'Edit Batch / Fields'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  onClick={handleDownloadInvoiceHtml}
                  className="flex-1 sm:flex-initial"
                >
                  Download File
                </Button>
                <Button
                  size="sm"
                  leftIcon={<Printer className="w-4 h-4" />}
                  onClick={handlePrint}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex-1 sm:flex-initial"
                >
                  Print / Save PDF
                </Button>
              </div>
            </div>

            {/* Collapsible Editor Fields */}
            {showEditorControls && (
              <div className="pt-3 border-t border-slate-200 space-y-4 text-xs">
                {/* 1. Header & Address */}
                <div>
                  <span className="font-bold text-slate-800 uppercase tracking-wide block mb-2">
                    1. Top Header &amp; Address
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 mb-1 block">Center Header Name *</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-fic-navy bg-white"
                        value={invoiceHeader.headerName}
                        onChange={(e) => setInvoiceHeader({ ...invoiceHeader, headerName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 mb-1 block">Address Line 1 *</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-fic-navy bg-white"
                        value={invoiceHeader.headerAddressLine1}
                        onChange={(e) => setInvoiceHeader({ ...invoiceHeader, headerAddressLine1: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 mb-1 block">Address Line 2 *</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-fic-navy bg-white"
                        value={invoiceHeader.headerAddressLine2}
                        onChange={(e) => setInvoiceHeader({ ...invoiceHeader, headerAddressLine2: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Metadata */}
                <div>
                  <span className="font-bold text-slate-800 uppercase tracking-wide block mb-2">
                    2. Invoice Metadata
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 mb-1 block">Invoice Number *</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-fic-navy bg-white"
                        value={invoiceHeader.invoiceNo}
                        onChange={(e) => setInvoiceHeader({ ...invoiceHeader, invoiceNo: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 mb-1 block">Invoice Date *</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-fic-navy bg-white"
                        value={invoiceHeader.invoiceDate}
                        onChange={(e) => setInvoiceHeader({ ...invoiceHeader, invoiceDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 mb-1 block">PO Number *</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-fic-navy bg-white"
                        value={invoiceHeader.poNumber}
                        onChange={(e) => setInvoiceHeader({ ...invoiceHeader, poNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 mb-1 block">Place of Service *</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-fic-navy bg-white"
                        value={invoiceHeader.placeOfService}
                        onChange={(e) => setInvoiceHeader({ ...invoiceHeader, placeOfService: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 mb-1 block">State Code *</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-fic-navy bg-white"
                        value={invoiceHeader.stateCode}
                        onChange={(e) => setInvoiceHeader({ ...invoiceHeader, stateCode: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 mb-1 block">HSN / SAC Code</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-fic-navy bg-white"
                        placeholder="e.g. 998311"
                        value={invoiceHeader.hsnSac}
                        onChange={(e) => setInvoiceHeader({ ...invoiceHeader, hsnSac: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 mb-1 block">Signatory Name</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-fic-navy bg-white"
                        value={invoiceHeader.signatoryName}
                        onChange={(e) => setInvoiceHeader({ ...invoiceHeader, signatoryName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 mb-1 block">
                        Attach Digital Signature
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleSignatureUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-blue-600" />
                          <span>{digitalSignatureUrl ? 'Change' : 'Upload'}</span>
                        </button>
                        {digitalSignatureUrl && (
                          <button
                            type="button"
                            onClick={() => setDigitalSignatureUrl(null)}
                            className="text-xs text-red-500 hover:text-red-700 underline font-medium"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {digitalSignatureUrl && (
                        <div className="mt-1 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Attached
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Table Column Headers (Fully Editable) */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <span>🏷️</span>
                      <span>3. Table Column Headers (Fully Editable)</span>
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Editable here or directly in the table headers below
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Column 1 Header</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-semibold focus:ring-1 focus:ring-fic-navy bg-white"
                        value={tableHeaders.col1}
                        onChange={(e) => setTableHeaders({ ...tableHeaders, col1: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Column 2 Header</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-semibold focus:ring-1 focus:ring-fic-navy bg-white"
                        value={tableHeaders.col2}
                        onChange={(e) => setTableHeaders({ ...tableHeaders, col2: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Column 3 Header</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-semibold focus:ring-1 focus:ring-fic-navy bg-white"
                        value={tableHeaders.col3}
                        onChange={(e) => setTableHeaders({ ...tableHeaders, col3: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Column 4 Header</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-semibold focus:ring-1 focus:ring-fic-navy bg-white"
                        value={tableHeaders.col4}
                        onChange={(e) => setTableHeaders({ ...tableHeaders, col4: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Column 5 Header</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-semibold focus:ring-1 focus:ring-fic-navy bg-white"
                        value={tableHeaders.col5}
                        onChange={(e) => setTableHeaders({ ...tableHeaders, col5: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Candidate Particulars & Application Numbers */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <span>📝</span>
                      <span>4. Candidate Particulars &amp; Application Numbers</span>
                    </span>
                    <span className="text-[11px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      Editable here or inline in table rows below
                    </span>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {invoiceItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="grid grid-cols-1 sm:grid-cols-5 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 items-center text-xs"
                      >
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Candidate #{idx + 1} Name</label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-semibold focus:ring-1 focus:ring-fic-navy bg-white"
                            value={item.name}
                            onChange={(e) => {
                              const newItems = [...invoiceItems];
                              newItems[idx] = { ...newItems[idx], name: e.target.value };
                              setInvoiceItems(newItems);
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-purple-800 block">Application No. * (Editable)</label>
                          <input
                            type="text"
                            className="w-full border-2 border-purple-300 rounded-lg p-1.5 text-xs font-mono font-bold text-purple-900 focus:ring-2 focus:ring-purple-500 bg-purple-50/50"
                            placeholder="e.g. ABCP-125027"
                            value={item.appNo}
                            onChange={(e) => {
                              const newItems = [...invoiceItems];
                              newItems[idx] = { ...newItems[idx], appNo: e.target.value };
                              setInvoiceItems(newItems);
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">SLAB</label>
                          <input
                            type="text"
                            className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white"
                            value={item.slab}
                            onChange={(e) => {
                              const newItems = [...invoiceItems];
                              newItems[idx] = { ...newItems[idx], slab: e.target.value };
                              setInvoiceItems(newItems);
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Students</label>
                          <input
                            type="number"
                            className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white"
                            value={item.students}
                            onChange={(e) => {
                              const newItems = [...invoiceItems];
                              newItems[idx] = { ...newItems[idx], students: Number(e.target.value) || 0 };
                              setInvoiceItems(newItems);
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Commission (₹)</label>
                          <input
                            type="number"
                            className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-semibold focus:ring-1 focus:ring-fic-navy bg-white"
                            value={item.amount}
                            onChange={(e) => {
                              const newItems = [...invoiceItems];
                              newItems[idx] = { ...newItems[idx], amount: Number(e.target.value) || 0 };
                              setInvoiceItems(newItems);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* PIXEL-PERFECT INVOICE SHEET (MATCHING REFERENCE IMAGE EXACTLY) */}
          {/* ============================================================== */}
          <div className="w-full overflow-x-auto pb-4 scrollbar-thin">
            <div className="sm:hidden text-center text-[11px] text-slate-500 py-1 bg-slate-100 rounded-lg mb-2">
              👈 Swipe horizontally to view / edit full Tax Invoice 👉
            </div>
            <div
              id="printable-invoice"
              className="bg-white text-black p-5 sm:p-8 md:p-10 shadow-2xl mx-auto min-w-[720px] max-w-[850px] font-sans text-[12px] leading-tight"
              style={{
                color: '#000000',
                backgroundColor: '#ffffff',
              }}
            >
              {/* Top Header (Borderless, outside the invoice box): Name, Address, and Date on Right */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {invoiceHeader.headerName}
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginTop: '3px' }}>
                    {invoiceHeader.headerAddressLine1}
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginTop: '2px' }}>
                    {invoiceHeader.headerAddressLine2}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '13px', marginTop: '6px' }}>
                  Date : {invoiceHeader.invoiceDate}
                </div>
              </div>

              {/* Main Bordered Invoice Box */}
              <div
                className="invoice-box"
                style={{
                  border: '1.5px solid black',
                  backgroundColor: '#ffffff',
                }}
              >
                {/* 1. TAX INVOICE Header Bar */}
                <div
                  style={{
                    borderBottom: '1px solid black',
                    textAlign: 'center',
                    fontWeight: '900',
                    fontSize: '16px',
                    padding: '6px 4px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  TAX INVOICE
                </div>

                {/* 2. Two-Box Table (To on Left, Invoice Details on Right) */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    borderBottom: '1px solid black',
                  }}
                >
                  <tbody>
                    <tr>
                      {/* Left Column: To Address */}
                      <td
                        style={{
                          width: '52%',
                          verticalAlign: 'top',
                          padding: '8px 12px',
                          borderRight: '1px solid black',
                          lineHeight: '1.45',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ fontWeight: 'bold', color: '#111827' }}>To</div>
                        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{invoiceHeader.billToName}</div>
                        <div>{invoiceHeader.billToAddress1}</div>
                        <div>{invoiceHeader.billToAddress2}</div>
                        <div>{invoiceHeader.billToState}</div>
                        <div style={{ marginTop: '5px' }}>
                          CIN No: <span style={{ fontWeight: 'bold' }}>{invoiceHeader.cinNo}</span>
                        </div>
                        <div>
                          PAN No: <span style={{ fontWeight: 'bold' }}>{invoiceHeader.panNo}</span>
                        </div>
                        <div>
                          GSTIN: <span style={{ fontWeight: 'bold' }}>{invoiceHeader.gstin}</span>
                        </div>
                      </td>

                      {/* Right Column: Invoice Metadata Table */}
                      <td style={{ width: '48%', verticalAlign: 'top', padding: 0 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid black' }}>
                              <td style={{ padding: '4px 8px', fontWeight: 'bold', width: '45%' }}>Invoice No :</td>
                              <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>{invoiceHeader.invoiceNo}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid black' }}>
                              <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>Invoice Date :</td>
                              <td style={{ padding: '4px 8px' }}>{invoiceHeader.invoiceDate}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid black' }}>
                              <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>Pan Number :</td>
                              <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>{invoiceHeader.panNo}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid black' }}>
                              <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>PO Number :</td>
                              <td style={{ padding: '4px 8px' }}>{invoiceHeader.poNumber}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid black' }}>
                              <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>Place of service :</td>
                              <td style={{ padding: '4px 8px' }}>{invoiceHeader.placeOfService}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid black' }}>
                              <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>State code :</td>
                              <td style={{ padding: '4px 8px' }}>{invoiceHeader.stateCode}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>HSN/SAC Code :</td>
                              <td style={{ padding: '4px 8px' }}>{invoiceHeader.hsnSac || ''}</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 3. Line Items Table with EDITABLE HEADERS and Inline Inputs */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    borderBottom: '1px solid black',
                    fontSize: '12px',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#ffffff',
                        borderBottom: '1px solid black',
                        textAlign: 'center',
                        fontWeight: 'bold',
                      }}
                    >
                      <th style={{ borderRight: '1px solid black', padding: '6px 8px', width: '42%', verticalAlign: 'middle' }}>
                        <input
                          type="text"
                          value={tableHeaders.col1}
                          onChange={(e) => setTableHeaders({ ...tableHeaders, col1: e.target.value })}
                          title="Click to edit column 1 header"
                          style={{
                            width: '100%',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            border: 'none',
                            outline: 'none',
                            backgroundColor: 'transparent',
                            color: '#000000',
                            fontSize: '12px',
                            cursor: 'text',
                          }}
                        />
                      </th>
                      <th style={{ borderRight: '1px solid black', padding: '6px 8px', width: '18%', verticalAlign: 'middle' }}>
                        <input
                          type="text"
                          value={tableHeaders.col2}
                          onChange={(e) => setTableHeaders({ ...tableHeaders, col2: e.target.value })}
                          title="Click to edit column 2 header"
                          style={{
                            width: '100%',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            border: 'none',
                            outline: 'none',
                            backgroundColor: 'transparent',
                            color: '#000000',
                            fontSize: '12px',
                            cursor: 'text',
                          }}
                        />
                      </th>
                      <th style={{ borderRight: '1px solid black', padding: '6px 8px', width: '12%', verticalAlign: 'middle' }}>
                        <input
                          type="text"
                          value={tableHeaders.col3}
                          onChange={(e) => setTableHeaders({ ...tableHeaders, col3: e.target.value })}
                          title="Click to edit column 3 header"
                          style={{
                            width: '100%',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            border: 'none',
                            outline: 'none',
                            backgroundColor: 'transparent',
                            color: '#000000',
                            fontSize: '12px',
                            cursor: 'text',
                          }}
                        />
                      </th>
                      <th style={{ borderRight: '1px solid black', padding: '6px 8px', width: '14%', verticalAlign: 'middle' }}>
                        <input
                          type="text"
                          value={tableHeaders.col4}
                          onChange={(e) => setTableHeaders({ ...tableHeaders, col4: e.target.value })}
                          title="Click to edit column 4 header"
                          style={{
                            width: '100%',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            border: 'none',
                            outline: 'none',
                            backgroundColor: 'transparent',
                            color: '#000000',
                            fontSize: '12px',
                            cursor: 'text',
                          }}
                        />
                      </th>
                      <th style={{ padding: '6px 8px', width: '14%', verticalAlign: 'middle' }}>
                        <input
                          type="text"
                          value={tableHeaders.col5}
                          onChange={(e) => setTableHeaders({ ...tableHeaders, col5: e.target.value })}
                          title="Click to edit column 5 header"
                          style={{
                            width: '100%',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            border: 'none',
                            outline: 'none',
                            backgroundColor: 'transparent',
                            color: '#000000',
                            fontSize: '12px',
                            cursor: 'text',
                          }}
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.map((item, idx) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid black' }}>
                        <td style={{ borderRight: '1px solid black', padding: '8px 10px', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 'bold' }}>
                            {idx + 1}. {item.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#1f2937', paddingLeft: '14px' }}>
                            Email: {item.email}
                          </div>
                          <div style={{ fontSize: '11px', color: '#1f2937', paddingLeft: '14px' }}>
                            Mobile: -{item.mobile}
                          </div>
                        </td>
                        <td
                          style={{
                            borderRight: '1px solid black',
                            padding: '8px 6px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontWeight: 'bold',
                          }}
                        >
                          <input
                            type="text"
                            value={item.appNo}
                            title="Click to edit application number"
                            onChange={(e) => {
                              const newItems = [...invoiceItems];
                              newItems[idx] = { ...newItems[idx], appNo: e.target.value };
                              setInvoiceItems(newItems);
                            }}
                            style={{
                              width: '100%',
                              textAlign: 'center',
                              backgroundColor: 'transparent',
                              border: 'none',
                              outline: 'none',
                              fontWeight: 'bold',
                              color: '#000000',
                              fontSize: '12px',
                              cursor: 'text',
                            }}
                          />
                        </td>
                        <td
                          style={{
                            borderRight: '1px solid black',
                            padding: '8px 6px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                          }}
                        >
                          <input
                            type="text"
                            value={item.slab}
                            title="Click to edit slab"
                            onChange={(e) => {
                              const newItems = [...invoiceItems];
                              newItems[idx] = { ...newItems[idx], slab: e.target.value };
                              setInvoiceItems(newItems);
                            }}
                            style={{
                              width: '100%',
                              textAlign: 'center',
                              backgroundColor: 'transparent',
                              border: 'none',
                              outline: 'none',
                              color: '#000000',
                              fontSize: '12px',
                              cursor: 'text',
                            }}
                          />
                        </td>
                        <td
                          style={{
                            borderRight: '1px solid black',
                            padding: '8px 6px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                          }}
                        >
                          <input
                            type="number"
                            value={item.students}
                            title="Click to edit no. of students"
                            onChange={(e) => {
                              const newItems = [...invoiceItems];
                              newItems[idx] = { ...newItems[idx], students: Number(e.target.value) || 0 };
                              setInvoiceItems(newItems);
                            }}
                            style={{
                              width: '100%',
                              textAlign: 'center',
                              backgroundColor: 'transparent',
                              border: 'none',
                              outline: 'none',
                              color: '#000000',
                              fontSize: '12px',
                              cursor: 'text',
                            }}
                          />
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            textAlign: 'right',
                            verticalAlign: 'middle',
                            fontWeight: 'bold',
                          }}
                        >
                          <input
                            type="number"
                            value={item.amount}
                            title="Click to edit commission amount"
                            onChange={(e) => {
                              const newItems = [...invoiceItems];
                              newItems[idx] = { ...newItems[idx], amount: Number(e.target.value) || 0 };
                              setInvoiceItems(newItems);
                            }}
                            style={{
                              width: '100%',
                              textAlign: 'right',
                              backgroundColor: 'transparent',
                              border: 'none',
                              outline: 'none',
                              fontWeight: 'bold',
                              color: '#000000',
                              fontSize: '12px',
                              cursor: 'text',
                            }}
                          />
                        </td>
                      </tr>
                    ))}

                    {/* Total Row */}
                    <tr style={{ borderBottom: '1px solid black' }}>
                      <td
                        colSpan={4}
                        style={{
                          borderRight: '1px solid black',
                          padding: '6px 10px',
                          fontWeight: 'bold',
                          fontSize: '13px',
                        }}
                      >
                        Total
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px' }}>
                        {invoiceGrandTotal}/-
                      </td>
                    </tr>

                    {/* Grand Total Row */}
                    <tr style={{ borderBottom: '1px solid black' }}>
                      <td
                        colSpan={4}
                        style={{
                          borderRight: '1px solid black',
                          padding: '6px 10px',
                          fontWeight: 'bold',
                          fontSize: '13px',
                        }}
                      >
                        Grand Total
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px' }}>
                        {invoiceGrandTotal}/-
                      </td>
                    </tr>

                    {/* Total In Words Row */}
                    <tr>
                      <td colSpan={5} style={{ padding: '8px 10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        <span style={{ fontWeight: '900', marginRight: '6px' }}>Total In Words:</span>
                        <span>{numberToWordsINR(invoiceGrandTotal)}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 4. Our Account Details Section */}
                <div style={{ borderBottom: '1px solid black' }}>
                  <div
                    style={{
                      padding: '5px 10px',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      backgroundColor: '#ffffff',
                      borderBottom: '1px solid black',
                    }}
                  >
                    Our Account Details :
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid black', fontWeight: 'bold' }}>
                        <th style={{ borderRight: '1px solid black', padding: '4px' }}>Account Number</th>
                        <th style={{ borderRight: '1px solid black', padding: '4px' }}>IFSC Code</th>
                        <th style={{ borderRight: '1px solid black', padding: '4px' }}>Bank Name</th>
                        <th style={{ borderRight: '1px solid black', padding: '4px' }}>Account Holder Name</th>
                        <th style={{ borderRight: '1px solid black', padding: '4px' }}>PAN Number</th>
                        <th style={{ padding: '4px' }}>Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ borderRight: '1px solid black', padding: '6px 4px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                          103001000038529
                        </td>
                        <td style={{ borderRight: '1px solid black', padding: '6px 4px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                          IOBA0001030
                        </td>
                        <td style={{ borderRight: '1px solid black', padding: '6px 4px' }}>
                          Indian Overseas Bank
                        </td>
                        <td style={{ borderRight: '1px solid black', padding: '6px 4px' }}>
                          Avinash venkataraman
                        </td>
                        <td style={{ borderRight: '1px solid black', padding: '6px 4px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                          DVCPA1920B
                        </td>
                        <td style={{ padding: '6px 4px', textAlign: 'left', fontSize: '10px' }}>
                          Chinna mariyamman kovil street, Krishnagiri - 635001 - Tamilnadu.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 5. Authorised Signatory Footer Box with Digital Signature Support */}
                <div
                  style={{
                    padding: '12px 14px',
                    minHeight: '110px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>
                    Authorised Signatory
                  </div>

                  {/* Signature Graphic Container */}
                  <div style={{ height: '48px', display: 'flex', alignItems: 'center' }}>
                    {digitalSignatureUrl ? (
                      <img
                        src={digitalSignatureUrl}
                        alt="Digital Signature"
                        style={{ maxHeight: '46px', maxWidth: '170px', objectFit: 'contain' }}
                      />
                    ) : (
                      <span
                        style={{
                          fontFamily: 'Brush Script MT, cursive, Georgia, serif',
                          fontSize: '24px',
                          color: '#1e3a8a',
                          fontWeight: 'bold',
                          letterSpacing: '1px',
                        }}
                      >
                        V. Avinash
                      </span>
                    )}
                  </div>

                  <div style={{ fontWeight: 'bold', fontSize: '12px', marginTop: '2px' }}>
                    ({invoiceHeader.signatoryName})
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-wrap justify-between items-center gap-3 pt-2 no-print border-t border-slate-200">
            <span className="text-xs text-slate-500">
              Formatted per Indian GST audit standards. Click "Print / Save PDF" to save.
            </span>
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <Button variant="secondary" onClick={() => setShowInvoiceModal(false)} className="flex-1 sm:flex-initial">
                Close
              </Button>
              <Button
                variant="secondary"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleDownloadInvoiceHtml}
                className="flex-1 sm:flex-initial"
              >
                Download HTML
              </Button>
              <Button
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={handlePrint}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex-1 sm:flex-initial"
              >
                Print / Save PDF
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Embedded CSS for Standard Print Formatting */}
      <style>{`
        @media print {
          html, body {
            overflow: visible !important;
            height: auto !important;
            background: #ffffff !important;
          }
          body * {
            visibility: hidden !important;
          }
          .no-print, nav, header, aside {
            display: none !important;
          }
          div:has(#printable-invoice), [class*="overflow"], [class*="max-h-"] {
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            position: static !important;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible !important;
          }
          #printable-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 10px !important;
            box-shadow: none !important;
            border: 2px solid black !important;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};

export default CommissionPage;
