import React, { useState } from 'react';
import { useApp } from '../store';
import { Lock } from 'lucide-react';

const MesaAberturaView: React.FC<{ onMesaAberta: (tableId: string) => void }> = ({ onMesaAberta }) => {
  const { openTable, setDeviceTableId } = useApp();
  const [numeroMesa, setNumeroMesa] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleAbrirMesa = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const tableId = await openTable(Number(numeroMesa));
      setDeviceTableId(tableId);
      onMesaAberta(tableId);
    } catch (err) {
      setErro('Erro ao abrir mesa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#06120c] p-4 sm:p-6">
      <div className="max-w-md sm:max-w-sm w-full space-y-8 bg-[#0d1f15] p-6 sm:p-10 rounded-[3rem] border border-white/5 shadow-2xl">
        <h2 className="text-4xl font-serif text-[#d18a59] uppercase tracking-widest text-center">Abrir Mesa</h2>
        <form onSubmit={handleAbrirMesa} className="space-y-6">
          <input
            type="number"
            placeholder="Número da Mesa"
            value={numeroMesa}
            onChange={e => setNumeroMesa(e.target.value)}
            className="w-full bg-[#06120c] border border-white/5 rounded-3xl py-4 sm:py-6 text-center text-3xl sm:text-4xl font-serif text-[#d18a59] outline-none focus:ring-1 focus:ring-[#d18a59]"
            autoFocus
            required
          />
          {erro && <div className="text-red-500 text-xs text-center">{erro}</div>}
          <button
            type="submit"
            disabled={loading || !numeroMesa}
            className="w-full bg-[#d18a59] text-black font-black py-6 rounded-2xl hover:bg-[#c17a49] transition-all uppercase tracking-[0.3em] text-xs shadow-2xl disabled:opacity-40"
          >
            {loading ? 'Abrindo...' : 'Abrir Mesa'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MesaAberturaView;
