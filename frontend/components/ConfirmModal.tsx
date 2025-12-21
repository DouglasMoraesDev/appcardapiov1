import React from 'react';

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmModal: React.FC<Props> = ({ open, title = 'Confirmação', message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel}></div>
      <div className="relative z-10 w-full max-w-md bg-[#0d1f15] border border-white/5 rounded-2xl p-6 shadow-2xl">
        <h3 className="text-lg font-serif text-white mb-2">{title}</h3>
        {message && <p className="text-sm text-gray-300 mb-4">{message}</p>}
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-white/5 text-gray-300">{cancelLabel}</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-[#d18a59] text-black font-bold">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
