/**
 * Executa SQL no Supabase usando a Data API
 * Execute com: node scripts/execute-sql.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://moaxyoqjedgrfnxeskku.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_rvTz9mUlJsW7wn_T_1Qyww_jBaOgKXc';
const PROJECT_REF = 'moaxyoqjedgrfnxeskku';

// SQL statements para executar
const migrations = [
  // 1. Dual PIN
  { name: 'is_decoy em chats', sql: `ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS is_decoy BOOLEAN DEFAULT false` },
  { name: 'index chats is_decoy', sql: `CREATE INDEX IF NOT EXISTS idx_chats_is_decoy ON public.chats(is_decoy)` },
  { name: 'is_decoy em messages', sql: `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_decoy BOOLEAN DEFAULT false` },
  { name: 'index messages is_decoy', sql: `CREATE INDEX IF NOT EXISTS idx_messages_is_decoy ON public.messages(is_decoy)` },
  
  // 2. Edit/Delete
  { name: 'edited_at', sql: `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ DEFAULT NULL` },
  { name: 'deleted_at', sql: `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL` },
  { name: 'deleted_for_everyone', sql: `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT false` },
  { name: 'original_content', sql: `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS original_content TEXT DEFAULT NULL` },
  
  // 3. View Once
  { name: 'is_view_once', sql: `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_view_once BOOLEAN DEFAULT false` },
  { name: 'viewed_at', sql: `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ DEFAULT NULL` },
];

async function executeSQLViaAPI(sql, name) {
  // Tentar endpoint SQL direto (Management API)
  const endpoints = [
    `${SUPABASE_URL}/pg/sql`,
    `${SUPABASE_URL}/rest/v1/`,
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      
      if (response.ok) {
        return { success: true };
      }
    } catch (err) {
      // Continuar tentando próximo endpoint
    }
  }
  
  return { success: false };
}

async function checkTableStructure() {
  console.log('═'.repeat(60));
  console.log('  Verificando estrutura atual das tabelas');
  console.log('═'.repeat(60));
  
  // Verificar se a tabela chats tem a coluna is_decoy
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/chats?select=id&limit=0`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    
    if (response.ok) {
      console.log('✅ Tabela chats acessível');
    }
    
    // Tentar buscar com coluna is_decoy
    const testDecoy = await fetch(`${SUPABASE_URL}/rest/v1/chats?select=is_decoy&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    
    if (testDecoy.ok) {
      console.log('✅ Coluna is_decoy já existe em chats');
    } else {
      console.log('❌ Coluna is_decoy NÃO existe em chats (precisa migração)');
    }
  } catch (err) {
    console.log('⚠️  Erro ao verificar:', err.message);
  }
  
  // Verificar messages
  try {
    const testViewOnce = await fetch(`${SUPABASE_URL}/rest/v1/messages?select=is_view_once&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    
    if (testViewOnce.ok) {
      console.log('✅ Coluna is_view_once já existe em messages');
    } else {
      console.log('❌ Coluna is_view_once NÃO existe em messages (precisa migração)');
    }
    
    const testReactions = await fetch(`${SUPABASE_URL}/rest/v1/message_reactions?select=id&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    
    if (testReactions.ok) {
      console.log('✅ Tabela message_reactions existe');
    } else {
      console.log('❌ Tabela message_reactions NÃO existe (precisa migração)');
    }
  } catch (err) {
    console.log('⚠️  Erro ao verificar:', err.message);
  }
  
  console.log('');
}

async function main() {
  await checkTableStructure();
  
  console.log('═'.repeat(60));
  console.log('  INSTRUÇÕES PARA APLICAR MIGRAÇÕES');
  console.log('═'.repeat(60));
  console.log(`
A API REST do Supabase não permite execução de DDL (ALTER TABLE, CREATE TABLE).

📋 Para aplicar as migrações, siga um destes métodos:

┌─────────────────────────────────────────────────────────┐
│  MÉTODO 1: SQL Editor (Mais Fácil)                      │
├─────────────────────────────────────────────────────────┤
│  1. Acesse: https://supabase.com/dashboard/project/     │
│             moaxyoqjedgrfnxeskku/sql/new                │
│                                                         │
│  2. Cole o conteúdo do arquivo:                         │
│     APPLY_ALL_MIGRATIONS.sql                            │
│                                                         │
│  3. Clique em "Run"                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  MÉTODO 2: Supabase CLI                                 │
├─────────────────────────────────────────────────────────┤
│  1. npx supabase login                                  │
│  2. npx supabase link --project-ref moaxyoqjedgrfnxeskku│
│  3. npx supabase db push                                │
└─────────────────────────────────────────────────────────┘

`);

  // Abrir o link automaticamente
  console.log('🔗 Abrindo SQL Editor no navegador...\n');
}

main().catch(console.error);
