# 🔍 Buscar Contatos por Email

## ✅ O Que Foi Implementado

Agora você pode buscar contatos tanto por **nickname** quanto por **email**!

### Como Usar:
1. Clique no botão **"Adicionar contato"** (ícone +)
2. Digite o **nickname** OU o **email** do usuário
3. Pressione Enter ou clique em "Adicionar"

---

## ⚠️ IMPORTANTE: Configurar Função SQL no Supabase

Para que a busca por email funcione, você precisa executar uma função SQL no Supabase:

### Passo 1: Acessar SQL Editor
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)

### Passo 2: Executar SQL
1. Abra o arquivo: `docs/buscar_por_email.sql`
2. Copie todo o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou F5)

### Passo 3: Verificar
Execute este teste (substitua pelo email real):
```sql
SELECT * FROM get_user_by_email('teste@stealth.com');
```

Se retornar o usuário, está funcionando! ✅

---

## 🐛 Problemas Comuns

### Erro: "Função get_user_by_email não encontrada"
**Solução:** Execute o SQL em `docs/buscar_por_email.sql` no Supabase

### Erro: "Usuário não encontrado com este email"
**Possíveis causas:**
1. ✅ Email não existe no Supabase
2. ✅ Usuário não tem profile criado
3. ✅ Email está escrito errado

**Solução:**
1. Verifique se o usuário `teste@stealth.com` existe no Supabase:
   - Vá em **Authentication > Users**
   - Procure pelo email
2. Verifique se o usuário tem profile:
   - Vá em **Table Editor > profiles**
   - Procure pelo ID do usuário
3. Se não tiver profile, crie um:
   ```sql
   INSERT INTO public.profiles (id, nickname)
   SELECT id, 'teste' 
   FROM auth.users 
   WHERE email = 'teste@stealth.com';
   ```

---

## 📝 Exemplo de Uso

### Buscar por Nickname:
- Digite: `teste`
- Funciona se o nickname for exatamente `teste`

### Buscar por Email:
- Digite: `teste@stealth.com`
- Funciona se o email existir no Supabase

---

## ✅ Checklist

- [ ] Função SQL executada no Supabase
- [ ] Função testada com `SELECT * FROM get_user_by_email('teste@stealth.com')`
- [ ] Usuário `teste@stealth.com` existe no Supabase
- [ ] Usuário tem profile criado
- [ ] Testado buscar por email no app
- [ ] Testado buscar por nickname no app

---

## 🎉 Pronto!

Agora você pode buscar contatos por email ou nickname! 🚀

**Próximo passo:** Execute o SQL no Supabase e teste!
