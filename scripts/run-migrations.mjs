/**
 * Script para executar migrações SQL no Supabase
 * Execute com: node scripts/run-migrations.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuração
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://moaxyoqjedgrfnxeskku.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_rvTz9mUlJsW7wn_T_1Qyww_jBaOgKXc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// Lista de migrações na ordem correta
const migrations = [
  'dual_pin_decoy_mode.sql',
  'edit_delete_messages.sql',
  'message_reactions.sql',
  'view_once_messages.sql',
];

async function runMigration(filename) {
  console.log(`\n📦 Executando: ${filename}`);
  
  const filepath = join(__dirname, '..', 'docs', 'migrations', filename);
  const sql = readFileSync(filepath, 'utf-8');
  
  // Dividir o SQL em statements individuais
  // Remove comentários de linha completa e separa por ponto e vírgula
  const statements = sql
    .split(/;(?=(?:[^']*'[^']*')*[^']*$)/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const statement of statements) {
    if (!statement.trim()) continue;
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
      
      if (error) {
        // Tentar executar diretamente via REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({ sql_query: statement }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
      }
      
      successCount++;
      const preview = statement.slice(0, 60).replace(/\n/g, ' ');
      console.log(`  ✅ ${preview}...`);
    } catch (err) {
      errorCount++;
      const preview = statement.slice(0, 40).replace(/\n/g, ' ');
      console.log(`  ⚠️ ${preview}... - ${err.message}`);
    }
  }
  
  console.log(`  📊 Resultado: ${successCount} sucesso, ${errorCount} erros/já existentes`);
  return { success: successCount, errors: errorCount };
}

async function runAllMigrations() {
  console.log('🚀 Iniciando migrações do Supabase...');
  console.log(`📍 URL: ${SUPABASE_URL}`);
  console.log('─'.repeat(50));
  
  let totalSuccess = 0;
  let totalErrors = 0;
  
  for (const migration of migrations) {
    const result = await runMigration(migration);
    totalSuccess += result.success;
    totalErrors += result.errors;
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log(`✅ Migrações concluídas!`);
  console.log(`📊 Total: ${totalSuccess} operações bem-sucedidas, ${totalErrors} erros/já existentes`);
}

// Executar
runAllMigrations().catch(console.error);
