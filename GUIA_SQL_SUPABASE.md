# 📝 Guia Passo a Passo - Executar SQL no Supabase

## 🎯 Objetivo
Criar a função `get_user_by_email` para permitir busca de contatos por email.

---

## 📋 Passo a Passo Detalhado

### Passo 1: Acessar Supabase
1. Abra seu navegador
2. Acesse: https://supabase.com/dashboard
3. Faça login se necessário
4. Selecione o projeto: `moaxyoqjedgrfnxeskku`

### Passo 2: Abrir SQL Editor
1. No menu lateral esquerdo, clique em **"SQL Editor"**
2. Ou acesse diretamente: https://supabase.com/dashboard/project/moaxyoqjedgrfnxeskku/sql

### Passo 3: Criar Nova Query
1. Clique no botão **"New query"** (canto superior direito)
2. Ou use o atalho: `Ctrl + K` (Windows) / `Cmd + K` (Mac)

### Passo 4: Copiar e Colar o SQL
1. Abra o arquivo: `docs/buscar_por_email_v2.sql`
2. **Selecione TODO o conteúdo** (Ctrl+A)
3. **Copie** (Ctrl+C)
4. **Cole** no SQL Editor do Supabase (Ctrl+V)

### Passo 5: Executar o SQL
1. Clique no botão **"Run"** (canto inferior direito)
2. Ou pressione: `Ctrl + Enter` (Windows) / `Cmd + Enter` (Mac)
3. Aguarde alguns segundos

### Passo 6: Verificar Resultados
Você deve ver 3 resultados:

**Resultado 1:** Lista de funções (deve mostrar `get_user_by_email`)
**Resultado 2:** Lista de usuários do auth.users
**Resultado 3:** Lista de profiles

---

## ✅ Verificar se Funcionou

### Teste 1: Verificar se a Função Existe
Execute no SQL Editor:
```sql
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'get_user_by_email';
```

**Deve retornar:** Uma linha com `get_user_by_email` e seus argumentos.

### Teste 2: Verificar Usuários Existentes
Execute:
```sql
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;
```

**Deve retornar:** Lista de usuários cadastrados.

### Teste 3: Verificar Profiles Existentes
Execute:
```sql
SELECT id, nickname, created_at 
FROM public.profiles 
ORDER BY created_at DESC
LIMIT 10;
```

**Deve retornar:** Lista de profiles criados.

### Teste 4: Testar a Função
Execute (substitua pelo email real):
```sql
SELECT * FROM get_user_by_email('teste@stealth.com');
```

**Se funcionar:** Retorna o profile do usuário com esse email.
**Se não funcionar:** Retorna vazio (usuário não existe ou não tem profile).

---

## 🐛 Problemas Comuns

### Erro: "function get_user_by_email does not exist"
**Causa:** A função não foi criada.
**Solução:** Execute o SQL novamente (`docs/buscar_por_email_v2.sql`)

### Erro: "permission denied for schema auth"
**Causa:** Permissões insuficientes.
**Solução:** Certifique-se de estar usando `SECURITY DEFINER` e `SET search_path`

### Retorna vazio ao testar
**Possíveis causas:**
1. Usuário não existe no `auth.users`
2. Usuário não tem profile criado
3. Email está escrito errado

**Solução:**
1. Verifique se o usuário existe:
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'teste@stealth.com';
   ```
2. Se existir mas não tiver profile, crie um:
   ```sql
   INSERT INTO public.profiles (id, nickname)
   SELECT id, 'teste' 
   FROM auth.users 
   WHERE email = 'teste@stealth.com';
   ```

### Erro: "column does not exist"
**Causa:** Tabela ou coluna não existe.
**Solução:** Execute primeiro `docs/messaging_schema.sql` para criar as tabelas.

---

## 📝 Exemplo Completo

### 1. Criar Usuário de Teste (se não existir)
```sql
-- Verificar se usuário existe
SELECT id, email FROM auth.users WHERE email = 'teste@stealth.com';

-- Se não existir, você precisa criar pelo painel de Authentication
-- Vá em Authentication > Users > Add User
```

### 2. Criar Profile (se não existir)
```sql
-- Verificar se profile existe
SELECT id, nickname FROM public.profiles 
WHERE id IN (SELECT id FROM auth.users WHERE email = 'teste@stealth.com');

-- Se não existir, criar:
INSERT INTO public.profiles (id, nickname)
SELECT id, 'teste' 
FROM auth.users 
WHERE email = 'teste@stealth.com'
ON CONFLICT (id) DO NOTHING;
```

### 3. Testar Função
```sql
SELECT * FROM get_user_by_email('teste@stealth.com');
```

---

## ✅ Checklist

- [ ] Acessei o Supabase Dashboard
- [ ] Abri o SQL Editor
- [ ] Copiei o conteúdo de `buscar_por_email_v2.sql`
- [ ] Colei no SQL Editor
- [ ] Executei o SQL (Run)
- [ ] Vi os 3 resultados
- [ ] Testei a função com um email real
- [ ] Função retornou resultado correto

---

## 🎯 Próximo Passo

Após executar o SQL com sucesso:
1. Teste a busca por email no app
2. Digite um email no campo "Adicionar contato"
3. Deve encontrar o usuário!

---

**Siga os passos acima e me diga se funcionou! 🚀**
