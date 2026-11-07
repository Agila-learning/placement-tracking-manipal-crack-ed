import React from 'react';
import { clsx } from 'clsx';

// ---- Button ----
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading,
  leftIcon,
  children,
  className,
  disabled,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-fic-navy text-white hover:bg-fic-navy-light',
    secondary: 'bg-white text-fic-navy border border-fic-border hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    warning: 'bg-fic-yellow text-fic-navy hover:bg-fic-yellow-dark',
    ghost: 'text-slate-600 hover:bg-slate-100',
  };
  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3',
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : leftIcon}
      {children}
    </button>
  );
};

// ---- Input ----
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, hint, leftElement, className, ...props }) => (
  <div className="w-full">
    {label && <label className="fic-label">{label}</label>}
    <div className="relative">
      {leftElement && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{leftElement}</div>
      )}
      <input
        className={clsx(
          'fic-input',
          leftElement && 'pl-10',
          error && 'border-red-400 focus:ring-red-400',
          className
        )}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
  </div>
);

// ---- Select ----
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ label, error, options, placeholder, className, ...props }) => (
  <div className="w-full">
    {label && <label className="fic-label">{label}</label>}
    <select
      className={clsx('fic-input', error && 'border-red-400', className)}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

// ---- Textarea ----
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className, ...props }) => (
  <div className="w-full">
    {label && <label className="fic-label">{label}</label>}
    <textarea
      className={clsx('fic-input resize-none', error && 'border-red-400', className)}
      rows={3}
      {...props}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

// ---- Badge ----
interface BadgeProps {
  className?: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ className, children }) => (
  <span className={clsx('status-badge', className)}>{children}</span>
);

// ---- Card ----
export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={clsx('fic-card p-6', className)}>{children}</div>
);

// ---- Modal ----
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative bg-white rounded-2xl shadow-2xl w-full z-10 max-h-[92vh] overflow-y-auto', sizes[size])}>
        {title && (
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-fic-border">
            <h3 className="text-base font-semibold text-slate-800">{title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4">{children}</div>
      </div>
    </div>
  );
};

// ---- Skeleton ----
export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('skeleton', className)} />
);

// ---- Tabs ----
interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => (
  <div className="flex border-b border-fic-border gap-1 overflow-x-auto scrollbar-none px-2 sm:px-4">
    {tabs.map((t) => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        className={clsx(
          'flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors duration-150 whitespace-nowrap flex-shrink-0',
          activeTab === t.id
            ? 'border-fic-navy text-fic-navy font-semibold'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
        )}
      >
        {t.icon}
        {t.label}
      </button>
    ))}
  </div>
);

// ---- ConfirmDialog ----
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  isLoading,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} size="sm">
    <div className="text-center py-2">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 mb-6">{message}</p>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant={confirmVariant} className="flex-1" onClick={onConfirm} isLoading={isLoading}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  </Modal>
);

// ---- EmptyState ----
export const EmptyState: React.FC<{ title: string; description?: string; icon?: React.ReactNode; action?: React.ReactNode }> = ({
  title, description, icon, action,
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
    {icon && <div className="mb-4 text-slate-300">{icon}</div>}
    <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
    {description && <p className="text-sm text-slate-400 mb-5 max-w-sm">{description}</p>}
    {action}
  </div>
);

// ---- Loading Spinner ----
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className={clsx('border-2 border-fic-navy border-t-transparent rounded-full animate-spin', s[size])} />
  );
};

// ---- Page Header ----
export const PageHeader: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
}> = ({ title, description, actions }) => (
  <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
    <div>
      <h1 className="text-xl font-bold text-fic-navy">{title}</h1>
      {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

