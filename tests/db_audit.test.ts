import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { test, expect } from '@playwright/test';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

test('DB Integrity Check - Platinum Schema', async () => {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('--- Iniciando Auditoria de Tabelas ---');

  // 1. Verificar Warranties (e novas colunas)
  const { data: wData, error: wError } = await supabase.from('warranties').select('price, lowest_price_found').limit(1);
  if (wError) console.error('❌ Tabela Warranties ou colunas de inteligência ausentes:', wError.message);
  else console.log('✅ Tabela Warranties e colunas de Inteligência OK');

  // 2. Verificar Marketplace
  const { data: mData, error: mError } = await supabase.from('marketplace_listings').select('*').limit(1);
  if (mError) console.error('❌ Tabela marketplace_listings ausente:', mError.message);
  else console.log('✅ Tabela Marketplace OK');

  // 3. Verificar Profiles
  const { data: pData, error: pError } = await supabase.from('profiles').select('referral_code, legacy_enabled').limit(1);
  if (pError) console.error('❌ Tabela Profiles ou colunas de segurança ausentes:', pError.message);
  else console.log('✅ Tabela Profiles e colunas de Segurança OK');

  // 4. Verificar Logs e Fotos
  const { error: logError } = await supabase.from('maintenance_logs').select('is_upgrade').limit(1);
  const { error: photoError } = await supabase.from('asset_photos').select('*').limit(1);
  
  if (logError) console.error('❌ Erro em maintenance_logs:', logError.message);
  else console.log('✅ Tabela Logs e ROI OK');
  
  if (photoError) console.error('❌ Erro em asset_photos:', photoError.message);
  else console.log('✅ Tabela Vistoria 360 OK');

  expect(wError).toBeNull();
  expect(mError).toBeNull();
  expect(pError).toBeNull();
});
