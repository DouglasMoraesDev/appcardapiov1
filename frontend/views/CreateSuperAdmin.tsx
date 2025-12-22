import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CreateSuperAdmin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/create-superadmin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, secret }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || 'Erro');
      setSuccess('Superadmin criado. Você será redirecionado para login.');
      setTimeout(() => navigate('/login/admin'), 1500);
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0a0a]">
      <div className="max-w-md w-full bg-zinc-900/60 border border-zinc-800 p-6 rounded-xl">
        <h2 className="text-xl font-bold text-white mb-4">Criar Super Admin</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400">Usuário</label>
            <input value={username} onChange={e=>setUsername(e.target.value)} className="w-full mt-1 p-2 rounded bg-black/20" />
          </div>
          <div>
            <label className="block text-sm text-gray-400">Senha</label>
            <input value={password} onChange={e=>setPassword(e.target.value)} type="password" className="w-full mt-1 p-2 rounded bg-black/20" />
          </div>
          <div>
            <label className="block text-sm text-gray-400">Secret (se configurado)</label>
            <input value={secret} onChange={e=>setSecret(e.target.value)} className="w-full mt-1 p-2 rounded bg-black/20" />
            <p className="text-xs text-gray-500 mt-1">Se a variável de ambiente <code>SUPER_ADMIN_SECRET</code> estiver definida, informe-a aqui.</p>
          </div>
          {error && <div className="text-red-400">{error}</div>}
          {success && <div className="text-green-400">{success}</div>}
          <div className="flex items-center gap-2">
            <button disabled={loading} className="px-4 py-2 bg-amber-600 rounded text-black font-bold">{loading ? 'Criando...' : 'Criar'}</button>
            <button type="button" onClick={()=>navigate('/')} className="px-4 py-2 border rounded border-zinc-700 text-gray-200">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSuperAdmin;
