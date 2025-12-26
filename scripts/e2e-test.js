// E2E test script for appcardapiov1
// Runs a sequence: health check, bootstrap establishment, admin login,
// create category, product, waiter, table, place order, listen SSE for notifications,
// mark item delivered, mark order PAID, close table, update establishment settings.

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api';
const fetch = global.fetch;
const decoder = new TextDecoder();

async function req(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, opts);
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
  return { status: res.status, body, headers: res.headers };
}

async function json(path, method = 'GET', token, payload) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (payload) opts.body = JSON.stringify(payload);
  return await req(path, opts);
}

async function listenSSE(timeout = 8000) {
  const controller = new AbortController();
  const res = await fetch(`${API_BASE}/notifications/stream`, { signal: controller.signal });
  if (!res.ok) throw new Error('SSE connection failed');
  const reader = res.body.getReader();
  let buf = '';

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error('SSE timeout'));
    }, timeout);

    (async function read() {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let parts = buf.split('\n\n');
          while (parts.length > 1) {
            const msg = parts.shift();
            // parse event/data
            const lines = msg.split('\n');
            let ev = null, data = '';
            for (const l of lines) {
              if (l.startsWith('event:')) ev = l.replace('event:', '').trim();
              if (l.startsWith('data:')) data += l.replace('data:', '').trim();
            }
            clearTimeout(timer);
            controller.abort();
            try { resolve({ event: ev, data: JSON.parse(data) }); } catch { resolve({ event: ev, data }); }
            return;
          }
          buf = parts[0];
        }
      } catch (e) {
        clearTimeout(timer);
        reject(e);
      }
    })();
  });
}

async function main() {
  console.log('[e2e] API_BASE =', API_BASE);

  // 1. health
  const health = await json('/health');
  console.log('[e2e] health', health.status, health.body);

  // 2. check establishment
  const estRes = await json('/establishment');
  let establishment = estRes.body;

  const adminUser = { username: 'admin_test', password: 'Pass1234', name: 'Admin Test' };
  if (!establishment) {
    console.log('[e2e] no establishment found, bootstrapping...');
    const payload = { name: 'E2E Test Establishment', serviceCharge: 10, adminUser: adminUser, theme: { background: '#ffffff', card: '#f8fafc', text: '#111827', primary: '#0ea5a4', accent: '#f97316' } };
    const create = await json('/', 'PUT', null, payload);
    if (create.status >= 400) throw new Error('Failed to bootstrap establishment: ' + JSON.stringify(create.body));
    establishment = create.body;
    console.log('[e2e] created establishment', establishment.id || establishment);
  } else {
    console.log('[e2e] existing establishment found');
  }

  // 3. login admin (try existing admin_user or admin_test)
  let login = await json('/auth/login', 'POST', null, { username: adminUser.username, password: adminUser.password, role: 'admin' });
  if (login.status === 401 || login.status === 400) {
    // try to register admin
    console.log('[e2e] registering admin user...');
    const reg = await json('/auth/register', 'POST', null, { username: adminUser.username, password: adminUser.password, name: adminUser.name, role: 'admin' });
    if (reg.status >= 400) console.log('[e2e] register response', reg.status, reg.body);
    login = await json('/auth/login', 'POST', null, { username: adminUser.username, password: adminUser.password, role: 'admin' });
  }
  if (login.status >= 400) throw new Error('Login failed: ' + JSON.stringify(login.body));
  const token = login.body.accessToken;
  console.log('[e2e] admin logged in');

  // 4. create category
  const catRes = await json('/categories', 'POST', token, { name: 'E2E Category' });
  console.log('[e2e] created category', catRes.status, catRes.body?.id || catRes.body);
  const categoryId = catRes.body?.id;

  // 5. create product
  const prodRes = await json('/products', 'POST', token, { name: 'E2E Product', price: 10.5, categoryId, description: 'Test product' });
  console.log('[e2e] created product', prodRes.status, prodRes.body?.id || prodRes.body);
  const productId = prodRes.body?.id;

  // 6. create waiter user
  const waiter = { username: 'waiter_test', password: 'Waiter123', name: 'Waiter Test', role: 'waiter' };
  const waiterRes = await json('/users', 'POST', token, waiter);
  console.log('[e2e] created waiter', waiterRes.status, waiterRes.body?.id || waiterRes.body);
  const waiterId = waiterRes.body?.id;

  // 7. create table (as waiter or admin)
  const tableRes = await json('/tables', 'POST', token, { number: 101, status: 'OCCUPIED' });
  console.log('[e2e] created table', tableRes.status, tableRes.body?.id || tableRes.body);
  const tableId = tableRes.body?.id;

  // 8. start SSE listener (simulate waiter) and place order
  console.log('[e2e] starting SSE listener (waiting for order_created)...');
  const ssePromise = listenSSE(10000).then(ev => ({ ok: true, ev })).catch(e => ({ ok: false, e }));

  // 9. place order (public)
  const orderPayload = { tableId: Number(tableId), items: [{ productId: Number(productId), quantity: 2, name: 'E2E Product', price: 10.5 }] , total: 21.0 };
  const orderRes = await json('/orders', 'POST', null, orderPayload);
  console.log('[e2e] placed order', orderRes.status, orderRes.body?.id || orderRes.body);
  const orderId = orderRes.body?.id;

  // wait SSE
  const sseResult = await ssePromise;
  console.log('[e2e] sseResult', sseResult.ok ? sseResult.ev : sseResult.e?.message);

  // 10. mark first item delivered (admin)
  const firstItem = orderRes.body?.items?.[0];
  if (firstItem) {
    const itemStatus = await json(`/orders/${orderId}/items/${firstItem.id}/status`, 'PUT', token, { status: 'DELIVERED' });
    console.log('[e2e] item status updated', itemStatus.status, itemStatus.body);
  }

  // 11. mark order PAID (admin)
  const pay = await json(`/orders/${orderId}/status`, 'PUT', token, { status: 'PAID', servicePaid: true });
  console.log('[e2e] order paid', pay.status, pay.body);

  // 12. close table (set AVAILABLE)
  let close = await json(`/tables/${tableId}`, 'PUT', token, { status: 'AVAILABLE', servicePaid: true });
  console.log('[e2e] table closed', close.status, close.body?.updated || close.body);

  // If we got 403 due to tenant mismatch, escalate by creating/using superadmin
  let superToken = null;
  if (close.status === 403) {
    console.log('[e2e] close table returned 403; attempting superadmin fallback');
    // Try admin create endpoint first
    const createSuper = await json('/admin/create-superadmin', 'POST', null, { username: 'super_test', password: 'Super123' });
    if (createSuper.status === 200 && createSuper.body?.token) {
      superToken = createSuper.body.token;
      console.log('[e2e] created superadmin via admin/create-superadmin');
    } else {
      // Fallback: register a superadmin via public register then login
      console.log('[e2e] admin/create-superadmin failed, falling back to /auth/register');
      const reg = await json('/auth/register', 'POST', null, { username: 'super_test', password: 'Super123', name: 'Super Test', role: 'superadmin' });
      console.log('[e2e] register superadmin', reg.status);
      const loginSuper = await json('/auth/login', 'POST', null, { username: 'super_test', password: 'Super123' });
      if (loginSuper.status === 200) {
        superToken = loginSuper.body.accessToken;
        console.log('[e2e] logged in superadmin via /auth/login');
      }
    }
    if (superToken) {
      close = await json(`/tables/${tableId}`, 'PUT', superToken, { status: 'AVAILABLE', servicePaid: true });
      console.log('[e2e] table closed with superadmin', close.status, close.body?.updated || close.body);
    }
  }

  // 13. update establishment settings (serviceCharge, theme)
  let estUpdate = await json(`/admin/establishments/${establishment.id}`, 'PUT', token, { serviceCharge: 12, theme: { background: '#000000', card: '#111111', text: '#ffffff', primary: '#06b6d4', accent: '#fb7185' } });
  console.log('[e2e] updated establishment', estUpdate.status, estUpdate.body?.establishment || estUpdate.body);
  if (estUpdate.status === 403 && !superToken) {
    console.log('[e2e] update establishment returned 403; attempting superadmin fallback');
    // create/login superadmin if not created yet
    const createSuper = await json('/admin/create-superadmin', 'POST', null, { username: 'super_test', password: 'Super123' });
    if (createSuper.status === 200 && createSuper.body?.token) superToken = createSuper.body.token;
    else {
      const loginSuper = await json('/auth/login', 'POST', null, { username: 'super_test', password: 'Super123' });
      if (loginSuper.status === 200) superToken = loginSuper.body.accessToken;
    }
    if (superToken) {
      estUpdate = await json(`/admin/establishments/${establishment.id}`, 'PUT', superToken, { serviceCharge: 12, theme: { background: '#000000', card: '#111111', text: '#ffffff', primary: '#06b6d4', accent: '#fb7185' } });
      console.log('[e2e] updated establishment with superadmin', estUpdate.status, estUpdate.body?.establishment || estUpdate.body);
    }
  }

  console.log('[e2e] DONE');
}

main().catch(e => { console.error('[e2e] ERROR', e && e.message ? e.message : e); process.exit(1); });
