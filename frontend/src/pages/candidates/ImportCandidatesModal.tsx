import React, { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X, RefreshCw } from 'lucide-react';
import { applicationsApi } from '../../api/endpoints';
import { Button, Modal } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';

interface ImportCandidatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportSummary {
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; error: string; candidateName?: string }>;
}

export const ImportCandidatesModal: React.FC<ImportCandidatesModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const url = applicationsApi.downloadTemplate();
      const token = localStorage.getItem('fic_token');
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', 'candidate_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Excel template downloaded successfully.');
    } catch (err: any) {
      toast.error('Failed to download Excel template: ' + (err.message || 'Server error'));
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Please upload an Excel spreadsheet (.xlsx or .xls)');
      return;
    }
    setSelectedFile(file);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an Excel file to import.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await applicationsApi.importExcel(formData);
      if (res.success && res.data) {
        setResult(res.data);
        if (res.data.importedCount > 0) {
          toast.success(`Successfully imported ${res.data.importedCount} candidate(s)!`);
          window.dispatchEvent(new Event('fic:stats-refresh'));
          onSuccess();
        } else {
          toast.warning('No candidates were imported. Please check row errors below.');
        }
      } else {
        toast.error(res.message || 'Failed to import Excel file.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while processing Excel file.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Import Candidates from Excel">
      <div className="space-y-4">
        {/* Template Download Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">Need the structured template?</p>
              <p className="text-[11px] text-slate-600">
                Download the standardized sheet with sample data, active banks & programs.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full sm:w-auto shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100/50"
            isLoading={isDownloadingTemplate}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleDownloadTemplate}
          >
            Download Template
          </Button>
        </div>

        {/* Drag & Drop Upload Zone */}
        {!result && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-blue-500 bg-blue-50/40'
                : selectedFile
                ? 'border-emerald-400 bg-emerald-50/20'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            {selectedFile ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">{selectedFile.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {(selectedFile.size / 1024).toFixed(1)} KB — Click or drag to replace
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-slate-200/60 text-slate-600 flex items-center justify-center mb-2">
                  <Upload className="w-6 h-6 text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  <span className="text-blue-600 font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-400 mt-1">Microsoft Excel (.xlsx, .xls) up to 10MB</p>
              </div>
            )}
          </div>
        )}

        {/* Import Results Summary */}
        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 font-medium">Total Rows</p>
                <p className="text-lg font-bold text-slate-800">{result.totalRows}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-xs text-emerald-700 font-medium">Imported</p>
                <p className="text-lg font-bold text-emerald-700">{result.importedCount}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-700 font-medium">Skipped / Failed</p>
                <p className="text-lg font-bold text-amber-700">{result.skippedCount}</p>
              </div>
            </div>

            {result.importedCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Successfully imported {result.importedCount} candidates into the pipeline.</span>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  Row Validation Errors ({result.errors.length}):
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1 p-2 bg-red-50/60 border border-red-200 rounded-lg text-xs">
                  {result.errors.map((err, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-700 py-0.5">
                      <span className="font-semibold text-red-600 shrink-0">Row {err.row}:</span>
                      <span>
                        {err.candidateName ? `[${err.candidateName}] ` : ''}
                        {err.error}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div>
            {result && (
              <Button size="sm" variant="secondary" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={resetState}>
                Import Another File
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={onClose} disabled={isUploading}>
              {result ? 'Done' : 'Cancel'}
            </Button>
            {!result && (
              <Button
                size="sm"
                variant="primary"
                disabled={!selectedFile || isUploading}
                isLoading={isUploading}
                leftIcon={<Upload className="w-3.5 h-3.5" />}
                onClick={handleUpload}
              >
                Upload & Import
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
