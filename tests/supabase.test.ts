import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { test, expect } from '@playwright/test';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

test('Supabase connection and public schema check', async () => {
  // Aumentar o timeout para conexões lentas
  test.setTimeout(30000); 

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  expect(supabaseUrl).toContain('supabase.co');
  expect(supabaseKey.length).toBeGreaterThan(20);

  console.log('Tentando conectar ao Supabase...');
  const { data, error } = await supabase.from('warranties').select('*').limit(1);
  
  if (error) {
    console.error('Supabase Error:', error.message);
  } else {
    console.log('Conexão bem sucedida!');
  }
  
  expect(error).toBeNull();
});
