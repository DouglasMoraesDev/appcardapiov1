import React, { useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useApp } from '../store';
import { ArrowLeft, Store, MapPin, Image as ImageIcon, CreditCard, Hash, Percent, User as UserIcon, Lock } from 'lucide-react';
import InfoModal from '../components/InfoModal';

const { useNavigate } = ReactRouterDOM;

const RegistrationView: React.FC = () => {
  const { setEstablishment } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ 
    name: '', 
    address: '', 
    cep: '', 
    cpfCnpj: '', 
    logo: '', 
    serviceCharge: 10,
    adminUsername: '',
    adminPassword: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.adminUsername || !form.adminPassword) {
      setInfoMessage('Por favor, preencha os campos obrigatórios.');
      setInfoOpen(true);
      return;
    }

    const newAdmin = {
      id: 'admin-1',
      name: 'Administrador Master',
      username: form.adminUsername,
      password: form.adminPassword,
      role: 'admin' as const
    };

    (async () => {
      try {
        const API = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000/api';
        const res = await fetch(`${API.replace(/\/$/, '')}/establishment`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            address: form.address,
            cep: form.cep,
            cpfCnpj: form.cpfCnpj,
            logo: form.logo || 'https://cervejacamposdojordao.com.br/wp-content/uploads/2021/08/logo-playpub.png',
            serviceCharge: form.serviceCharge,
            adminUser: { name: 'Administrador Master', username: form.adminUsername, password: form.adminPassword },
            theme: {
              background: '#06120c',
              card: '#0d1f15',
              text: '#fefce8',
              primary: '#d18a59',
              accent: '#c17a49'
            }
          })
        });
        if (!res.ok) {
          const txt = await res.text();
          setInfoMessage('Erro ao criar estabelecimento: ' + txt);
          setInfoOpen(true);
          return;
        }
        const created = await res.json();
        setEstablishment({ ...created, theme: { background: '#06120c', card: '#0d1f15', text: '#fefce8', primary: '#d18a59', accent: '#c17a49', ...(created.theme || {}) } });
        setInfoMessage('Estabelecimento e Admin cadastrados com sucesso!');
        setInfoOpen(true);
        // navigate after user closes modal
        // we'll store a flag to navigate on close
        setNavigateOnClose(true);
      } catch (err) {
        console.error(err);
        setInfoMessage('Erro ao criar estabelecimento. Confira o servidor.');
        setInfoOpen(true);
      }
    })();
  };

  const [infoOpen, setInfoOpen] = React.useState(false);
  const [infoMessage, setInfoMessage] = React.useState<string | undefined>(undefined);
  const [navigateOnClose, setNavigateOnClose] = React.useState(false);
  const [navigatePath, setNavigatePath] = React.useState<string>('/');

  React.useEffect(() => {
    (async () => {
      try {
        const API = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000/api';
        const res = await fetch(`${API.replace(/\/$/, '')}/establishment`);
        if (res.ok) {
          const body = await res.json();
          if (body) {
            setInfoMessage('Estabelecimento já cadastrado. Faça login para editar.');
            setInfoOpen(true);
            setNavigateOnClose(true);
            setNavigatePath('/login');
          }
        }
      } catch (err) {
        // ignore network errors here; user can still try to register
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#06120c] p-4 sm:p-6 flex items-center justify-center py-10">
      <div className="max-w-3xl w-full space-y-8 px-4 sm:px-6 lg:px-0">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-[#d18a59] flex items-center gap-2 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        
        <div className="text-center">
          <h2 className="text-4xl font-serif text-[#d18a59] uppercase tracking-widest">Novo Restaurante</h2>
          <p className="mt-2 text-gray-100 opacity-60 uppercase text-[10px] font-bold tracking-[0.2em]">Configure sua plataforma de gestão</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-10 bg-[#0d1f15] p-6 sm:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
          {/* Dados do Estabelecimento */}
          <div className="space-y-6">
            <h3 className="text-white font-serif text-xl border-b border-white/10 pb-2">1. Dados do Estabelecimento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Nome do Restaurante</label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d18a59]" />
                  <input 
                    type="text" 
                    required 
                    className="w-full bg-[#06120c] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-1 focus:ring-[#d18a59] outline-none"
                    placeholder="Ex: Playpub Campos"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">CPF / CNPJ</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d18a59]" />
                  <input 
                    type="text" 
                    className="w-full bg-[#06120c] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-1 focus:ring-[#d18a59] outline-none"
                    placeholder="00.000.000/0000-00"
                    value={form.cpfCnpj}
                    onChange={e => setForm({...form, cpfCnpj: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">CEP</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d18a59]" />
                  <input 
                    type="text" 
                    className="w-full bg-[#06120c] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-1 focus:ring-[#d18a59] outline-none"
                    placeholder="00000-000"
                    value={form.cep}
                    onChange={e => setForm({...form, cep: e.target.value})}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Endereço Completo</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d18a59]" />
                  <input 
                    type="text" 
                    required 
                    className="w-full bg-[#06120c] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-1 focus:ring-[#d18a59] outline-none"
                    placeholder="Rua, Número, Bairro, Cidade"
                    value={form.address}
                    onChange={e => setForm({...form, address: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Taxa de Serviço (%)</label>
                <div className="relative">
                  <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d18a59]" />
                  <input 
                    type="number" 
                    required 
                    className="w-full bg-[#06120c] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-1 focus:ring-[#d18a59] outline-none"
                    value={form.serviceCharge}
                    onChange={e => setForm({...form, serviceCharge: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">URL do Logo</label>
                <div className="relative">
                  <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d18a59]" />
                  <input 
                    type="text" 
                    className="w-full bg-[#06120c] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-1 focus:ring-[#d18a59] outline-none"
                    placeholder="https://..."
                    value={form.logo}
                    onChange={e => setForm({...form, logo: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dados de Login Admin */}
          <div className="space-y-6">
            <h3 className="text-white font-serif text-xl border-b border-white/10 pb-2">2. Acesso Administrativo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Usuário de Login</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d18a59]" />
                  <input 
                    type="text" 
                    required 
                    className="w-full bg-[#06120c] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-1 focus:ring-[#d18a59] outline-none"
                    placeholder="admin"
                    value={form.adminUsername}
                    onChange={e => setForm({...form, adminUsername: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 ml-1">Senha do Painel</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d18a59]" />
                  <input 
                    type="password" 
                    required 
                    className="w-full bg-[#06120c] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-1 focus:ring-[#d18a59] outline-none"
                    placeholder="••••••••"
                    value={form.adminPassword}
                    onChange={e => setForm({...form, adminPassword: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-[#d18a59] text-black font-black py-4 sm:py-6 rounded-2xl hover:bg-[#c17a49] transition-all uppercase tracking-[0.3em] text-xs shadow-2xl">
            Concluir e Abrir Estabelecimento
          </button>
        </form>
      </div>
      <InfoModal open={infoOpen} title="Mensagem" message={infoMessage} onClose={() => { setInfoOpen(false); if (navigateOnClose) navigate(navigatePath); setNavigateOnClose(false); }} />
    </div>
  );
};

export default RegistrationView;
