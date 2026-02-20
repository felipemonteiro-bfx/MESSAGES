/**
 * Script para aplicar migrações no Supabase via API
 * Execute com: node scripts/apply-migrations.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuração
const SUPABASE_URL = 'https://moaxyoqjedgrfnxeskku.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_rvTz9mUlJsW7wn_T_1Qyww_jBaOgKXc';

// SQL statements individuais para executar
const sqlStatements = [
  // 1. Dual PIN - Colunas
  `ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS is_decoy BOOLEAN DEFAULT false`,
  `CREATE INDEX IF NOT EXISTS idx_chats_is_decoy ON public.chats(is_decoy)`,
  `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_decoy BOOLEAN DEFAULT false`,
  `CREATE INDEX IF NOT EXISTS idx_messages_is_decoy ON public.messages(is_decoy)`,
  
  // 2. Edit/Delete - Colunas
  `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ DEFAULT NULL`,
  `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL`,
  `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN DEFAULT false`,
  `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS original_content TEXT DEFAULT NULL`,
  
  // 3. View Once - Colunas
  `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_view_once BOOLEAN DEFAULT false`,
  `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ DEFAULT NULL`,
  
  // 4. Message Reactions - Tabela
  `CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(message_id, user_id, emoji)
  )`,
  
  // Índices de reactions
  `CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id)`,
  `CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id)`,
  
  // RLS
  `ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY`,
  
  // Políticas (com DROP primeiro para evitar duplicação)
  `DROP POLICY IF EXISTS "Users can view reactions in their chats" ON public.message_reactions`,
  `DROP POLICY IF EXISTS "Users can add reactions in their chats" ON public.message_reactions`,
  `DROP POLICY IF EXISTS "Users can remove their own reactions" ON public.message_reactions`,
  
  `CREATE POLICY "Users can view reactions in their chats" ON public.message_reactions FOR SELECT USING (EXISTS (SELECT 1 FROM public.messages m JOIN public.chat_participants cp ON cp.chat_id = m.chat_id WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()))`,
  
  `CREATE POLICY "Users can add reactions in their chats" ON public.message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.messages m JOIN public.chat_participants cp ON cp.chat_id = m.chat_id WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid()))`,
  
  `CREATE POLICY "Users can remove their own reactions" ON public.message_reactions FOR DELETE USING (user_id = auth.uid())`,
];

async function executeSQL(sql, index) {
  const preview = sql.slice(0, 50).replace(/\n/g, ' ').trim();
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ query: sql }),
    });
    
    // Tentar via query direta se RPC falhar
    if (!response.ok) {
      // A API REST do Supabase não suporta SQL direto, 
      // mas podemos usar a API de Management (precisa de access token especial)
      console.log(`  ${index + 1}. ⚠️  ${preview}... (precisa executar no SQL Editor)`);
      return false;
    }
    
    console.log(`  ${index + 1}. ✅ ${preview}...`);
    return true;
  } catch (err) {
    console.log(`  ${index + 1}. ⚠️  ${preview}... (${err.message})`);
    return false;
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('  MIGRAÇÕES DO SUPABASE - Sistema de Chat Stealth');
  console.log('═'.repeat(60));
  console.log(`\n📍 Projeto: ${SUPABASE_URL}\n`);
  
  console.log('ℹ️  A API REST do Supabase não permite execução direta de DDL SQL.');
  console.log('   Por favor, execute o arquivo APPLY_ALL_MIGRATIONS.sql no SQL Editor:\n');
  console.log(`   🔗 https://supabase.com/dashboard/project/moaxyoqjedgrfnxeskku/sql/new\n`);
  
  console.log('─'.repeat(60));
  console.log('📋 Migrações a serem aplicadas:');
  console.log('─'.repeat(60));
  console.log(`
  1. DUAL PIN / MODO PÂNICO
     - Coluna is_decoy em chats e messages
     
  2. EDIÇÃO E EXCLUSÃO DE MENSAGENS
     - Colunas edited_at, deleted_at, deleted_for_everyone, original_content
     
  3. VIEW ONCE MESSAGES
     - Colunas is_view_once, viewed_at
     
  4. REAÇÕES COM EMOJI
     - Tabela message_reactions com RLS
`);
  
  console.log('─'.repeat(60));
  console.log('\n📝 Copie o conteúdo de APPLY_ALL_MIGRATIONS.sql e cole no SQL Editor.\n');
  
  // Mostrar preview do SQL
  const sqlFile = readFileSync(join(__dirname, '..', 'APPLY_ALL_MIGRATIONS.sql'), 'utf-8');
  console.log('Preview do SQL (primeiras 20 linhas):');
  console.log('─'.repeat(60));
  console.log(sqlFile.split('\n').slice(0, 20).join('\n'));
  console.log('...\n');
}

main().catch(console.error);
