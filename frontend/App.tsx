import React, { useEffect } from 'react';
// Fix: Use namespace import for react-router-dom to resolve "no exported member" errors
import * as ReactRouterDOM from 'react-router-dom';
import { AppProvider, useApp } from './store';
import AdminDashboard from './views/AdminDashboard';
import WaiterDashboard from './views/WaiterDashboard';
import CustomerView from './views/CustomerView';
import RegistrationView from './views/RegistrationView';
import LoginView from './views/LoginView';
import MesaAberturaView from './views/MesaAberturaView';
import { LogOut, LayoutDashboard, UserCheck, Utensils, Settings } from 'lucide-react';

const { HashRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } = ReactRouterDOM;

const ProtectedRoute: React.FC<{ children: React.ReactNode, role: 'admin' | 'waiter' }> = ({ children, role }) => {
  const { currentUser } = useApp();
  if (!currentUser || currentUser.role !== role) {
    return <Navigate to={`/login/${role}`} replace />;
  }
  return <>{children}</>;
};

const SetupDevice = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0a] relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/5 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 text-center space-y-12 max-w-full sm:max-w-2xl w-full">
        <div className="space-y-4">
          <img src="https://cervejacamposdojordao.com.br/wp-content/uploads/2021/08/logo-playpub.png" alt="Logo" className="h-24 mx-auto drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]" />
          <h1 className="text-4xl font-serif text-white uppercase tracking-tighter">Sistema de Gestão</h1>
          <p className="text-gray-500 max-w-md mx-auto uppercase text-[10px] font-bold tracking-[0.2em]">Selecione o modo de operação para este terminal</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/login/waiter" className="group p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl hover:border-[#d18a59] transition-all flex flex-col items-center gap-4 hover:bg-zinc-800/80">
            <div className="p-4 bg-[#d18a59]/10 rounded-full group-hover:scale-110 transition-transform">
              <UserCheck className="w-8 h-8 text-[#d18a59]" />
            </div>
            <div className="text-center">
              <span className="block font-bold text-white uppercase text-xs tracking-widest">Garçom</span>
              <span className="text-[10px] text-gray-500 uppercase">Gestão de Pedidos</span>
            </div>
          </Link>

          <Link to="/login/admin" className="group p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl hover:border-[#d18a59] transition-all flex flex-col items-center gap-4 hover:bg-zinc-800/80">
            <div className="p-4 bg-[#d18a59]/10 rounded-full group-hover:scale-110 transition-transform">
              <LayoutDashboard className="w-8 h-8 text-[#d18a59]" />
            </div>
            <div className="text-center">
              <span className="block font-bold text-white uppercase text-xs tracking-widest">Painel ADM</span>
              <span className="text-[10px] text-gray-500 uppercase">Configuração Geral</span>
            </div>
          </Link>
        </div>
        
        <div className="pt-12 border-t border-zinc-800/50">
          <Link to="/register-establishment" className="text-xs text-gray-500 hover:text-[#d18a59] transition-colors flex items-center justify-center gap-2 uppercase font-black tracking-widest">
            <Settings className="w-4 h-4" /> Registrar Novo Estabelecimento
          </Link>
        </div>
      </div>
    </div>
  );
};

const NavigationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, setCurrentUser, establishment, deviceTableId } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/');
  };

  const isCustomerView = location.pathname.includes('/customer');
  const isHome = location.pathname === '/';
  const isRegister = location.pathname === '/register-establishment';
  const isLogin = location.pathname.includes('/login');

  if (isCustomerView || isHome || isRegister || isLogin) return <main className="flex-1">{children}</main>;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      {currentUser && (
        <header className="bg-black/80 backdrop-blur-xl border-b border-zinc-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center gap-4">
              {establishment.logo ? (
                <img src={establishment.logo} className="h-8 filter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" alt="Logo" />
              ) : null}
             <div className="hidden sm:block border-l border-zinc-800 pl-4">
               <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-none mb-1">{currentUser.role === 'admin' ? 'Administrador' : 'Colaborador'}</p>
               <p className="text-sm font-bold text-white">{currentUser.name}</p>
             </div>
          </div>
          {!deviceTableId && (
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          )}
        </header>
      )}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <NavigationWrapper>
          <Routes>
            <Route path="/" element={<SetupDevice />} />
            <Route path="/register-establishment" element={<RegistrationView />} />
            <Route path="/login/:role" element={<LoginView />} />
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/waiter" element={<ProtectedRoute role="waiter"><WaiterDashboard /></ProtectedRoute>} />
            <Route path="/abrir-mesa" element={<ProtectedRoute role="waiter"><MesaAberturaView onMesaAberta={() => window.location.hash = '#/mesa'}/></ProtectedRoute>} />
            <Route path="/mesa" element={<ProtectedRoute role="waiter"><CustomerView /></ProtectedRoute>} />
            <Route path="/customer" element={<CustomerView />} />
          </Routes>
        </NavigationWrapper>
      </HashRouter>
    </AppProvider>
  );
};

export default App;
