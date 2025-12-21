import React, { useState, useEffect } from 'react';
import { useApp } from '../store';
import { Plus, Trash2, Edit3, Beer, Users, Grid, DollarSign, Image as ImageIcon, Tag, X, Check, Star, TrendingUp, BarChart3, PieChart, ShoppingBag, MessageSquare, Clock, Settings, Palette, Lock, Save } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import InfoModal from '../components/InfoModal';
import PaymentConfirmModal from '../components/PaymentConfirmModal';
import { TableStatus } from '../types';
import { Product } from '../types';


const AdminDashboard: React.FC = () => {
  const { 
    products, setProducts, toggleProductHighlight,
    waiters, addWaiter, deleteWaiter, 
    categories, addCategory, deleteCategory, updateCategory,
    tables, orders, feedbacks, establishment, setEstablishment,
  addProduct, deleteProduct, saveEstablishment,
  updateProduct, updateTableStatus,
  } = useApp();
  // Cálculo do NPS médio (averageRating)
  const averageRating = feedbacks.length > 0 
    ? feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length 
    : 0;
  
  const [activeTab, setActiveTab] = useState<'finance' | 'mesas' | 'menu' | 'categories' | 'waiters' | 'feedbacks' | 'settings' | 'closed'>('finance');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditingCategory, setIsEditingCategory] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ 
    name: '', price: 0, category: categories[0] || 'Geral', image: '', description: '', isHighlight: false
  });
  
  const [waiterName, setWaiterName] = useState('');
  const [waiterPassword, setWaiterPassword] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [closedTables, setClosedTables] = useState<any[]>([]);
  const [isLoadingClosed, setIsLoadingClosed] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [waiterToDelete, setWaiterToDelete] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | undefined>(undefined);
  const [finalizingTableId, setFinalizingTableId] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentModalAmount, setPaymentModalAmount] = useState<number | undefined>(undefined);
  const [paymentModalServicePercent, setPaymentModalServicePercent] = useState<number | undefined>(undefined);

  const handleUpdateTheme = (key: string, value: string) => {
    setEstablishment({
      ...establishment,
      theme: {
        ...establishment.theme,
        [key]: value
      }
    });
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const ok = await saveEstablishment();
      if (ok) {
        setInfoMessage('Alterações salvas com sucesso!');
        setInfoOpen(true);
      } else {
        setInfoMessage('Erro ao salvar alterações.');
        setInfoOpen(true);
      }
    } catch (e) {
      setInfoMessage('Erro ao salvar alterações.');
      setInfoOpen(true);
    }
    setIsSaving(false);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const product: Product = {
      id: Math.random().toString(36).substr(2, 9),
      name: newProduct.name || 'Novo Item',
      price: Number(newProduct.price) || 0,
      description: newProduct.description || '',
      category: typeof newProduct.category === 'string' ? newProduct.category : (newProduct.category?.name || categories[0] || 'Geral'),
      image: newProduct.image || 'https://picsum.photos/400/300',
      isHighlight: !!newProduct.isHighlight
    };
    addProduct(product);
    setIsAddingProduct(false);
    setNewProduct({ name: '', price: 0, category: categories[0] || 'Geral', image: '', description: '', isHighlight: false });
  };

  const handleAddCategory = () => {
    if (!categoryName.trim()) return;
    addCategory(categoryName.trim());
    setCategoryName('');
  };

  const handleAddWaiter = () => {
    if (!waiterName.trim() || !waiterPassword.trim()) {
      setInfoMessage('Por favor, informe o nome e a senha do garçom.');
      setInfoOpen(true);
      return;
    }
    addWaiter(waiterName, waiterPassword);
    setWaiterName('');
    setWaiterPassword('');
  };

  const handleUpdateCategory = (oldName: string) => {
    if (!newCatName.trim()) return;
    updateCategory(oldName, newCatName);
    setIsEditingCategory(null);
    setNewCatName('');
  };

  const totalRevenue = orders.reduce((acc, o) => acc + o.total, 0);
  const totalService = orders.reduce((acc, o) => acc + (Number(o.serviceValue || 0) || 0), 0);
  const averageTicket = orders.length > 0 ? totalRevenue / orders.length : 0;
  

  // Corrige para considerar produtos existentes e não só pedidos
  const productRanking = products.reduce((acc: any, p) => {
    const totalVendidos = orders.flatMap(o => o.items).filter(i => String(i.productId) === String(p.id)).reduce((sum, i) => sum + i.quantity, 0);
    acc[p.name] = totalVendidos;
    return acc;
  }, {});

  // Corrigir: topProducts não estava declarado
  const topProducts = Object.entries(productRanking)
    .filter(([, qty]) => Number(qty) > 0)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-serif text-white uppercase">Painel de Gestão</h2>
          <p className="text-[#d18a59] text-[10px] uppercase font-bold tracking-[0.2em] mt-1">Sessão Administrativa • {establishment.name}</p>
        </div>
        <div className="flex bg-[#0d1f15] p-1 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar max-w-full">
          {[
            { id: 'finance', icon: BarChart3, label: 'Financeiro' },
            { id: 'mesas', icon: Grid, label: 'Mesas' },
            { id: 'menu', icon: Beer, label: 'Cardápio' },
            { id: 'categories', icon: Tag, label: 'Categorias' },
            { id: 'waiters', icon: Users, label: 'Equipe' },
            { id: 'feedbacks', icon: MessageSquare, label: 'Avaliações' },
            { id: 'closed', icon: Grid, label: 'Mesas Fechadas' },
            { id: 'settings', icon: Settings, label: 'Ajustes' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap shrink-0 min-w-[120px] ${activeTab === tab.id ? 'bg-[#d18a59] text-black shadow-lg shadow-[#d18a59]/20' : 'text-gray-500 hover:text-white'}`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <tab.icon className="w-4 h-4" />
              <span className="inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'finance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[#0d1f15] p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp className="w-12 h-12" /></div>
              <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Receita Total</p>
              <p className="text-3xl font-serif text-[#d18a59] mt-2">R$ {totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-[#0d1f15] p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><DollarSign className="w-12 h-12" /></div>
              <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Taxa de Serviço (Total)</p>
              <p className="text-3xl font-serif text-[#d18a59] mt-2">R$ {totalService.toFixed(2)}</p>
            </div>
            <div className="bg-[#0d1f15] p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><ShoppingBag className="w-12 h-12" /></div>
              <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Pedidos</p>
              <p className="text-3xl font-serif text-white mt-2">{orders.length}</p>
            </div>
            <div className="bg-[#0d1f15] p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><DollarSign className="w-12 h-12" /></div>
              <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Ticket Médio</p>
              <p className="text-3xl font-serif text-white mt-2">R$ {averageTicket.toFixed(2)}</p>
              <p className="text-[10px] text-gray-400 mt-2">Ticket médio = Receita Total / Nº de Pedidos</p>
            </div>
            <div className="bg-[#0d1f15] p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Star className="w-12 h-12" /></div>
              <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">NPS Médio</p>
              <p className="text-3xl font-serif text-white mt-2">{averageRating.toFixed(1)} <span className="text-xs">★</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0d1f15] p-8 rounded-[2rem] border border-white/5 space-y-6">
              <h4 className="text-xl font-serif flex items-center gap-2 text-white"><Star className="w-5 h-5 text-[#d18a59]" /> Mais Vendidos</h4>
              <div className="space-y-4">
                {topProducts.length > 0 ? topProducts.map(([name, qty]: any, i) => (
                  <div key={name} className="flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                      <span className="w-6 h-6 rounded-lg bg-[#06120c] flex items-center justify-center text-[10px] font-bold text-[#d18a59]">{i+1}</span>
                      <p className="text-sm text-gray-200 group-hover:text-white transition-colors">{name}</p>
                    </div>
                    <p className="text-sm font-bold text-[#d18a59]">{qty} vds</p>
                  </div>
                )) : (
                  <p className="text-gray-600 italic text-sm py-10 text-center">Nenhuma venda registrada ainda</p>
                )}
              </div>
            </div>
            <div className="bg-[#0d1f15] p-8 rounded-[2rem] border border-white/5 space-y-6">
              <h4 className="text-xl font-serif flex items-center gap-2 text-white"><PieChart className="w-5 h-5 text-[#d18a59]" /> Mix de Categorias</h4>
              <div className="h-48 flex items-end gap-3 justify-center pt-4 overflow-x-auto no-scrollbar scrollbar-thin scrollbar-thumb-[#d18a59]/30">
                {categories.map((cat) => {
                  const catName = typeof cat === 'string' ? cat : cat?.name;
                  const count = products.filter(p => p.category === catName).length;
                  const totalProducts = products.length || 1;
                  // Altura proporcional, mínimo 20px, máximo 100% do container
                  const heightPx = Math.max(20, Math.round((count / totalProducts) * 160));
                  return (
                    <div key={catName} className="flex flex-col items-center gap-2 w-20 shrink-0 group">
                      <div className="w-10 bg-[#d18a59]/20 border-t-2 border-x-2 border-[#d18a59]/40 rounded-t-lg transition-all group-hover:bg-[#d18a59]/40" style={{ height: `${heightPx}px` }}></div>
                      <span className="text-[10px] uppercase font-black text-gray-500 mt-2 whitespace-nowrap block w-full text-center break-words">{catName}</span>
                      <span className="text-[12px] text-[#d18a59] font-black">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'closed' && (
        <div className="space-y-6">
          <h3 className="text-2xl font-serif text-white">Mesas Finalizadas</h3>
          <div className="grid grid-cols-1 gap-4">
            {(() => {
              // agrupa pedidos pagos por mesa
              const paidOrders = orders.filter(o => o.status === 'PAID');
              const grouped: Record<string, { tableNumber?: number, orders: any[], total: number }> = {};
              for (const o of paidOrders) {
                const tid = String(o.tableId);
                if (!grouped[tid]) grouped[tid] = { tableNumber: undefined, orders: [], total: 0 };
                grouped[tid].orders.push(o);
                grouped[tid].total += Number(o.total || 0) + Number(o.serviceValue || 0);
              }
              const rows = Object.entries(grouped);
              if (rows.length === 0) return <p className="text-gray-500 italic">Nenhuma mesa finalizada ainda.</p>;
              return rows.map(([tid, g]) => {
                const table = tables.find(t => String(t.id) === tid);
                const service = establishment.serviceCharge || 0;
                const totalWithService = g.total;
                return (
                  <div key={tid} className="bg-[#0d1f15] p-6 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-bold text-white">Mesa {table?.number || tid}</h4>
                        <p className="text-xs text-gray-400">Pedidos: {g.orders.length}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Total</p>
                        <p className="text-2xl font-serif text-[#d18a59]">R$ {totalWithService.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">(Inclui taxa de serviço {service}%)</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {g.orders.map((o, i) => (
                        <div key={o.id} className="flex justify-between items-center">
                          <div className="text-sm text-white">Cliente {i+1}</div>
                          <div className="text-sm text-gray-300 text-right">
                            <div>R$ {Number(o.total).toFixed(2)}</div>
                            <div className="text-[11px] text-gray-500">Serviço: R$ {(Number(o.serviceValue || 0)).toFixed(2)} {o.servicePaid ? '' : '(não pago)'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {activeTab === 'mesas' && (
        <div className="space-y-6">
          <h3 className="text-2xl font-serif text-white">Gerenciar Mesas</h3>
          <div className="grid grid-cols-1 gap-4">
              {tables.filter(t => t.status !== TableStatus.AVAILABLE).map(table => {
              const tableOrders = orders.filter(o => String(o.tableId) === String(table.id));
              const subtotal = tableOrders.reduce((s, o) => s + Number(o.total || 0), 0);
              const service = establishment.serviceCharge || 0;
              return (
                <div key={table.id} className="bg-[#0d1f15] p-6 rounded-2xl border border-white/5 flex justify-between items-center">
                  <div>
                    <h4 className="text-lg font-bold text-white">Mesa {table.number}</h4>
                    <p className="text-xs text-gray-400">Status: {table.status} • Pedidos: {tableOrders.length}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Subtotal</div>
                      <div className="text-xl font-serif text-[#d18a59]">R$ {subtotal.toFixed(2)}</div>
                    </div>
                    <button onClick={() => { setFinalizingTableId(String(table.id)); setPaymentModalAmount(subtotal); setPaymentModalServicePercent(service); setPaymentModalOpen(true); }} className="px-4 py-2 rounded-2xl bg-[#d18a59] text-black font-bold">Finalizar Mesa</button>
                  </div>
                </div>
              );
            })}
            {tables.filter(t => t.status !== TableStatus.AVAILABLE).length === 0 && (
              <p className="text-gray-500">Nenhuma mesa ativa no momento.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'menu' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-serif text-white">Gestão de Menu</h3>
            <button 
              onClick={() => setIsAddingProduct(true)}
              className="bg-[#d18a59] text-black px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#c17a49] transition-all text-xs uppercase tracking-widest shadow-lg">
              <Plus className="w-4 h-4" /> Novo Item
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <div key={product.id} className="bg-[#0d1f15] rounded-3xl overflow-hidden border border-white/5 group hover:border-[#d18a59]/50 transition-all relative">
                <div className="relative h-56 bg-cover bg-center" style={{ backgroundImage: `url(${product.image})` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute left-4 bottom-4">
                    <h4 className="text-white font-bold text-lg line-clamp-1">{product.name}</h4>
                    <span className="text-[#d18a59] font-bold text-sm">R$ {(Number(product.price) || 0).toFixed(2)}</span>
                  </div>
                  <div className="absolute top-3 right-3 z-10">
                    <button 
                      onClick={() => toggleProductHighlight(product.id)}
                      className={`p-2 rounded-full backdrop-blur-md transition-all ${product.isHighlight ? 'bg-[#d18a59] text-black' : 'bg-black/50 text-white hover:text-[#d18a59]'}`}
                    >
                      <Star className={`w-4 h-4 ${product.isHighlight ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                  <div className="absolute top-3 left-3 z-10 flex gap-2">
                    <button onClick={() => setEditingProduct(product)} className="bg-black/40 p-2 rounded-md text-white hover:bg-black/60"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => setProductToDelete(product.id)} className="bg-black/40 p-2 rounded-md text-white hover:bg-black/60"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-gray-400 text-xs uppercase font-bold tracking-widest">{typeof product.category === 'string' ? product.category : product.category?.name}</p>
                  <p className="text-sm text-gray-300 line-clamp-2 mt-2">{product.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PaymentConfirmModal open={paymentModalOpen} amount={paymentModalAmount} servicePercent={paymentModalServicePercent} showServiceToggle={true} onConfirm={async (servicePaid) => {
        setPaymentModalOpen(false);
        if (!finalizingTableId) return;
        try {
          await updateTableStatus(finalizingTableId, TableStatus.AVAILABLE, servicePaid);
          setInfoMessage('Mesa finalizada com sucesso.');
          setInfoOpen(true);
        } catch (e) {
          console.error('Erro ao finalizar mesa', e);
          setInfoMessage('Erro ao finalizar mesa.');
          setInfoOpen(true);
        }
        setFinalizingTableId(null);
      }} onCancel={() => { setPaymentModalOpen(false); setFinalizingTableId(null); }} />

      {editingProduct && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setEditingProduct(null)}></div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!editingProduct || !editingProduct.id) {
              setInfoMessage('Produto inválido. Atualize a página e tente novamente.');
              setInfoOpen(true);
              return;
            }
            const patch: Partial<Product> = {
              name: editingProduct.name,
              price: Number(editingProduct.price),
              description: editingProduct.description,
              category: editingProduct.category,
              image: editingProduct.image,
              isHighlight: !!editingProduct.isHighlight
            };
            try {
              await updateProduct(String(editingProduct.id), patch as any);
            } catch (err) {
              console.error('Erro ao atualizar produto', err);
              setInfoMessage('Erro ao atualizar produto.');
              setInfoOpen(true);
            }
            setEditingProduct(null);
          }} className="relative z-50 w-full max-w-full sm:max-w-2xl p-6 sm:p-8 rounded-t-[2rem] sm:rounded-2xl bg-[#0d1f15] border border-white/5">
            <h3 className="text-xl font-bold text-white mb-4">Editar Produto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="bg-[#06120c] p-3 rounded" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value} as Product)} />
              <input type="number" className="bg-[#06120c] p-3 rounded" value={String(editingProduct.price)} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)} as Product)} />
              <div className="col-span-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1 mb-1 block">Categoria</label>
                <select className="w-full bg-[#06120c] p-3 rounded" value={typeof editingProduct.category === 'string' ? editingProduct.category : (editingProduct.category?.name || categories[0] || 'Geral')} onChange={e => setEditingProduct({...editingProduct, category: e.target.value} as Product)}>
                  {categories.map(c => <option key={String(c)} value={String(c)}>{String(c)}</option>)}
                </select>
              </div>
              <input className="bg-[#06120c] p-3 rounded col-span-2" value={editingProduct.image} onChange={e => setEditingProduct({...editingProduct, image: e.target.value} as Product)} />
              <textarea className="bg-[#06120c] p-3 rounded col-span-2" value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value} as Product)} />
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!editingProduct.isHighlight} onChange={e => setEditingProduct({...editingProduct, isHighlight: e.target.checked} as Product)} /> Destaque</label>
            </div>
            <div className="flex gap-4 mt-6">
              <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 rounded bg-gray-800 text-white">Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded bg-amber-500 text-black font-bold">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-[#0d1f15] p-6 md:p-8 rounded-[2rem] border border-white/5 space-y-4">
            <h4 className="text-xl font-serif text-[#d18a59]">Nova Categoria</h4>
            <div className="flex flex-col md:flex-row gap-4">
              <input 
                type="text" 
                placeholder="Ex: Sobremesas, Petiscos..." 
                className="flex-1 bg-[#06120c] border border-white/5 rounded-2xl p-4 text-white outline-none focus:ring-1 focus:ring-[#d18a59]" 
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
              />
              <button 
                onClick={handleAddCategory}
                className="bg-[#d18a59] text-black font-bold py-4 md:px-8 rounded-2xl hover:bg-[#c17a49] transition-colors text-[10px] uppercase tracking-widest w-full md:w-auto">
                Adicionar Categoria
              </button>
            </div>
          </div>
          <div className="bg-[#0d1f15] rounded-[2rem] border border-white/5 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#06120c]/50 border-b border-white/5">
                <tr>
                  <th className="p-6 text-[10px] uppercase text-gray-500 font-bold tracking-widest">Nome da Categoria</th>
                  <th className="p-6 text-[10px] uppercase text-gray-500 font-bold tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => {
                  const catName = typeof cat === 'string' ? cat : cat?.name;
                  return (
                    <tr key={catName} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="p-6">
                        {isEditingCategory === catName ? (
                          <div className="flex items-center gap-2">
                             <input type="text" className="bg-[#06120c] border border-[#d18a59]/50 rounded-lg p-2 text-sm outline-none" value={newCatName} onChange={e => setNewCatName(e.target.value)} autoFocus />
                             <button onClick={() => handleUpdateCategory(catName)} className="text-green-500"><Check className="w-5 h-5" /></button>
                             <button onClick={() => setIsEditingCategory(null)} className="text-red-500"><X className="w-5 h-5" /></button>
                          </div>
                        ) : (
                          <span className="font-bold text-gray-200">{String(catName)}</span>
                        )}
                      </td>
                      <td className="p-6 text-right space-x-6">
                        <button onClick={() => { setIsEditingCategory(catName); setNewCatName(catName); }} className="text-gray-500 hover:text-[#d18a59] transition-colors"><Edit3 className="w-5 h-5" /></button>
                        <button onClick={() => setCategoryToDelete(catName)} className="text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-5 h-5" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'waiters' && (
        <div className="space-y-6">
          <div className="bg-[#0d1f15] p-8 rounded-[2rem] border border-white/5 space-y-4">
            <h4 className="text-xl font-serif text-[#d18a59]">Novo Colaborador</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Nome do Garçom..." 
                  className="w-full bg-[#06120c] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:ring-1 focus:ring-[#d18a59]" 
                  value={waiterName}
                  onChange={e => setWaiterName(e.target.value)}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="password" 
                  placeholder="Senha de Acesso..." 
                  className="w-full bg-[#06120c] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:ring-1 focus:ring-[#d18a59]" 
                  value={waiterPassword}
                  onChange={e => setWaiterPassword(e.target.value)}
                />
              </div>
              <button 
                onClick={handleAddWaiter}
                className="md:col-span-2 bg-[#d18a59] text-black font-black py-4 rounded-2xl hover:bg-[#c17a49] transition-colors text-[10px] uppercase tracking-[0.2em] shadow-lg">
                Cadastrar Garçom
              </button>
            </div>
          </div>
          <div className="bg-[#0d1f15] rounded-[2rem] border border-white/5 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#06120c]/50 border-b border-white/5">
                <tr>
                  <th className="p-6 text-[10px] uppercase text-gray-500 font-bold tracking-widest">Colaborador</th>
                  <th className="p-6 text-[10px] uppercase text-gray-500 font-bold tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {waiters.length === 0 ? (
                  <tr><td colSpan={2} className="p-12 text-center text-gray-600 italic">Nenhum garçom cadastrado.</td></tr>
                ) : (
                  waiters.map(waiter => (
                    <tr key={waiter.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="p-6 font-bold text-gray-200">{waiter.name}</td>
                      <td className="p-6 text-right">
                        <button onClick={() => setWaiterToDelete(waiter.id)} className="text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-5 h-5" /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'feedbacks' && (
        <div className="space-y-6">
           <div className="flex justify-between items-center">
             <h3 className="text-2xl font-serif text-white">Avaliações dos Clientes</h3>
             <div className="flex items-center gap-2 bg-[#d18a59]/10 px-4 py-2 rounded-xl border border-[#d18a59]/20">
                <Star className="w-4 h-4 text-[#d18a59] fill-current" />
                <span className="text-sm font-bold text-[#d18a59]">{averageRating.toFixed(1)} NPS</span>
             </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {feedbacks.length === 0 ? (
                <div className="col-span-full py-20 text-center opacity-30 space-y-4">
                   <MessageSquare className="w-16 h-16 mx-auto text-white" />
                   <p className="uppercase font-bold tracking-widest text-xs text-white">Nenhuma avaliação recebida</p>
                </div>
              ) : (
                feedbacks.map(f => (
                  <div key={f.id} className="bg-[#0d1f15] p-6 rounded-[2rem] border border-white/5 space-y-4 relative group hover:border-[#d18a59]/30 transition-all">
                     <div className="flex justify-between items-start">
                        <div className="flex gap-1">
                           {[1, 2, 3, 4, 5].map(n => (
                             <Star key={n} className={`w-3 h-3 ${n <= f.rating ? 'text-[#d18a59] fill-current' : 'text-gray-800'}`} />
                           ))}
                        </div>
                        <span className="text-[9px] uppercase font-black text-gray-600">Mesa {f.tableNumber}</span>
                     </div>
                     <p className="text-sm text-gray-300 italic">"{f.comment || 'Sem comentário.'}"</p>
                     <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        <Clock className="w-3 h-3 text-gray-700" />
                        <span className="text-[9px] text-gray-700 uppercase font-bold">{new Date(f.timestamp).toLocaleString()}</span>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-5 pb-20">
           <div className="bg-[#0d1f15] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
              <div className="flex items-center gap-3">
                 <DollarSign className="w-6 h-6 text-[#d18a59]" />
                 <h3 className="text-2xl font-serif text-white">Configurações de Serviço</h3>
              </div>
              <div className="max-w-xs">
                 <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-1">Taxa de Serviço (%)</label>
                 <div className="flex items-center gap-4 mt-1">
                   <input 
                    type="number" 
                    value={establishment.serviceCharge}
                    onChange={(e) => setEstablishment({...establishment, serviceCharge: Number(e.target.value)})}
                    className="flex-1 bg-[#06120c] border border-white/5 rounded-2xl p-4 text-white outline-none focus:ring-1 focus:ring-[#d18a59]" 
                   />
                   <span className="text-2xl font-serif text-[#d18a59]">%</span>
                 </div>
              </div>
           </div>

           <div className="bg-[#0d1f15] p-8 rounded-[2.5rem] border border-white/5 space-y-8">
              <div className="flex items-center gap-3">
                 <Palette className="w-6 h-6 text-[#d18a59]" />
                 <h3 className="text-2xl font-serif text-white">Personalização de Tema</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  { label: 'Fundo Geral', key: 'background' },
                  { label: 'Fundo de Cartões', key: 'card' },
                  { label: 'Cor de Texto', key: 'text' },
                  { label: 'Cor Primária (Botões)', key: 'primary' },
                  { label: 'Cor de Destaque', key: 'accent' },
                ].map(item => (
                  <div key={item.key} className="space-y-3">
                    <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-1">{item.label}</label>
                    <div className="flex items-center gap-4 bg-[#06120c] p-3 rounded-2xl border border-white/5">
                       <input 
                        type="color" 
                        value={(establishment.theme as any)[item.key]}
                        onChange={(e) => handleUpdateTheme(item.key, e.target.value)}
                        className="w-12 h-12 bg-transparent border-none cursor-pointer rounded-lg overflow-hidden"
                       />
                       <span className="text-xs font-mono text-gray-400 uppercase">{(establishment.theme as any)[item.key]}</span>
                    </div>
                  </div>
                ))}
              </div>
           </div>

           <div className="sticky bottom-8 left-0 right-0 flex justify-center z-50">
             <button 
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="bg-[#d18a59] text-black font-black px-12 py-5 rounded-3xl hover:bg-[#c17a49] transition-all flex items-center gap-4 shadow-[0_20px_40px_rgba(209,138,89,0.3)] uppercase tracking-[0.3em] text-xs">
               {isSaving ? <Clock className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
               {isSaving ? 'Salvando...' : 'Salvar Alterações'}
             </button>
           </div>
        </div>
      )}

      {activeTab === 'closed' && (
        <div className="space-y-6">
          <h3 className="text-2xl font-serif text-white">Relatório de Mesas Fechadas (Hoje)</h3>
          {isLoadingClosed ? (
            <div className="py-10 text-center text-gray-500">Carregando...</div>
          ) : closedTables.length === 0 ? (
            <div className="py-10 text-center text-gray-500">Nenhuma mesa fechada hoje.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {closedTables.map((mesa: any) => (
                <div key={mesa.tableNumber} className="bg-[#0d1f15] p-6 rounded-3xl border border-white/5 space-y-4">
                  <h4 className="text-xl font-serif text-[#d18a59]">Mesa {mesa.tableNumber}</h4>
                  <p className="text-gray-400 text-xs">Total: <span className="font-bold text-[#d18a59]">R$ {mesa.total.toFixed(2)}</span></p>
                  <div className="space-y-2">
                    {mesa.orders.map((order: any) => (
                      <div key={order.id} className="bg-black/10 p-3 rounded-xl">
                        <div className="flex justify-between text-xs">
                          <span>Pedido #{order.id}</span>
                          <span className="font-bold text-[#d18a59]">R$ {order.total.toFixed(2)}</span>
                        </div>
                        <div className="text-[10px] text-gray-500">{order.items.map((item: any) => `${item.quantity}x ${item.name}`).join(', ')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isAddingProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#0d1f15] w-full max-w-lg rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/5 bg-[#06120c]/50 flex justify-between items-center">
              <h3 className="text-2xl font-serif text-[#d18a59] uppercase tracking-tighter">Novo Produto</h3>
              <button onClick={() => setIsAddingProduct(false)} className="p-2 bg-white/5 rounded-full text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddProduct} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Nome do Item</label>
                  <input required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} type="text" className="w-full bg-[#06120c] p-4 rounded-2xl border border-white/5 mt-1 outline-none focus:ring-1 focus:ring-[#d18a59] text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Descrição Detalhada</label>
                  <textarea 
                    value={newProduct.description} 
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})} 
                    className="w-full bg-[#06120c] p-4 rounded-2xl border border-white/5 mt-1 outline-none focus:ring-1 focus:ring-[#d18a59] text-white min-h-[100px] resize-none"
                    placeholder="Ex: Hambúrguer artesanal com blend de carnes nobres..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Preço (R$)</label>
                    <input required value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} type="number" step="0.01" className="w-full bg-[#06120c] p-4 rounded-2xl border border-white/5 mt-1 outline-none focus:ring-1 focus:ring-[#d18a59] text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Categoria</label>
                    <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full bg-[#06120c] p-4 rounded-2xl border border-white/5 mt-1 outline-none focus:ring-1 focus:ring-[#d18a59] text-white appearance-none">
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">URL da Imagem</label>
                  <input 
                    type="text" 
                    value={newProduct.image} 
                    onChange={e => setNewProduct({...newProduct, image: e.target.value})} 
                    className="w-full bg-[#06120c] p-4 rounded-2xl border border-white/5 mt-1 outline-none focus:ring-1 focus:ring-[#d18a59] text-white" 
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
                <div>
                   <label className="flex items-center gap-3 cursor-pointer bg-[#06120c] p-4 rounded-2xl border border-white/5">
                      <input type="checkbox" checked={newProduct.isHighlight} onChange={e => setNewProduct({...newProduct, isHighlight: e.target.checked})} className="w-4 h-4 rounded accent-[#d18a59]" />
                      <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Exibir em Destaques da Semana</span>
                   </label>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAddingProduct(false)} className="flex-1 bg-white/5 p-5 rounded-2xl font-bold uppercase text-[10px] tracking-widest text-gray-400 hover:bg-white/10">Cancelar</button>
                <button type="submit" className="flex-1 bg-[#d18a59] text-black p-5 rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-[#c17a49] shadow-lg shadow-[#d18a59]/20">Salvar Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal open={!!productToDelete} title="Excluir Produto" message="Deseja realmente excluir este produto?" onConfirm={async () => { if (productToDelete) await deleteProduct(productToDelete); setProductToDelete(null); }} onCancel={() => setProductToDelete(null)} />
      <ConfirmModal open={!!categoryToDelete} title="Excluir Categoria" message="Excluir categoria e mover produtos para Geral?" onConfirm={async () => { if (categoryToDelete) await deleteCategory(categoryToDelete); setCategoryToDelete(null); }} onCancel={() => setCategoryToDelete(null)} />
      <ConfirmModal open={!!waiterToDelete} title="Remover Colaborador" message="Remover colaborador?" onConfirm={async () => { if (waiterToDelete) await deleteWaiter(waiterToDelete); setWaiterToDelete(null); }} onCancel={() => setWaiterToDelete(null)} />
      <InfoModal open={infoOpen} title="Mensagem" message={infoMessage} onClose={() => { setInfoOpen(false); setInfoMessage(undefined); }} />
    </div>
  );
};

export default AdminDashboard;
