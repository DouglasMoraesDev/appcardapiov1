// Script de teste automatizado para login e dashboard admin
// Roda no Node.js (na pasta frontend ou raiz do projeto)

const fetch = require('node-fetch');

const API = 'http://localhost:4000/api';

async function testAdminLogin() {
  try {
    // 1. Login admin
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin', role: 'admin' }),
      credentials: 'include',
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      console.error('Erro no login:', loginData);
      return;
    }
    const accessToken = loginData.accessToken;
    console.log('Login admin OK, accessToken:', !!accessToken);

    // 2. Testar acesso ao dashboard (pedidos, usuários)
    const ordersRes = await fetch(`${API}/orders`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const orders = await ordersRes.json();
    console.log('Pedidos carregados:', Array.isArray(orders));

    const usersRes = await fetch(`${API}/users`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const users = await usersRes.json();
    console.log('Usuários carregados:', Array.isArray(users));

    // 3. Testar refresh token
    const refreshRes = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    const refreshData = await refreshRes.json();
    if (refreshRes.ok && refreshData.accessToken) {
      console.log('Refresh token OK');
    } else {
      console.error('Erro no refresh:', refreshData);
    }
  } catch (err) {
    console.error('Erro geral no teste:', err);
  }
}

testAdminLogin();
