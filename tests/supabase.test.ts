import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { test, expect } from '@playwright/test';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

test('Supabase connection and public schema check', async () => {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Tenta buscar algo simples de uma tabela pública (ou apenas verifica a URL)
  expect(supabaseUrl).toContain('supabase.co');
  expect(supabaseKey.length).toBeGreaterThan(20);

  const { data, error } = await supabase.from('warranties').select('*').limit(1);
  
  if (error) {
    console.error('Supabase Error:', error.message);
  }
  
  // O teste passa se não houver erro de rede (mesmo se a tabela estiver vazia)
  expect(error).toBeNull();
});
