import axios from 'axios';

const API = 'http://localhost:4000/api';


async function testApp() {
  try {
    console.log('--- Teste: Login Admin ---');
    const adminLogin = await axios.post(`${API}/auth/login`, { username: 'admin', password: 'admin', role: 'admin' });
    console.log('Admin login:', adminLogin.data);
  } catch (err: any) {
    console.error('Erro no login admin:', err.response?.data || err.message);
    return;
  }

  try {
    console.log('--- Teste: Login Garçom ---');
    const waiterLogin = await axios.post(`${API}/auth/login`, { username: 'douglas', password: '1234', role: 'waiter' });
    console.log('Garçom login:', waiterLogin.data);
  } catch (err: any) {
    console.error('Erro no login garçom:', err.response?.data || err.message);
    return;
  }

  let uniqueUsername = `cliente-teste-${Date.now()}`;
  try {
    console.log('--- Teste: Registro Cliente ---');
    const clientRegister = await axios.post(`${API}/auth/register`, { username: uniqueUsername, password: '1234', name: 'Cliente Teste', role: 'customer' });
    console.log('Cliente registrado:', clientRegister.data);
  } catch (err: any) {
    console.error('Erro no registro cliente:', err.response?.data || err.message);
    return;
  }

  let clientLogin;
  try {
    console.log('--- Teste: Login Cliente ---');
    clientLogin = await axios.post(`${API}/auth/login`, { username: uniqueUsername, password: '1234', role: 'customer' });
    console.log('Cliente login:', clientLogin.data);
  } catch (err: any) {
    console.error('Erro no login cliente:', err.response?.data || err.message);
    return;
  }

  try {
    console.log('--- Teste: Listar Mesas ---');
    const tablesList = await axios.get(`${API}/tables`);
    console.log('Mesas:', tablesList.data);
  } catch (err: any) {
    console.error('Erro ao listar mesas:', err.response?.data || err.message);
    return;
  }

  let tableId;
  try {
    console.log('--- Teste: Abrir Mesa ---');
    const openTable = await axios.post(`${API}/tables`, { number: 100 });
    tableId = (openTable.data as any).id;
    console.log('Mesa aberta:', openTable.data);
  } catch (err: any) {
    console.error('Erro ao abrir mesa:', err.response?.data || err.message);
    return;
  }
}

testApp();
