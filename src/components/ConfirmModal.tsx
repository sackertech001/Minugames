import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-[#0F1115]/85 backdrop-blur-md">
      <div className="bg-white dark:bg-[#1A1D23] border border-slate-200 dark:border-[#2A2E37] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#2A2E37] px-5 py-4 bg-slate-50 dark:bg-[#12151A]">
          <h4 className="font-serif font-bold text-slate-800 dark:text-[#E0E2E6] text-xs uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className={`w-4.5 h-4.5 ${variant === 'danger' ? 'text-red-500' : 'text-[#D4AF37]'}`} />
            {title}
          </h4>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 dark:text-[#6B7280] hover:text-slate-800 hover:dark:text-[#E0E2E6] hover:bg-slate-200 dark:hover:bg-[#12151A] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 text-xs text-slate-600 dark:text-[#9CA3AF] leading-relaxed">
          {message}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-[#12151A] border-t border-slate-100 dark:border-[#2A2E37] px-5 py-3.5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="bg-white hover:bg-slate-100 dark:bg-[#1A1D23] dark:hover:bg-[#12151A] border border-slate-200 dark:border-[#2A2E37] text-slate-700 dark:text-[#E0E2E6] font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`font-bold text-xs px-4 py-2 rounded-xl text-white transition-colors cursor-pointer ${
              variant === 'danger'
                ? 'bg-red-500 hover:bg-red-600 border border-red-600'
                : 'bg-[#D4AF37] hover:bg-[#D4AF37]/90 border border-[#BFA032]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
