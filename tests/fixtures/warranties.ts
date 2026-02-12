import { Warranty } from '@/types/supabase';

/**
 * Fixtures de dados para testes
 */

export const mockWarranties: Warranty[] = [
  {
    id: '1',
    user_id: 'test-user-1',
    name: 'Notebook Dell Inspiron',
    category: 'Eletrônicos',
    purchase_date: new Date('2024-01-15').toISOString(),
    warranty_months: 12,
    price: 3500.00,
    store: 'Magazine Luiza',
    notes: 'Garantia estendida incluída',
    invoice_url: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: 'test-user-1',
    name: 'Smartphone Samsung Galaxy',
    category: 'Eletrônicos',
    purchase_date: new Date('2024-06-20').toISOString(),
    warranty_months: 24,
    price: 2500.00,
    store: 'Americanas',
    notes: '',
    invoice_url: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    user_id: 'test-user-1',
    name: 'Geladeira Brastemp',
    category: 'Eletrodomésticos',
    purchase_date: new Date('2023-12-10').toISOString(),
    warranty_months: 12,
    price: 2800.00,
    store: 'Casas Bahia',
    notes: 'Instalação incluída',
    invoice_url: null,
    created_at: new Date().toISOString(),
  },
  {
    id: '4',
    user_id: 'test-user-1',
    name: 'Fone de Ouvido Sony',
    category: 'Eletrônicos',
    purchase_date: new Date('2024-11-01').toISOString(),
    warranty_months: 6,
    price: 450.00,
    store: 'Amazon',
    notes: '',
    invoice_url: null,
    created_at: new Date().toISOString(),
  },
];

export const mockExpiredWarranty: Warranty = {
  id: '5',
  user_id: 'test-user-1',
  name: 'Produto Expirado',
  category: 'Outros',
  purchase_date: new Date('2022-01-01').toISOString(),
  warranty_months: 12,
  price: 100.00,
  store: 'Loja Teste',
  notes: '',
  invoice_url: null,
  created_at: new Date().toISOString(),
};

export const mockExpiringSoonWarranty: Warranty = {
  id: '6',
  user_id: 'test-user-1',
  name: 'Produto Vencendo',
  category: 'Outros',
  purchase_date: new Date(Date.now() - 11 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 11 meses atrás
  warranty_months: 12,
  price: 200.00,
  store: 'Loja Teste',
  notes: '',
  invoice_url: null,
  created_at: new Date().toISOString(),
};

export const mockUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  nickname: 'testuser',
};
