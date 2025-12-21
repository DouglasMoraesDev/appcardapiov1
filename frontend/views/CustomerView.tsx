import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../store';
import { TableStatus, OrderItem, Table, Order, Product } from '../types';
import { ShoppingCart, Bell, Receipt, Plus, Minus, X, Check, Search, ChevronLeft, Lock, Star, Sparkles, MessageSquare, Timer, Send, UtensilsCrossed } from 'lucide-react';
import WaiterAuthModal from '../components/WaiterAuthModal';

// Componente de card fora do componente pai para preservar estado entre renders
const ProductCard: React.FC<{ product: Product; theme: any; addToCart: (p:any)=>void; openProductModal: (p:Product)=>void; expanded: boolean; onToggle: (id:string)=>void }> = ({ product, theme, addToCart, openProductModal, expanded, onToggle }) => {
  const desc = product.description || '';
  const showToggle = desc.length > 180;
  return (
    <div onClick={() => openProductModal(product)} style={{ backgroundColor: `${theme.card}80`, borderColor: 'rgba(255,255,255,0.05)' }} className={`rounded-[2rem] overflow-hidden flex gap-5 border p-0 group active:bg-white/5 transition-all cursor-pointer ${expanded ? 'shadow-2xl' : ''}`}>
      <div className="shrink-0 relative w-40 h-40 overflow-hidden rounded-[1rem]">
        <div className={`absolute inset-0 bg-cover bg-center transition-transform duration-300`} style={{ backgroundImage: `url(${product.image})`, transform: expanded ? 'scale(1.15)' : 'scale(1)' }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
        <div className="absolute left-3 bottom-3">
          <h4 className="text-white font-bold text-sm line-clamp-1">{product.name}</h4>
          <span style={{ color: theme.primary }} className="font-serif font-bold text-sm">R$ {(Number(product.price) || 0).toFixed(2)}</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); addToCart(product); }} style={{ backgroundColor: theme.primary }} className="absolute right-3 bottom-3 text-black p-2 rounded-full shadow-lg"><Plus className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 flex flex-col justify-between py-3 pr-4">
        <div className="space-y-1">
          <div className="flex justify-between items-start">
            <div className="sr-only">Nome do produto</div>
            {product.isHighlight && <Star style={{ color: theme.primary }} className="w-3 h-3 fill-current" />}
          </div>
          <>
            <p style={{ color: theme.text }} className={`text-[10px] opacity-70 leading-relaxed whitespace-pre-wrap break-words ${expanded ? '' : 'max-h-[4.5rem] overflow-hidden'}`}>{desc}</p>
            {showToggle && (
              <button onClick={(e) => { e.stopPropagation(); onToggle(product.id); }} className="text-[11px] font-bold text-[#d18a59] mt-2">{expanded ? 'Ler menos' : 'Ler mais'}</button>
            )}
          </>
        </div>
      </div>
    </div>
  );
};

const CustomerView: React.FC = () => {
  const { products, addOrder, updateTableStatus, tables, deviceTableId, setDeviceTableId, categories: appCategories, addFeedback, establishment, openTable, fetchOrdersByTable, currentUser } = useApp();
  const location = useLocation();
  const notifiedRef = useRef<Set<string>>(new Set());
  // Estado local para pedidos do cliente
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  // Busca pedidos da mesa sem sobrescrever o global
  useEffect(() => {
    let interval: any;
    const fetchOrders = async () => {
      if (!deviceTableId) return;
      const pedidos = await fetchOrdersByTable(deviceTableId);
      // detect new delivered items and notify once
      const deliveredIds: string[] = pedidos.flatMap(p => (p.items || []).filter((it: any) => it.status === 'DELIVERED').map((it: any) => String(it.id)));
      for (const id of deliveredIds) {
        if (!notifiedRef.current.has(id)) {
          notifiedRef.current.add(id);
          showNotification('Seu pedido foi entregue', 'info');
        }
      }
      setCustomerOrders(pedidos);
    };
    if (deviceTableId) {
      fetchOrders();
      interval = setInterval(fetchOrders, 5000);
    }
    return () => clearInterval(interval);
  }, [deviceTableId, fetchOrdersByTable]);

  // Support opening customer view with ?tableId= in URL (used by waiter to open client's menu)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tableId = params.get('tableId');
    if (tableId) setDeviceTableId(tableId);
  }, [location.search, setDeviceTableId]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [tableInput, setTableInput] = useState('');

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  const currentTable = tables.find(t => t.id === deviceTableId);
  const tableOrders = customerOrders;
  const subTotal = tableOrders.reduce((acc, o) => acc + o.total, 0);
  const serviceValue = subTotal * (establishment.serviceCharge / 100);
  const grandTotal = subTotal + serviceValue;

  const highlights = products.filter(p => p.isHighlight);
  const menuCategories = ['Todas', ...appCategories];

  const theme = establishment.theme;
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const toggleExpanded = (id: string) => setExpandedMap(prev => ({ ...prev, [id]: !prev[id] }));

  

  const filteredProducts = products.filter(p => 
    (activeCategory === 'Todas' || p.category === activeCategory) &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  let groupedProducts: Record<string, Product[]> = {};
  if (activeCategory === 'Todas') {
    groupedProducts['Todas'] = filteredProducts;
  } else {
    // show only the selected category
    const selected = filteredProducts.filter(p => p.category === activeCategory);
    if (selected.length > 0) groupedProducts[activeCategory] = selected;
    // include products that don't match any known category under 'Outros' when activeCategory explicitly 'Outros'
    if (activeCategory === 'Outros') {
      const others = filteredProducts.filter(p => !p.category || !appCategories.includes(p.category));
      if (others.length > 0) groupedProducts['Outros'] = others;
    }
  }

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleStartService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableInput) return;
    const tableId = await openTable(parseInt(tableInput));
    setDeviceTableId(tableId);
  };

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1, status: 'PENDING', observation: '' }];
    });
    showNotification(`${product.name} adicionado ao carrinho`);
  };

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setModalQty(1);
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
    setModalQty(1);
  };

  const addToCartMultiple = (product: Product, qty: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + qty } : item);
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: qty, status: 'PENDING', observation: '' }];
    });
    showNotification(`${product.name} adicionado ao carrinho`, 'success');
    closeProductModal();
  };

  const updateItemObservation = (id: string, obs: string) => {
    setCart(prev => prev.map(item => item.productId === id ? { ...item, observation: obs } : item));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === id) return { ...item, quantity: Math.max(0, item.quantity + delta) };
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !deviceTableId || isPlacingOrder) return;
    setIsPlacingOrder(true);
    try {
      await addOrder(deviceTableId, cart);
      // Após adicionar pedido, buscar novamente pedidos da mesa para garantir sincronização
      const pedidos = await fetchOrdersByTable(deviceTableId);
      setCustomerOrders(pedidos);
      setCart([]);
      setIsCartOpen(false);
      showNotification("Pedido enviado para a cozinha!", "success");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleCallWaiter = () => {
    if (!deviceTableId) return;
    updateTableStatus(deviceTableId, TableStatus.CALLING_WAITER);
    showNotification("O garçom já foi chamado!", "info");
  };

  const handleRequestFinalBill = () => {
    if (!deviceTableId) return;
    updateTableStatus(deviceTableId, TableStatus.BILL_REQUESTED);
    setIsBillOpen(false);
    setIsFeedbackOpen(true);
    showNotification("Solicitação de conta enviada!", "info");
  };

  const handleSubmitFeedback = () => {
    if (!currentTable) return;
    addFeedback({
      tableNumber: currentTable.number,
      rating: feedbackRating,
      comment: feedbackComment
    });
    setIsFeedbackOpen(false);
    setFeedbackComment('');
    setFeedbackRating(5);
    showNotification("Obrigado pela sua avaliação!", "success");
  };

  // Sair do modo cardápio somente após autenticação do garçom
  const handleExitKiosk = () => {
    setIsAuthOpen(true);
  };

  // Se não houver mesa ativa, não renderiza nada (tablet/garçom sempre tem mesa definida)
  if (!deviceTableId) {
    return null;
  }

  return (
    <div style={{ backgroundColor: theme.background, color: theme.text }} className="min-h-screen pb-40 overflow-x-hidden">
      <div className="relative h-64 overflow-hidden">
        <img src="https://cervejacamposdojordao.com.br/wp-content/uploads/2021/08/bg-playpub.jpg" className="w-full h-full object-cover scale-105" alt="Banner" />
        <div style={{ background: `linear-gradient(to top, ${theme.background}, transparent)` }} className="absolute inset-0 flex flex-col justify-end p-8">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <h1 className="text-5xl font-serif text-white uppercase tracking-tighter">{establishment.name.split(' ')[0]}</h1>
              <div className="flex items-center gap-3">
                 <span style={{ backgroundColor: theme.primary }} className="h-0.5 w-6"></span>
                 <p style={{ color: theme.primary }} className="font-bold tracking-[0.4em] text-[10px] uppercase">Mesa {currentTable?.number}</p>
              </div>
            </div>
            <button 
                onClick={handleExitKiosk}
                className="text-white hover:opacity-80 transition-opacity text-[9px] uppercase font-bold flex items-center gap-2 bg-black/40 px-4 py-2.5 rounded-full border border-white/10 backdrop-blur-lg">
                <Lock className="w-3 h-3" /> Sair
              </button>
          </div>
        </div>
      </div>

      {highlights.length > 0 && searchTerm === '' && (
        <div className="py-8 space-y-4">
           <div className="px-8 flex items-center gap-3">
             <Sparkles style={{ color: theme.primary }} className="w-4 h-4" />
             <h3 style={{ color: theme.text }} className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-80">Seleção do Chef</h3>
           </div>
           <div className="flex gap-6 overflow-x-auto px-8 no-scrollbar snap-x">
             {highlights.map(item => (
               <div 
                 key={item.id} 
                 onClick={() => openProductModal(item)}
                 style={{ backgroundColor: theme.card, borderColor: 'rgba(255,255,255,0.05)' }}
                 className="snap-start min-w-[260px] rounded-[2.5rem] overflow-hidden border relative active:scale-95 transition-all shadow-2xl group cursor-pointer"
               >
                 <div className="h-32 w-full bg-cover bg-center group-hover:scale-110 transition-transform duration-700" style={{ backgroundImage: `url(${item.image})` }}></div>
                 <div className="p-6 space-y-2">
                   <h4 className="font-bold text-base text-white truncate">{item.name}</h4>
                   <p style={{ color: theme.primary }} className="font-serif font-bold text-xl leading-none">R$ {item.price.toFixed(2)}</p>
                 </div>
                  <div style={{ backgroundColor: theme.primary }} className="absolute bottom-6 right-6 text-black p-2.5 rounded-full shadow-lg">
                    <Plus className="w-4 h-4" />
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      <div style={{ backgroundColor: `${theme.background}E6` }} className="sticky top-0 z-40 backdrop-blur-2xl p-6 pt-8 space-y-5 border-b border-white/5">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 transition-colors" />
          <input 
            type="text" 
            placeholder="Qual será a pedida de hoje?"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ backgroundColor: theme.card, color: theme.text, borderColor: 'rgba(255,255,255,0.05)' }}
            className="w-full border rounded-3xl pl-14 pr-6 py-4.5 text-sm transition-all placeholder-gray-300 outline-none"
          />
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          {menuCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{ 
                backgroundColor: activeCategory === cat ? theme.primary : theme.card,
                color: activeCategory === cat ? theme.background : theme.text,
                borderColor: 'rgba(255,255,255,0.05)'
              }}
              className="px-7 py-3 rounded-2xl text-[10px] font-bold transition-all whitespace-nowrap uppercase tracking-widest border"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 pt-10 space-y-12 max-w-4xl mx-auto">
        {Object.entries(groupedProducts).map(([catName, productsList]) => (
          <div key={catName} className="space-y-6">
            <div className="flex items-center gap-4 ml-2">
               <h2 className="text-white font-serif text-3xl uppercase tracking-tighter">{catName}</h2>
               <div className="flex-1 h-px bg-white/10"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {productsList.map(product => (
                <ProductCard key={product.id} product={product} theme={theme} addToCart={addToCart} openProductModal={openProductModal} expanded={!!expandedMap[product.id]} onToggle={toggleExpanded} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Removida a grande faixa de status para uma experiência menos intrusiva */}

      <div style={{ background: `linear-gradient(to top, #000, transparent)` }} className="fixed bottom-0 left-0 right-0 z-50 p-8">
        <div className="max-w-xl mx-auto flex gap-5">
          <button 
            onClick={handleCallWaiter}
            style={{ backgroundColor: theme.card, borderColor: 'rgba(255,255,255,0.1)' }}
            className="border text-white flex-1 py-5 rounded-[2rem] font-bold flex flex-col items-center justify-center gap-1.5 shadow-2xl active:scale-95 transition-all">
            <Bell className={`w-5 h-5 ${currentTable?.status === TableStatus.CALLING_WAITER ? 'text-red-500 animate-bounce' : ''}`} style={{ color: currentTable?.status === TableStatus.CALLING_WAITER ? undefined : theme.primary }} />
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-white">Garçom</span>
          </button>
          
          <button 
            onClick={() => setIsCartOpen(true)}
            style={{ backgroundColor: theme.primary }}
            className="text-black flex-[2.8] py-5 rounded-[2rem] font-bold flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all relative overflow-hidden group">
            <ShoppingCart className="w-5 h-5" />
            <div className="flex flex-col items-start leading-none">
              <span className="text-xs uppercase tracking-[0.2em] font-bold">Meu Pedido</span>
              <span className="text-[10px] font-bold opacity-70">Total: R$ {cartTotal.toFixed(2)}</span>
              {tableOrders.some(o => o.status !== 'PAID') && (
                <span className="mt-1 inline-block text-[10px] font-black uppercase text-white bg-red-600 px-2 py-1 rounded-full">Em preparo</span>
              )}
            </div>
            {cart.length > 0 && (
              <span className="absolute top-3 right-5 bg-black text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center border border-white/10 font-black shadow-lg">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            )}
          </button>

          <button 
            onClick={() => setIsBillOpen(true)}
            style={{ backgroundColor: theme.card, borderColor: 'rgba(255,255,255,0.1)' }}
            className="border text-white flex-1 py-5 rounded-[2rem] font-bold flex flex-col items-center justify-center gap-1.5 shadow-2xl active:scale-95 transition-all">
            <Receipt style={{ color: theme.primary }} className={`w-5 h-5 ${currentTable?.status === TableStatus.BILL_REQUESTED ? 'animate-pulse' : ''}`} />
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-white">Conta</span>
          </button>
        </div>
      </div>

      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-lg" onClick={() => setIsCartOpen(false)}></div>
          <div style={{ backgroundColor: theme.card }} className="relative w-full max-w-full sm:max-w-lg md:max-w-2xl rounded-t-[3rem] sm:rounded-2xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)] p-6 sm:p-10 space-y-8 animate-in slide-in-from-bottom duration-500 border-t sm:border-t-0 border-white/10">
            <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto opacity-50 mb-2"></div>
            <div className="flex justify-between items-center">
              <h3 style={{ color: theme.primary }} className="text-4xl font-serif uppercase tracking-tighter">Pedido</h3>
              <button onClick={() => setIsCartOpen(false)} className="p-4 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto space-y-6 no-scrollbar py-2">
              {cart.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                   <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-white" />
                   <p className="text-sm uppercase font-bold tracking-widest text-white">Sua sacola está vazia</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.productId} className="space-y-4 bg-black/30 p-5 rounded-[2rem] border border-white/5">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h5 className="font-bold text-base text-white">{item.name}</h5>
                        <p style={{ color: theme.primary }} className="text-xs font-bold">R$ {item.price.toFixed(2)} cada</p>
                      </div>
                      <div className="flex items-center gap-5 bg-black/40 rounded-2xl p-1.5 border border-white/5">
                        <button onClick={() => updateQuantity(item.productId, -1)} className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"><Minus className="w-4 h-4" /></button>
                        <span className="font-black text-sm w-4 text-center text-white">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, 1)} style={{ color: theme.primary }} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-gray-300" />
                      <input 
                        type="text" 
                        placeholder="Adicionar observação (ex: sem cebola)" 
                        value={item.observation || ''}
                        onChange={e => updateItemObservation(item.productId, e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-xs text-white placeholder-gray-300 outline-none"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="space-y-8 pt-6">
                <div className="flex justify-between items-end">
                  <span className="text-white font-bold uppercase text-[10px] tracking-widest mb-1 opacity-70">Subtotal</span>
                  <span style={{ color: theme.primary }} className="text-5xl font-serif font-bold">R$ {cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  onClick={handlePlaceOrder}
                  style={{ backgroundColor: theme.primary }}
                  className="w-full text-black font-black py-7 rounded-[2rem] text-[11px] uppercase tracking-[0.3em] hover:opacity-90 shadow-2xl transition-all active:scale-95">
                  Confirmar e Enviar Pedido
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isBillOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-lg" onClick={() => setIsBillOpen(false)}></div>
          <div style={{ backgroundColor: theme.card }} className="relative w-full max-w-full sm:max-w-lg md:max-w-2xl rounded-t-[3rem] sm:rounded-2xl shadow-2xl p-6 sm:p-10 space-y-8 animate-in slide-in-from-bottom duration-500 border-t sm:border-t-0 border-white/10">
            <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto opacity-50 mb-2"></div>
            <div className="flex justify-between items-center">
              <h3 style={{ color: theme.primary }} className="text-4xl font-serif uppercase tracking-tighter">Minha Conta</h3>
              <button onClick={() => setIsBillOpen(false)} className="p-4 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="max-h-[45vh] overflow-y-auto space-y-4 no-scrollbar border-y border-white/5 py-8">
              {tableOrders.length === 0 ? (
                <p className="text-center text-white py-10 uppercase font-bold text-xs">Nenhum consumo registrado</p>
              ) : (
                <>
                  {tableOrders.map((order, idx) => (
                    <div key={order.id} className="p-5 bg-black/20 rounded-3xl border border-white/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-200 font-black uppercase">Pedido #{idx + 1}</span>
                        <span style={{ color: theme.primary }} className="text-[10px] font-black">R$ {order.total.toFixed(2)}</span>
                      </div>
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-white font-medium">{item.quantity}x {item.name}</span>
                          <span className="text-gray-300">R$ {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  
                  <div className="p-5 space-y-3 bg-white/5 rounded-3xl mt-6 border border-white/5">
                     <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Subtotal</span>
                        <span className="text-white font-bold">R$ {subTotal.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Serviço ({establishment.serviceCharge}%)</span>
                        <span className="text-white font-bold">R$ {serviceValue.toFixed(2)}</span>
                     </div>
                  </div>
                </>
              )}
            </div>
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <span className="text-white font-bold uppercase text-[10px] tracking-widest mb-1 opacity-70">Total a Pagar</span>
                <span style={{ color: theme.primary }} className="text-5xl font-serif font-bold">R$ {grandTotal.toFixed(2)}</span>
              </div>
              <button 
                onClick={handleRequestFinalBill}
                disabled={grandTotal === 0}
                style={{ backgroundColor: theme.primary }}
                className="w-full text-black font-black py-7 rounded-[2rem] text-[11px] uppercase tracking-[0.3em] hover:opacity-90 shadow-2xl transition-all active:scale-95 disabled:opacity-20">
                Pedir Fechamento (Trazer Conta)
              </button>
            </div>
          </div>
        </div>
      )}

      {isFeedbackOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setIsFeedbackOpen(false)}></div>
          <div style={{ backgroundColor: theme.card }} className="relative w-full max-w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 border border-white/5 space-y-8 shadow-2xl animate-in zoom-in-95">
            <div className="text-center space-y-4">
               <div style={{ backgroundColor: `${theme.primary}1A`, borderColor: `${theme.primary}33` }} className="w-20 h-20 rounded-full flex items-center justify-center mx-auto border">
                 <Star style={{ color: theme.primary }} className="w-10 h-10 fill-current" />
               </div>
               <h3 style={{ color: theme.primary }} className="text-3xl font-serif uppercase tracking-tighter">Sua Opinião</h3>
               <p className="text-[10px] text-white uppercase font-black tracking-widest opacity-80">Como foi sua experiência no Playpub?</p>
            </div>

            <div className="flex justify-center gap-3">
               {[1, 2, 3, 4, 5].map(num => (
                 <button 
                   key={num} 
                   onClick={() => setFeedbackRating(num)}
                   style={{ 
                    backgroundColor: feedbackRating >= num ? theme.primary : 'black',
                    color: feedbackRating >= num ? 'black' : 'white',
                    borderColor: 'rgba(255,255,255,0.1)'
                   }}
                   className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all border">
                   <Star className={`w-6 h-6 ${feedbackRating >= num ? 'fill-current' : ''}`} />
                 </button>
               ))}
            </div>

            <div className="space-y-2">
               <label className="text-[10px] text-white uppercase font-black tracking-widest ml-4">Comentário (opcional)</label>
               <textarea 
                 value={feedbackComment}
                 onChange={e => setFeedbackComment(e.target.value)}
                 placeholder="O que mais gostou? No que podemos melhorar?"
                 className="w-full bg-black/50 border border-white/10 rounded-3xl p-6 text-sm text-white placeholder-gray-400 outline-none min-h-[120px] resize-none"
               />
            </div>

            <button 
              onClick={handleSubmitFeedback}
              style={{ backgroundColor: theme.primary }}
              className="w-full text-black font-black py-6 rounded-2xl text-[11px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
              Enviar Avaliação <Send className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsFeedbackOpen(false)}
              className="w-full text-[10px] text-white uppercase font-black tracking-widest opacity-40">Pular por enquanto</button>
          </div>
        </div>
      )}

      <WaiterAuthModal open={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={() => { setIsAuthOpen(false); setDeviceTableId(null); window.location.hash = '#/'; }} />

      {selectedProduct && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeProductModal}></div>
          <div style={{ backgroundColor: theme.card }} className="relative z-10 w-full max-w-md rounded-2xl p-6 border border-white/5 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start gap-4">
              <div className="w-28 h-28 bg-cover bg-center rounded-lg" style={{ backgroundImage: `url(${selectedProduct.image})` }}></div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{selectedProduct.name}</h3>
                <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap break-words">{selectedProduct.description}</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="text-2xl font-serif text-[#d18a59]">R$ {(Number(selectedProduct.price) || 0).toFixed(2)}</div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center bg-black/10 rounded-2xl p-2">
                <button onClick={() => setModalQty(q => Math.max(1, q - 1))} className="px-3 py-2">-</button>
                <div className="px-4 font-bold">{modalQty}</div>
                <button onClick={() => setModalQty(q => q + 1)} className="px-3 py-2">+</button>
              </div>
              <button onClick={() => addToCartMultiple(selectedProduct, modalQty)} style={{ backgroundColor: theme.primary }} className="text-black px-4 py-3 rounded-2xl font-bold">Adicionar</button>
              <button onClick={closeProductModal} className="px-4 py-3 rounded-2xl bg-white/5">Fechar</button>
            </div>
          </div>
        </div>
      )}


      {notification && (
        <div className="fixed top-12 left-8 right-8 z-[200] flex justify-center pointer-events-none">
          <div style={{ backgroundColor: theme.card, borderColor: notification.type === 'success' ? 'rgba(34,197,94,0.3)' : theme.primary }} className="px-10 py-6 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] flex items-center gap-5 animate-in fade-in slide-in-from-top-10 duration-700 border text-white">
            <div className={`p-2.5 rounded-full ${notification.type === 'success' ? 'bg-green-500/20' : 'bg-white/10'}`}>
              <Check className={`w-5 h-5 font-bold ${notification.type === 'success' ? 'text-green-500' : 'text-white'}`} />
            </div>
            <p className="font-bold text-xs uppercase tracking-widest">{notification.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerView;
