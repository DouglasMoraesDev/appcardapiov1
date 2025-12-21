import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import InfoModal from './components/InfoModal';
import { Product, Table, Order, TableStatus, OrderStatus, Establishment, User, OrderItem, Feedback, ThemeConfig } from './types';

interface AppContextType {
  establishment: Establishment;
  setEstablishment: (e: Establishment) => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  tables: Table[];
  setTables: React.Dispatch<React.SetStateAction<Table[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  waiters: User[];
  setWaiters: React.Dispatch<React.SetStateAction<User[]>>;
  feedbacks: Feedback[];
  addFeedback: (f: Omit<Feedback, 'id' | 'timestamp'>) => void;
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  accessToken: string | null;
  setAccessToken: (t: string | null) => void;
  logout: () => Promise<void>;
  deviceTableId: string | null;
  setDeviceTableId: (id: string | null) => void;

  // Novo: buscar pedidos de uma mesa sem sobrescrever o global
  fetchOrdersByTable: (tableId: string) => Promise<Order[]>;

  // Actions
  addOrder: (tableId: string, items: any[]) => void;
  updateTableStatus: (tableId: string, status: TableStatus) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrderItemStatus: (orderId: string, productId: string, status: 'PENDING' | 'DELIVERED') => void;
  deleteProduct: (productId: string) => void;
  addProduct: (product: Product) => void;
  toggleProductHighlight: (productId: string) => void;
  addWaiter: (name: string, password: string) => void;
  deleteWaiter: (id: string) => void;
  addCategory: (name: string) => void;
  deleteCategory: (name: string) => void;
  updateCategory: (oldName: string, newName: string) => void;
  openTable: (number: number) => string;
  showInfo: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const INITIAL_THEME: ThemeConfig = {
  background: "#06120c",
  card: "#0d1f15",
  text: "#fefce8",
  primary: "#d18a59",
  accent: "#c17a49"
};

const API_BASE = process.env?.VITE_API_URL || 'http://localhost:4000/api';

const INITIAL_PRODUCTS: Product[] = [];

const INITIAL_CATEGORIES: string[] = [];


export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [establishment, setEstablishment] = useState<Establishment>({ name: '', logo: '', address: '', serviceCharge: 10, theme: INITIAL_THEME } as any);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [waiters, setWaiters] = useState<User[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [deviceTableId, setDeviceTableId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | undefined>(undefined);

  const showInfo = (msg: string) => {
    setInfoMessage(msg);
    setInfoOpen(true);
  };

  // Track in-flight order submissions to avoid duplicate POSTs
  const inFlightOrdersRef = React.useRef<Set<string>>(new Set());

  // Defina fetchWithAuth ANTES de qualquer uso

  // Função para buscar pedidos de uma mesa específica (sem sobrescrever o global)
  const fetchOrdersByTable = useCallback(async (tableId: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/orders?tableId=${tableId}`);
      if (res.ok) {
        const pedidos = await res.json();
        return pedidos.map((o: any) => ({ ...o, id: String(o.id), items: (o.items || []).map((it: any) => ({ ...it, id: String(it.id), productId: String(it.productId) })) }));
      }
    } catch (e) {}
    return [];
  }, [accessToken]);

  // Load initial data from backend e refresh access token (refresh cookie)
  useEffect(() => {
    (async () => {
      try {
        let localAccess: string | null = null;
        let userDecoded: any = null;
        // Only attempt refresh if a refresh cookie is likely present (avoid unnecessary 401s)
        // httpOnly refresh cookies are not visible to JS, so also check a localStorage flag set at login
        const hasRefreshCookie = (typeof window !== 'undefined' && localStorage.getItem('hasRefresh') === '1') || (typeof document !== 'undefined' && document.cookie && document.cookie.indexOf('refreshToken=') !== -1);
        let d: any = null;
        if (hasRefreshCookie) {
          const r = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
          if (r.ok) {
            d = await r.json();
            localAccess = d.accessToken;
            userDecoded = d.user;
            setAccessToken(localAccess);
            setCurrentUser({ id: String(d.user.id), name: d.user.name, role: d.user.role } as any);
          } else {
            // Se não autenticado, limpa usuário e token
            setAccessToken(null);
            setCurrentUser(null);
            localAccess = null;
            userDecoded = null;
          }
        } else {
          // no refresh cookie -> treat as unauthenticated without calling the server
          setAccessToken(null);
          setCurrentUser(null);
          localAccess = null;
          userDecoded = null;
        }

        const headers: any = { 'Content-Type': 'application/json' };
        if (localAccess) headers['Authorization'] = `Bearer ${localAccess}`;

        const fetchWithRetry = async (url: string) => {
          let res = await fetch(url, { headers });
          if (res.status === 401 || res.status === 403) {
            // tenta renovar token usando cookie de refresh
            const refreshRes = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
            if (refreshRes.ok) {
              const d2 = await refreshRes.json();
              localAccess = d2.accessToken;
              userDecoded = d2.user;
              setAccessToken(localAccess);
              headers['Authorization'] = `Bearer ${localAccess}`;
              res = await fetch(url, { headers });
            } else {
              // Se não conseguir renovar, limpa usuário e token e encerra
              setAccessToken(null);
              setCurrentUser(null);
              return null;
            }
          }
          return res.ok ? await res.json() : null;
        };

        // Carrega dados públicos sempre, protegidos só se autenticado
        const [estRes, prodRes, catRes, tableRes, fbRes] = await Promise.all([
          fetchWithRetry(`${API_BASE}/establishment`).catch(() => null),
          fetchWithRetry(`${API_BASE}/products`).catch(() => []),
          fetchWithRetry(`${API_BASE}/categories`).catch(() => []),
          fetchWithRetry(`${API_BASE}/tables`).catch(() => []),
          fetchWithRetry(`${API_BASE}/feedbacks`).catch(() => [])
        ]);
        if (estRes) {
          setEstablishment({ ...estRes, theme: { ...INITIAL_THEME, ...(estRes.theme || {}) } });
        }
        if (Array.isArray(prodRes)) setProducts(prodRes.map((p: any) => ({ ...p, id: String(p.id), category: (typeof p.category === 'string' ? p.category : (p.category?.name || 'Geral')) } as any)));
        if (Array.isArray(catRes)) setCategories(catRes.map((c: any) => c.name));
        if (Array.isArray(tableRes)) setTables(tableRes.map((t: any) => ({ ...t, id: String(t.id) })));
        if (Array.isArray(fbRes)) setFeedbacks(fbRes.map((f: any) => ({ ...f, id: String(f.id) })));

        // Só busca dados protegidos se autenticado
        if (localAccess && userDecoded && userDecoded.role === 'admin') {
          const [orderRes, userRes] = await Promise.all([
            fetchWithRetry(`${API_BASE}/orders`).catch(() => []),
            fetchWithRetry(`${API_BASE}/users`).catch(() => []),
          ]);
          if (Array.isArray(orderRes)) setOrders(orderRes.map((o: any) => ({ ...o, id: String(o.id), items: (o.items || []).map((it: any) => ({ ...it, id: String(it.id), productId: String(it.productId) })) })));
          if (Array.isArray(userRes)) setWaiters(userRes.filter((u:any)=>u.role==='waiter').map((u:any)=>({ ...u, id: String(u.id) })));
        } else if (localAccess && userDecoded && userDecoded.role === 'customer') {
          // Para cliente, busca apenas pedidos da mesa (usa deviceTableId em memória)
          if (deviceTableId) {
            const orderRes = await fetchWithRetry(`${API_BASE}/orders?tableId=${deviceTableId}`).catch(() => []);
            if (Array.isArray(orderRes)) setOrders(orderRes.map((o: any) => ({ ...o, id: String(o.id), items: (o.items || []).map((it: any) => ({ ...it, id: String(it.id), productId: String(it.productId) })) })));
          }
        }
      } catch (err) {
        // Falha ao carregar API remota durante init — limpa usuário e token
        setAccessToken(null);
        setCurrentUser(null);
      } finally {
        setIsInitialized(true);
      }
    })();
  }, []);

  // When accessToken or currentUser changes, fetch protected resources for admins
  useEffect(() => {
    if (!accessToken || !currentUser) return;
    (async () => {
      try {
        if (currentUser.role === 'admin') {
          const [orderRes, userRes] = await Promise.all([
            fetchWithAuth(`${API_BASE}/orders`).catch(() => []),
            fetchWithAuth(`${API_BASE}/users`).catch(() => [])
          ]);
          if (Array.isArray(orderRes)) setOrders(orderRes.map((o: any) => ({ ...o, id: String(o.id), items: (o.items || []).map((it: any) => ({ ...it, id: String(it.id), productId: String(it.productId) })) })));
          if (Array.isArray(userRes)) setWaiters(userRes.filter((u:any)=>u.role==='waiter').map((u:any)=>({ ...u, id: String(u.id) })));
          } else if (currentUser.role === 'waiter') {
          // waiter may want to see orders
          const orderRes = await fetchWithAuth(`${API_BASE}/orders`).catch(() => []);
          if (Array.isArray(orderRes)) setOrders(orderRes.map((o: any) => ({ ...o, id: String(o.id), items: (o.items || []).map((it: any) => ({ ...it, id: String(it.id), productId: String(it.productId) })) })));
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [accessToken, currentUser]);

  // Quando o accessToken ou currentUser mudarem, busca dados protegidos para admins
  useEffect(() => {
    (async () => {
      if (!accessToken || !currentUser) return;
      try {
        if (currentUser.role === 'admin') {
          const ordersRes = await fetchWithAuth(`${API_BASE}/orders`);
          if (ordersRes && ordersRes.ok) {
            const ordersData = await ordersRes.json();
            setOrders(Array.isArray(ordersData) ? ordersData.map((o: any) => ({ ...o, id: String(o.id), items: (o.items || []).map((it: any) => ({ ...it, id: String(it.id), productId: String(it.productId) })) })) : []);
          }
          const usersRes = await fetchWithAuth(`${API_BASE}/users`);
          if (usersRes && usersRes.ok) {
            const usersData = await usersRes.json();
            setWaiters(Array.isArray(usersData) ? usersData.filter((u:any)=>u.role==='waiter').map((u:any)=>({ ...u, id: String(u.id) })) : []);
          }
        } else if (currentUser.role === 'waiter') {
          // para garçom, atualiza pedidos se necessário (usa deviceTableId em memória)
          if (deviceTableId) {
            const ordRes = await fetchWithAuth(`${API_BASE}/orders?tableId=${deviceTableId}`);
            if (ordRes && ordRes.ok) {
              const ordData = await ordRes.json();
              setOrders(Array.isArray(ordData) ? ordData.map((o: any) => ({ ...o, id: String(o.id), items: (o.items || []).map((it: any) => ({ ...it, id: String(it.id), productId: String(it.productId) })) })) : []);
            }
          }
        }
      } catch (e) {
        // fail silently
      }
    })();
  }, [accessToken, currentUser]);

  useEffect(() => {
    // Persistência automática só para admin autenticado
    // don't persist until initial load completed to avoid overwriting server values
    if (!isInitialized) return;
    (async () => {
      try {
        if (currentUser && currentUser.role === 'admin' && accessToken) {
          await fetchWithAuth(`${API_BASE}/establishment`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(establishment)
          });
        } else {
          // For non-admin users we do not persist to localStorage anymore.
          // Do nothing silently to avoid noisy console messages on reload.
        }
      } catch (e) {
        console.error('Failed to persist establishment to backend', e);
      }

      try {
        // Products, categories, tables, orders, waiters and feedbacks must be saved to backend explicitly.
        // We no longer persist them to localStorage here to avoid silent local-only state.
      } catch (e) {}
    })();
  }, [establishment, products, categories, tables, orders, waiters, feedbacks, currentUser, deviceTableId, accessToken]);

  const fetchWithAuth = async (input: RequestInfo, init?: RequestInit) => {
    // helper: verifica se um JWT expirou (com margem)
    const isTokenExpired = (token?: string | null) => {
      if (!token) return true;
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        const payload = JSON.parse(atob(parts[1]));
        const exp = typeof payload.exp === 'number' ? payload.exp : 0;
        // considera expirado com margem de 8s
        return Date.now() / 1000 > (exp - 8);
      } catch (e) {
        return true;
      }
    };

    let access = accessToken;
    // If we don't have an access token in memory, try a refresh first (avoids an initial 401)
    if (!access) {
      try {
        const hasRefreshCookie = (typeof window !== 'undefined' && localStorage.getItem('hasRefresh') === '1') || (typeof document !== 'undefined' && document.cookie && document.cookie.indexOf('refreshToken=') !== -1);
        if (hasRefreshCookie) {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
          if (refreshRes.ok) {
            const d = await refreshRes.json();
            access = d.accessToken;
            setAccessToken(access);
          }
        }
      } catch (e) {
        // ignore refresh failure here; we'll handle 401 after the request
      }
    }
    const headers = { 'Content-Type': 'application/json', ...(init?.headers as any || {}) } as any;

    // Se o token existir mas estiver expirado, tenta renovar antes da requisição
    if (access && isTokenExpired(access)) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (refreshRes.ok) {
          const d = await refreshRes.json();
          access = d.accessToken;
          setAccessToken(access);
        } else {
          // Não conseguiu renovar; limpa e força login
          setAccessToken(null);
          setCurrentUser(null);
          window.location.hash = '#/login/waiter';
          throw new Error('Sessão expirada. Faça login novamente.');
        }
      } catch (e) {
        setAccessToken(null);
        setCurrentUser(null);
        window.location.hash = '#/login/waiter';
        throw e;
      }
    }

    if (access) headers['Authorization'] = `Bearer ${access}`;
    let res = await fetch(input, { credentials: 'include', ...init, headers });

    if (res.status === 401 || res.status === 403) {
      // tentativa fallback: se a primeira requisição falhar, tenta renovar e repetir
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (refreshRes.ok) {
          const d = await refreshRes.json();
          access = d.accessToken;
          setAccessToken(access);
          headers['Authorization'] = `Bearer ${access}`;
          res = await fetch(input, { credentials: 'include', ...init, headers });
        } else {
          setAccessToken(null);
          setCurrentUser(null);
          window.location.hash = '#/login/waiter';
          throw new Error('Sessão expirada. Faça login novamente.');
        }
      } catch (e) {
        setAccessToken(null);
        setCurrentUser(null);
        window.location.hash = '#/login/waiter';
        throw e;
      }
    }

    return res;
  };

  const updateTableStatus = useCallback(async (tableId: string, status: TableStatus, servicePaid?: boolean) => {
    try {
      const body: any = { status };
      if (servicePaid !== undefined) body.servicePaid = !!servicePaid;
      const res = await fetchWithAuth(`${API_BASE}/tables/${tableId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      // backend may return updated orders for this table to allow frontend to show PAID orders/service values
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.updated) {
          setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t));
          if (Array.isArray(data.orders)) {
            const normalized = data.orders.map((o: any) => ({ ...o, id: String(o.id), items: (o.items || []).map((it: any) => ({ ...it, id: String(it.id), productId: String(it.productId) })) }));
            setOrders(prev => {
              const filtered = prev.filter(o => String(o.tableId) !== String(tableId));
              return [...filtered, ...normalized];
            });
            return;
          }
        }
      }
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t));
    } catch (e) {
      console.error('Failed to update table status', e);
      showInfo('Erro ao atualizar status da mesa. Verifique a conexão com o servidor.');
      return;
    }
    // Quando mesa fica disponível, buscar pedidos atualizados do servidor (eles foram marcados como PAID pelo backend)
    if (status === TableStatus.AVAILABLE) {
      try {
        const res = await fetchWithAuth(`${API_BASE}/orders?tableId=${tableId}`);
        if (res.ok) {
          const pedidos = await res.json();
          const normalized = (pedidos || []).map((o: any) => ({ ...o, id: String(o.id), items: (o.items || []).map((it: any) => ({ ...it, id: String(it.id), productId: String(it.productId) })) }));
          // remove old orders for this table and add the updated ones (keeps PAID orders visible for admin)
          setOrders(prev => {
            const filtered = prev.filter(o => String(o.tableId) !== String(tableId));
            return [...filtered, ...normalized];
          });
        } else {
          // fallback: don't remove local orders if fetch fails
          console.warn('Não foi possível obter pedidos atualizados da mesa', tableId);
        }
      } catch (err) {
        console.warn('Erro ao buscar pedidos da mesa após fechamento', err);
      }
    }
    // Quando mesa é ocupada, limpe pedidos antigos locais para evitar mostrar conta de cliente anterior
    if (status === TableStatus.OCCUPIED) {
      setOrders(prev => prev.filter(o => String(o.tableId) !== String(tableId)));
    }
  }, []);

  const openTable = async (number: number) => {
    try {
      // check existing
      const res = await fetchWithAuth(`${API_BASE}/tables`);
      const all = await res.json();
      const existing = all.find((t: any) => t.number === number);
      if (existing) {
        if (existing.status === TableStatus.AVAILABLE) {
          await updateTableStatus(String(existing.id), TableStatus.OCCUPIED);
        }
        // persist locally which waiter opened this table (if currentUser is waiter)
        try {
          if (currentUser && currentUser.role === 'waiter' && currentUser.id) {
            const usernameGuess = (currentUser as any).username || String(currentUser.name || '').replace(/\s+/g, '').toLowerCase();
            const payload = { id: String(currentUser.id), name: currentUser.name, username: usernameGuess };
            localStorage.setItem(`tableCreator_${existing.id}`, JSON.stringify(payload));
          }
        } catch (e) {}
        return String(existing.id);
      }
      const createRes = await fetchWithAuth(`${API_BASE}/tables`, { method: 'POST', body: JSON.stringify({ number }) });
      const created = await createRes.json();
      const newTable: Table = { id: String(created.id), number: created.number, status: created.status };
      setTables(prev => [...prev, newTable]);
      try {
        if (currentUser && currentUser.role === 'waiter' && currentUser.id) {
          const usernameGuess = (currentUser as any).username || String(currentUser.name || '').replace(/\s+/g, '').toLowerCase();
          const payload = { id: String(currentUser.id), name: currentUser.name, username: usernameGuess };
          localStorage.setItem(`tableCreator_${created.id}`, JSON.stringify(payload));
        }
      } catch (e) {}
      return newTable.id;
    } catch (e) {
      console.error('Failed to open/create table', e);
      showInfo('Erro ao abrir mesa. Verifique a conexão com o servidor.');
      throw e;
    }
  };

  const addOrder = useCallback(async (tableId: string, items: any[]) => {
    // Garante que cada item tem productId, name, price, quantity, status
    const normalizedItems = items.map(item => ({
      productId: Number(item.productId),
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity),
      status: item.status || 'PENDING',
      observation: item.observation || null
    }));
    const subtotal = normalizedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    // create a stable key for the order to detect duplicates
    const keyItems = normalizedItems.slice().sort((a,b)=>String(a.productId).localeCompare(String(b.productId))).map(i=>({ productId: i.productId, quantity: i.quantity }));
    const key = `${tableId}:${JSON.stringify(keyItems)}`;
    if (inFlightOrdersRef.current.has(key)) {
      // duplicate in-flight submission, ignore
      return;
    }
    inFlightOrdersRef.current.add(key);
    try {
      const res = await fetchWithAuth(`${API_BASE}/orders`, { method: 'POST', body: JSON.stringify({ tableId: Number(tableId), items: normalizedItems, total: subtotal }) });
      const created = await res.json();
      await updateTableStatus(String(created.tableId), TableStatus.OCCUPIED);
      // Após criar pedido, buscar novamente pedidos da mesa para garantir que os itens tenham o id correto do backend
      const pedidosRes = await fetchWithAuth(`${API_BASE}/orders?tableId=${tableId}`);
      if (pedidosRes.ok) {
        const pedidos = await pedidosRes.json();
        setOrders(pedidos.map((o: any) => ({ ...o, id: String(o.id), items: (o.items || []).map((it: any) => ({ ...it, id: String(it.id), productId: String(it.productId) })) })));
      }
    } catch (e) {
      console.error('Failed to add order', e);
      showInfo('Erro ao enviar pedido. Verifique a conexão com o servidor.');
      return;
    } finally {
      // clear in-flight marker
      try { inFlightOrdersRef.current.delete(key); } catch(e){}
    }
  }, [updateTableStatus]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, servicePaid?: boolean) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/orders/${orderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, servicePaid }) });
      if (res && res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? ({ ...o, status: updated.status, servicePaid: updated.servicePaid, serviceValue: String(updated.serviceValue || 0) } as any) : o));
      }
    } catch (e) {
      console.error('Failed to update order status', e);
      showInfo('Erro ao atualizar status do pedido. Verifique a conexão com o servidor.');
      return;
    }
  }, []);

  const updateOrderItemStatus = useCallback(async (orderId: string, itemId: string, status: 'PENDING' | 'DELIVERED') => {
    try {
      await fetchWithAuth(`${API_BASE}/orders/${orderId}/items/${itemId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      setOrders(prev => prev.map(order => {
        if (order.id !== orderId) return order;
        const newItems = order.items.map(item => item.id === itemId ? { ...item, status } : item);
        const allDelivered = newItems.every(i => i.status === 'DELIVERED');
        const anyDelivered = newItems.some(i => i.status === 'DELIVERED');
        let newOrderStatus = OrderStatus.PENDING;
        if (allDelivered) newOrderStatus = OrderStatus.DELIVERED;
        else if (anyDelivered) newOrderStatus = OrderStatus.PARTIAL;
        return { ...order, items: newItems, status: newOrderStatus };
      }));
    } catch (e) {
      console.error('Failed to update order item status', e);
      showInfo('Erro ao atualizar item do pedido. Verifique a conexão com o servidor.');
      return;
    }
  }, []);

  const addFeedback = async (f: Omit<Feedback, 'id' | 'timestamp'>) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/feedbacks`, { method: 'POST', body: JSON.stringify(f) });
      const created = await res.json();
      setFeedbacks(prev => [{ ...created, id: String(created.id) }, ...prev]);
    } catch (e) {
      console.error('Failed to add feedback', e);
      showInfo('Erro ao enviar avaliação. Verifique a conexão com o servidor.');
      return;
    }
  };

  const addProduct = async (p: Product) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
      if (!res || !res.ok) {
        const err = await (res ? res.text().then(t => {
          try { return JSON.parse(t); } catch(e) { return { error: t || 'Erro no servidor' }; }
        }).catch(() => ({ error: 'Erro no servidor' })) : Promise.resolve({ error: 'Sem resposta do servidor' }));
        console.error('addProduct response error', err);
        showInfo(err.error || 'Erro ao adicionar produto.');
        return;
      }
      const created = await res.json();
      const normalized = { ...created, id: String(created.id), category: (typeof created.category === 'string' ? created.category : (created.category?.name || 'Geral')) } as any;
      setProducts(prev => [...prev, normalized]);
    } catch (e) {
      console.error('Failed to add product', e);
      showInfo('Erro ao adicionar produto. Verifique a conexão com o servidor.');
      return;
    }
  };

  const updateProduct = async (id: string, patch: Partial<Product>) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      const updated = await res.json();
      const normalized = { ...updated, id: String(updated.id), category: (typeof updated.category === 'string' ? updated.category : (updated.category?.name || 'Geral')) } as any;
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...normalized } : p));
      return true;
    } catch (e) {
      console.error('Failed to update product', e);
      showInfo('Erro ao atualizar produto. Verifique a conexão com o servidor.');
      return false;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await fetchWithAuth(`${API_BASE}/products/${id}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error('Failed to delete product', e);
      showInfo('Erro ao excluir produto. Verifique a conexão com o servidor.');
      return;
    }
  };
  
  const toggleProductHighlight = async (id: string) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/products/${id}`, { method: 'PUT', body: JSON.stringify({ isHighlight: !prod.isHighlight }) });
      const updated = await res.json();
      setProducts(prev => prev.map(p => p.id === id ? { ...p, isHighlight: updated.isHighlight } : p));
    } catch (e) {
      console.error('Failed to toggle product highlight', e);
      showInfo('Erro ao alterar destaque do produto. Verifique a conexão com o servidor.');
      return;
    }
  };

  const addWaiter = async (name: string, password: string) => {
    try {
      const username = name.replace(/\s+/g, '').toLowerCase();
      const res = await fetchWithAuth(`${API_BASE}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, username, password, role: 'waiter' }) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro ao adicionar garçom' }));
        showInfo(err.error || 'Erro ao adicionar garçom. ' + (err.details || ''));
        return;
      }
      const created = await res.json();
      setWaiters(prev => [...prev, { ...created, id: String(created.id) }]);
    } catch (e) {
      console.error('Failed to add waiter', e);
      showInfo('Erro ao adicionar garçom. Verifique a conexão com o servidor.');
      return;
    }
  };

  const deleteWaiter = async (id: string) => {
    try {
      await fetchWithAuth(`${API_BASE}/users/${id}`, { method: 'DELETE' });
      setWaiters(prev => prev.filter(w => w.id !== id));
    } catch (e) {
      console.error('Failed to delete waiter', e);
      showInfo('Erro ao remover garçom. Verifique a conexão com o servidor.');
      return;
    }
  };

  const addCategory = async (name: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/categories`, { method: 'POST', body: JSON.stringify({ name }) });
      const created = await res.json();
      setCategories(prev => [...prev, created.name]);
    } catch (e) {
      console.error('Failed to add category', e);
      showInfo('Erro ao adicionar categoria. Verifique a conexão com o servidor.');
      return;
    }
  };

  const saveEstablishment = async () => {
    try {
      // use authenticated request when possible
      const res = await (accessToken ? fetchWithAuth(`${API_BASE}/establishment`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(establishment) }) : fetch(`${API_BASE}/establishment`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(establishment) }));
      if (res && (res as Response).ok) {
        const updated = await (res as Response).json();
        setEstablishment({ ...updated, theme: { ...INITIAL_THEME, ...(updated.theme || {}) } });
        // do not persist to localStorage; backend holds the canonical state
        return true;
      }
    } catch (e) {
      // ignore
    }
    return false;
  };

  const deleteCategory = async (name: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/categories`);
      const cats = await res.json();
      const found = cats.find((c: any) => c.name === name);
      if (found) await fetchWithAuth(`${API_BASE}/categories/${found.id}`, { method: 'DELETE' });
      setCategories(prev => prev.filter(c => c !== name));
    } catch (e) {
      console.error('Failed to delete category', e);
      showInfo('Erro ao excluir categoria. Verifique a conexão com o servidor.');
      return;
    }
  };

  const updateCategory = async (oldName: string, newName: string) => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/categories`);
      const cats = await res.json();
      const found = cats.find((c: any) => c.name === oldName);
      if (found) await fetchWithAuth(`${API_BASE}/categories/${found.id}`, { method: 'PUT', body: JSON.stringify({ name: newName }) });
      setCategories(prev => prev.map(c => c === oldName ? newName : c));
      setProducts(prev => prev.map(p => p.category === oldName ? { ...p, category: newName } : p));
    } catch (e) {
      console.error('Failed to update category', e);
      showInfo('Erro ao atualizar categoria. Verifique a conexão com o servidor.');
      return;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {}
    try { localStorage.removeItem('hasRefresh'); } catch(e) {}
    setAccessToken(null);
    setCurrentUser(null);
  };

  return (
    <AppContext.Provider value={{
      establishment, setEstablishment,
      products, setProducts,
      categories, setCategories,
      tables, setTables,
      orders, setOrders,
      waiters, setWaiters,
      feedbacks, addFeedback,
      currentUser, setCurrentUser, accessToken, setAccessToken, logout,
      deviceTableId, setDeviceTableId,
      addOrder,
      updateTableStatus,
      updateOrderStatus,
      updateOrderItemStatus,
      updateProduct,
      deleteProduct,
      addProduct,
      toggleProductHighlight,
      addWaiter,
      deleteWaiter,
      addCategory,
      deleteCategory,
      updateCategory,
      openTable,
      fetchOrdersByTable,
      saveEstablishment,
      fetchWithAuth
    }}>
      {children}
      <InfoModal open={infoOpen} title="Mensagem" message={infoMessage} onClose={() => { setInfoOpen(false); setInfoMessage(undefined); }} />
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
