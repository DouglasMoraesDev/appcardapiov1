import React from 'react';

type Props = {
  open: boolean;
  title?: string;
  amount?: number; // subtotal
  servicePercent?: number; // percentual de taxa, ex: 10
  showServiceToggle?: boolean;
  onConfirm: (servicePaid: boolean) => void;
  onCancel: () => void;
};

const PaymentConfirmModal: React.FC<Props> = ({ open, title = 'Confirmar Pagamento', amount, servicePercent, showServiceToggle = true, onConfirm, onCancel }) => {
  const [servicePaid, setServicePaid] = React.useState(true);

  React.useEffect(() => {
    if (open) setServicePaid(true);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel}></div>
      <div className="relative z-10 w-full max-w-md bg-[#0d1f15] border border-white/5 rounded-2xl p-6 shadow-2xl">
        <h3 className="text-lg font-serif text-white mb-2">{title}</h3>
        {typeof amount === 'number' && (
          <div className="text-sm text-gray-300 mb-4">
            <div>Subtotal: <span className="font-bold text-[#d18a59]">R$ {amount.toFixed(2)}</span></div>
            {typeof servicePercent === 'number' && (
              <div className="mt-1">Taxa de serviço ({servicePercent}%): <span className="font-bold text-[#d18a59]">R$ {((amount * (servicePercent / 100)) || 0).toFixed(2)}</span></div>
            )}
            <div className="mt-1">Total: <span className="font-bold text-[#d18a59]">R$ {(amount + (servicePercent ? amount * (servicePercent / 100) : 0)).toFixed(2)}</span></div>
          </div>
        )}
        <p className="text-sm text-gray-400 mb-4">Confirme que o pagamento foi recebido.</p>

        {showServiceToggle && (
          <label className="flex items-center gap-3 mb-4">
            <input type="checkbox" checked={servicePaid} onChange={e => setServicePaid(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-gray-300">Taxa de serviço foi paga?</span>
          </label>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-white/5 text-gray-300">Cancelar</button>
          <button onClick={() => onConfirm(servicePaid)} className="px-4 py-2 rounded-xl bg-[#d18a59] text-black font-bold">Confirmar</button>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmModal;
