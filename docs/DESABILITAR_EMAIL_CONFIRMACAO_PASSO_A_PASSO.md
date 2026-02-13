# 🚫 Como Desabilitar Confirmação de Email no Supabase

## ⚠️ IMPORTANTE: Você ainda está recebendo emails porque a configuração no Supabase precisa ser alterada manualmente!

O código já está configurado para não enviar emails, mas o Supabase ainda está enviando porque a configuração global precisa ser desabilitada no Dashboard.

---

## 📋 Passo a Passo Visual

### 1️⃣ Acesse o Supabase Dashboard

1. Vá para: https://app.supabase.com
2. Faça login na sua conta
3. Selecione o projeto **stealth-messaging** (ou o nome do seu projeto)

### 2️⃣ Navegue até Authentication Settings

1. No menu lateral esquerdo, clique em **"Authentication"**
2. Depois clique em **"Settings"** (ou "Configurações")
3. Você verá várias abas: **General**, **Email Auth**, **Phone Auth**, etc.

### 3️⃣ Desabilite Email Confirmation

1. Clique na aba **"Email Auth"**
2. Role a página até encontrar a seção **"Email Confirmation"**
3. Procure pela checkbox que diz:
   ```
   ☐ Enable email confirmations
   ```
4. **DESMARQUE** essa checkbox (ela deve estar marcada ☑️)
5. Role até o final da página
6. Clique no botão **"Save"** ou **"Update"**

### 4️⃣ Verifique Outras Configurações

Certifique-se de que:

- ✅ **"Enable sign ups"** está **MARCADO** (permite novos cadastros)
- ❌ **"Enable email confirmations"** está **DESMARCADO** (não envia email)
- ✅ **"Secure email change"** pode ficar como está (não afeta cadastro inicial)

### 5️⃣ Salve e Teste

1. Após salvar, aguarde alguns segundos para a configuração ser aplicada
2. Tente criar uma nova conta de teste
3. ✅ **NÃO deve** receber email de confirmação
4. ✅ Deve conseguir fazer login imediatamente após cadastro

---

## 🖼️ Onde Encontrar no Dashboard

```
Supabase Dashboard
├── Seu Projeto
    ├── Authentication (menu lateral)
        ├── Settings
            ├── Email Auth (aba)
                └── ☐ Enable email confirmations ← DESMARQUE AQUI
```

---

## 🔧 Alternativa: Via SQL (Avançado)

Se preferir usar SQL diretamente no Supabase SQL Editor:

```sql
-- Verificar configuração atual
SELECT * FROM auth.config WHERE key = 'ENABLE_EMAIL_CONFIRMATIONS';

-- Desabilitar confirmação de email (requer permissões de admin)
-- NOTA: Isso pode não funcionar em projetos hospedados, use o Dashboard
UPDATE auth.config 
SET value = 'false' 
WHERE key = 'ENABLE_EMAIL_CONFIRMATIONS';
```

**⚠️ Nota:** A atualização via SQL pode não funcionar em projetos hospedados no Supabase Cloud. Use o Dashboard.

---

## ✅ Como Verificar se Está Funcionando

### Teste 1: Criar Nova Conta

1. Acesse o app
2. Clique em "Fale Conosco"
3. Preencha o cadastro com qualquer email (ex: `teste@teste`)
4. Clique em "Finalizar Cadastro"
5. ✅ **NÃO deve** receber email
6. ✅ Deve aparecer o PinPad imediatamente

### Teste 2: Verificar no Supabase

1. Vá em **Authentication** → **Users**
2. Veja a lista de usuários
3. O usuário recém-criado deve ter:
   - ✅ **Email confirmado automaticamente** (sem precisar clicar em link)
   - ✅ Status: **Active**

---

## 🐛 Problemas Comuns

### Problema: Ainda recebo emails após desabilitar

**Solução:**
1. Verifique se realmente salvou as configurações (clique em "Save")
2. Aguarde 1-2 minutos para propagação
3. Limpe o cache do navegador
4. Tente criar uma nova conta de teste

### Problema: Não consigo encontrar a opção

**Solução:**
1. Certifique-se de estar na aba **"Email Auth"** (não "General")
2. Role a página para baixo - a opção pode estar mais abaixo
3. Verifique se você tem permissões de admin no projeto

### Problema: A opção está desabilitada (cinza)

**Solução:**
- Isso pode acontecer se você estiver usando um plano gratuito com limitações
- Verifique seu plano em **Settings** → **Billing**
- Algumas configurações podem estar bloqueadas em planos específicos

---

## 📞 Precisa de Ajuda?

Se ainda estiver com problemas:

1. Tire um screenshot da tela de configurações do Supabase
2. Verifique se a checkbox está realmente desmarcada
3. Tente criar uma conta de teste e verifique se ainda recebe email

---

## 📝 Nota Técnica

O código do app já está configurado corretamente:

```typescript
// src/components/shared/AuthForm.tsx
await supabase.auth.signUp({
  email,
  password,
  options: { 
    emailRedirectTo: undefined, // Não envia email
    data: { nickname }
  },
});
```

Mas o Supabase ainda envia emails porque há uma configuração **global** no projeto que precisa ser desabilitada manualmente no Dashboard. Essa configuração tem precedência sobre as opções do código.

---

**Última atualização:** 2026-02-12
