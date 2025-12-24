(async ()=>{
  const base = 'http://localhost:4000';
  function log(title, data){
    console.log('---', title, '---');
    try{ console.log(JSON.stringify(data, null, 2)); }catch(e){ console.log(String(data)); }
  }
  // create first establishment via convenience PUT (no auth needed on empty DB)
  let res = await fetch(base + '/api/establishment', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Estab A', adminUser: { name: 'Admin A', username: 'adminA', password: 'password', role: 'admin' } }) });
  const e1 = await res.json().catch(()=>null);
  log('created establishment A', e1);

  // login as adminA
  res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'adminA', password: 'password' }) });
  const loginA = await res.json().catch(()=>null);
  log('loginA', loginA);
  const token = loginA?.accessToken;

  if(!token){ console.error('no token, aborting'); process.exit(1); }

  // create establishment B using admin token
  res = await fetch(base + '/api/establishment', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ name: 'Estab B' }) });
  const e2 = await res.json().catch(()=>null);
  log('created establishment B', e2);

  // create table in A (use header X-Establishment-Id = e1.id)
  res = await fetch(base + '/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'X-Establishment-Id': String(e1.id) }, body: JSON.stringify({ number: 10 }) });
  const tA = await res.json().catch(()=>null);
  log('table A', tA);

  // create table in B (use header X-Establishment-Id = e2.id)
  res = await fetch(base + '/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'X-Establishment-Id': String(e2.id) }, body: JSON.stringify({ number: 20 }) });
  const tB = await res.json().catch(()=>null);
  log('table B', tB);

  // create product in A
  res = await fetch(base + '/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'X-Establishment-Id': String(e1.id) }, body: JSON.stringify({ name: 'Coke', price: 5 }) });
  const pA = await res.json().catch(()=>null);
  log('product A', pA);

  // create order in A for table 10
  res = await fetch(base + '/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Establishment-Id': String(e1.id) }, body: JSON.stringify({ tableId: tA.id, items: [{ productId: pA.id, quantity: 2, name: pA.name, price: pA.price }] }) });
  const oA = await res.json().catch(()=>null);
  log('order A', oA);

  // create order in B for table 20
  res = await fetch(base + '/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Establishment-Id': String(e2.id) }, body: JSON.stringify({ tableId: tB.id, items: [{ name: 'Water', price: 2, quantity: 1 }] }) });
  const oB = await res.json().catch(()=>null);
  log('order B', oB);

  // list orders for A using header
  res = await fetch(base + '/api/orders?tableId=' + tA.id, { method: 'GET', headers: { 'X-Establishment-Id': String(e1.id) } });
  const listA = await res.json().catch(()=>null);
  log('list orders A with header', listA);

  // list orders for B using header
  res = await fetch(base + '/api/orders?tableId=' + tB.id, { method: 'GET', headers: { 'X-Establishment-Id': String(e2.id) } });
  const listB = await res.json().catch(()=>null);
  log('list orders B with header', listB);

  // list orders without header (should return fallback or first in dev) - but we expect not to see cross data
  res = await fetch(base + '/api/orders', { method: 'GET' });
  const listNoHeader = await res.json().catch(()=>null);
  log('list orders without header', listNoHeader);

  console.log('TEST DONE');
  process.exit(0);
})();
