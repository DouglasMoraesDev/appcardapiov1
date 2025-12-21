export enum OrderStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  DELIVERED = 'DELIVERED',
  PAID = 'PAID'
}

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  CALLING_WAITER = 'CALLING_WAITER',
  BILL_REQUESTED = 'BILL_REQUESTED'
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isHighlight?: boolean;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  name: string;
  price: number;
  status: 'PENDING' | 'DELIVERED';
  observation?: string;
}

export interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  status: OrderStatus;
  timestamp: number;
  total: number;
  paymentMethod?: 'PIX' | 'CARTAO' | 'DINHEIRO';
}

export interface Table {
  id: string;
  number: number;
  status: TableStatus;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  password?: string;
  role: 'admin' | 'waiter';
  pin?: string;
}

export interface ThemeConfig {
  background: string;
  card: string;
  text: string;
  primary: string;
  accent: string;
}

export interface Establishment {
  name: string;
  logo: string;
  address: string;
  cep?: string;
  cpfCnpj?: string;
  serviceCharge: number;
  theme: ThemeConfig;
  adminUser?: User;
}

export interface Feedback {
  id: string;
  tableNumber: number;
  rating: number;
  comment: string;
  timestamp: number;
}
