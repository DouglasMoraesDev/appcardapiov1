import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { Lock } from 'lucide-react';

const TrocaMesaModal: React.FC<{ deviceTableId?: string | null; onLiberar: () => void; onClose: () => void }> = ({ deviceTableId, onLiberar, onClose }) => {
  const { setDeviceTableId, waiters, setAccessToken, setCurrentUser } = useApp();
  const [senha, setSenha] = useState('');
    const [selectedWaiterId, setSelectedWaiterId] = useState<string | undefined>(undefined);
    const [storedCreator, setStoredCreator] = useState<{id: string, name?: string, username?: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleLiberar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      // allow storedCreator as fallback when select isn't available
      if (!selectedWaiterId && !storedCreator) {
        setErro('Selecione um garçom');
        setLoading(false);
        return;
      }
      const waiterIdToUse = selectedWaiterId || (storedCreator ? storedCreator.id : undefined);
      // Valida senha do garçom no backend
      const waiter = waiters.find(w => String(w.id) === String(waiterIdToUse));
      const username = waiter ? (waiter as any).username : (storedCreator ? storedCreator.username : undefined);
      const base = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:4000/api' : '/api';
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password: senha, role: 'waiter' })
      });
      if (!res.ok) {
        setErro('Senha incorreta!');
        setLoading(false);
        return;
      }
      const data = await res.json();
      // store mapping to indicate this waiter opened the table (store id/name/username when possible)
      try {
        if (deviceTableId && selectedWaiterId) {
          const waiterObj = waiters.find(w => String(w.id) === String(selectedWaiterId));
          const payload = { id: String(selectedWaiterId), name: waiterObj?.name || data.user?.name, username: (waiterObj as any)?.username || data.user?.username };
          localStorage.setItem(`tableCreator_${deviceTableId}`, JSON.stringify(payload));
        }
      } catch (e) {}
      // salva token/usuario no contexto para entrar como garçom
      try { setAccessToken(data.accessToken); } catch (e) {}
      try { setCurrentUser({ id: String(data.user.id), name: data.user.name, role: data.user.role } as any); } catch(e) {}
      try { localStorage.setItem('hasRefresh', '1'); } catch(e) {}
      setDeviceTableId(null);
      onLiberar();
      // redireciona para painel do garçom já autenticado
      window.location.hash = '#/waiter';
    } catch (err) {
      setErro('Erro ao validar senha.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      if (deviceTableId) {
        const stored = localStorage.getItem(`tableCreator_${deviceTableId}`);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setStoredCreator(parsed);
            if (parsed && parsed.id) setSelectedWaiterId(parsed.id);
          } catch (e) {
            // backwards compat: stored id as string
            setSelectedWaiterId(stored);
            setStoredCreator(stored ? { id: stored } as any : null);
          }
        } else if (waiters && waiters.length > 0) setSelectedWaiterId(waiters[0].id);
      } else if (waiters && waiters.length > 0) setSelectedWaiterId(waiters[0].id);
    } catch (e) {
      if (waiters && waiters.length > 0) setSelectedWaiterId(waiters[0].id);
    }
  }, [deviceTableId, waiters]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose}></div>
      <div className="relative w-full max-w-full sm:max-w-sm md:max-w-md rounded-t-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 border border-white/5 space-y-8 shadow-2xl animate-in zoom-in-95 bg-[#0d1f15]">
        <div className="text-center space-y-3">
          <Lock className="w-10 h-10 mx-auto text-[#d18a59]" />
          <h3 className="font-serif text-2xl uppercase tracking-widest text-[#d18a59]">Trocar Mesa</h3>
          <p className="text-[10px] text-white uppercase font-bold opacity-80">Informe a senha do garçom</p>
        </div>
        <form onSubmit={handleLiberar} className="space-y-6">
          <div>
              <label className="text-[10px] text-gray-400 uppercase font-bold">Garçom</label>
              {storedCreator ? (
                <div className="w-full bg-black/50 border border-white/10 rounded-3xl py-3 text-white px-4">{storedCreator.name || 'Garçom'}</div>
              ) : (waiters && waiters.length > 0 ? (
                <select value={selectedWaiterId} onChange={e => setSelectedWaiterId(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-3xl py-3 text-white px-4">
                  {waiters.map(w => (<option key={w.id} value={w.id}>{w.name}</option>))}
                </select>
              ) : (
                <div className="w-full bg-black/50 border border-white/10 rounded-3xl py-3 text-white px-4">{storedCreator?.name || 'Garçom'}</div>
              ))}
            </div>
          <input
            type="password"
            placeholder="Senha do Garçom"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-3xl py-6 text-center text-4xl tracking-[0.5em] text-white outline-none"
            autoFocus
            required
          />
          {erro && <div className="text-red-500 text-xs text-center">{erro}</div>}
          <div className="flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 text-xs font-bold text-white uppercase opacity-40">Cancelar</button>
            <button type="submit" className="flex-1 bg-[#d18a59] text-black py-4 rounded-2xl text-[10px] font-bold uppercase" disabled={loading}>{loading ? 'Validando...' : 'Liberar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TrocaMesaModal;
