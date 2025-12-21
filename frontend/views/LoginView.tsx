import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../store';
import { ArrowLeft, User, Lock } from 'lucide-react';
import InfoModal from '../components/InfoModal';

const LoginView: React.FC = () => {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const { setCurrentUser, establishment, setAccessToken } = useApp();
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, role })
      });
      const data = await res.json();
      if (!res.ok) {
        setInfoMessage(data.error || 'Falha no login');
        setInfoOpen(true);
        return;
      }
      setAccessToken(data.accessToken);
      setCurrentUser({ id: String(data.user.id), name: data.user.name, role: data.user.role, username } as any);
      try { localStorage.setItem('hasRefresh', '1'); } catch(e) {}
      if (data.user.role === 'admin') navigate('/admin');
      else if (data.user.role === 'waiter') navigate('/waiter');
    } catch (err) {
      console.error(err);
      setInfoMessage('Erro ao conectar com o servidor');
      setInfoOpen(true);
    }
  };

  const [infoOpen, setInfoOpen] = React.useState(false);
  const [infoMessage, setInfoMessage] = React.useState<string | undefined>(undefined);

  return (
    <div className="min-h-screen bg-[#06120c] p-4 sm:p-6 flex items-center justify-center">
      <div className="max-w-sm sm:max-w-md w-full space-y-8 px-4 sm:px-0">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-[#d18a59] flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar para o Início
        </button>

        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-serif text-[#d18a59] uppercase tracking-widest">Login {role === 'admin' ? 'Admin' : 'Garçom'}</h2>
          <p className="mt-2 text-gray-500 text-[10px] uppercase font-bold tracking-widest">Acesso Restrito • {establishment.name}</p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-6 bg-[#0d1f15] p-6 sm:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Usuário / Nome</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d18a59]" />
                <input 
                  type="text" 
                  className="w-full bg-[#06120c] border border-white/5 rounded-2xl pl-12 pr-4 py-4 focus:ring-1 focus:ring-[#d18a59] text-white outline-none"
                  placeholder={role === 'admin' ? "Usuário Admin" : "Nome do Garçom"}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
      
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d18a59]" />
                <input 
                  type="password" 
                  className="w-full bg-[#06120c] border border-white/5 rounded-2xl pl-12 pr-4 py-4 focus:ring-1 focus:ring-[#d18a59] text-white outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-[#d18a59] text-black font-black py-4 sm:py-5 rounded-2xl hover:bg-[#c17a49] transition-all uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-[#d18a59]/10">
            Acessar Painel
          </button>
        </form>
      </div>
      <InfoModal open={infoOpen} title="Erro" message={infoMessage} onClose={() => setInfoOpen(false)} />
    </div>
  );
};

export default LoginView;
