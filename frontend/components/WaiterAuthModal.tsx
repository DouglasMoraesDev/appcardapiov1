import React, { useState } from 'react';
import { useApp } from '../store';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function WaiterAuthModal({ open, onClose, onSuccess }: Props) {
  const { waiters, setAccessToken, setCurrentUser } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const base = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:4000/api' : '/api';
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, role: 'waiter' })
      });
      if (!res.ok) {
        setError('Credenciais inválidas');
        setLoading(false);
        return;
      }
      const data = await res.json();
      // set token and current user in context so fetchWithAuth uses it
      try { setAccessToken(data.accessToken); } catch (e) {}
      try { setCurrentUser({ id: String(data.user.id), name: data.user.name, role: data.user.role } as any); } catch (e) {}
      try { localStorage.setItem('hasRefresh', '1'); } catch(e) {}
      // success
      onSuccess();
    } catch (e) {
      setError('Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose}></div>
      <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-sm bg-[#0d1f15] border border-white/5 rounded-2xl p-6 shadow-2xl">
        <h3 className="text-lg font-serif text-white mb-2">Autenticar Garçom</h3>
        <p className="text-sm text-gray-400 mb-4">Por segurança, informe as credenciais do garçom para sair do modo cardápio.</p>

        {waiters && waiters.length > 0 ? (
          <select value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-2xl p-3 mb-3 text-white">
            <option value="">Selecione o garçom</option>
            {waiters.map(w => (<option key={w.id} value={(w as any).username || w.name}>{w.name}</option>))}
          </select>
        ) : (
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Usuário do garçom" className="w-full bg-black/50 border border-white/10 rounded-2xl p-3 mb-3 text-white" />
        )}

        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" className="w-full bg-black/50 border border-white/10 rounded-2xl p-3 mb-3 text-white" />
        {error && <div className="text-red-500 text-sm mb-3">{error}</div>}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-2xl bg-white/5">Cancelar</button>
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-2xl bg-[#d18a59] text-black font-bold">{loading ? 'Validando...' : 'Confirmar'}</button>
        </div>
      </form>
    </div>
  );
}
