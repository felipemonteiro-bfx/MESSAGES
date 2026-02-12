# Documentação da Aplicação – Stealth Messaging

Documentação completa do sistema: visão geral, rotas, setup e deploy.

---

## 1. Visão geral

O **Stealth Messaging** é um app de mensagens em tempo real cuja interface pública se apresenta como um **aplicativo de notícias**. Quem não está logado vê apenas a tela de login; após autenticação, o usuário acessa a área de notícias (capa) e, a partir dela, o chat e as demais funções.

### Principais características

- **Autenticação**: cadastro com email, senha e nickname; login com email/senha.
- **Perfil**: criado automaticamente no signup (tabela `profiles`), com nickname e avatar.
- **Capa (notícias)**: lista de notícias; ao clicar, o link abre em **nova aba**.
- **Menu lateral (☰)**: Início, Receber alertas de notícias (push), Sair.
- **Push disfarçado**: notificações Web Push configuradas como “alertas de notícias”.
- **Chat**: mensagens em tempo real (Supabase Realtime), mídia (fotos, vídeo, áudio), mensagens efêmeras (opcional).

---

## 2. Rotas da aplicação

| Rota | Acesso | Descrição |
|------|--------|-----------|
| `/` | Autenticado | Home: se não houver sessão, redireciona para `/login`. Exibe StealthNews + ChatLayout. |
| `/login` | Público | Página de login (email/senha). Query `?registered=1` mostra toast de conta criada. |
| `/signup` | Público | Cadastro (email, senha, nickname). Após sucesso, redireciona para `/login?registered=1`. |
| `/auth/callback` | Público | Callback OAuth do Supabase (confirmação de email, etc.). |
| `/api/push/subscribe` | POST | Registra inscrição Web Push do usuário. |
| `/api/push/send` | POST | Envia notificação push (uso interno/admin). |

O **middleware** atualiza a sessão Supabase em todas as rotas e aplica rate limit em `/login`, `/signup` e em rotas `/api/`.

---

## 3. Setup completo (desenvolvimento e produção)

### 3.1 Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- (Opcional) Chave [News API](https://newsapi.org) para notícias reais
- (Opcional) Par de chaves VAPID para Web Push

### 3.2 Variáveis de ambiente

Crie `.env.local` a partir de `.env.example`:

```bash
cp .env.example .env.local
```

Preencha:

| Variável | Obrigatório | Onde obter |
|----------|-------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Supabase → Project Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Para APIs server | Supabase → Project Settings → API → service_role |
| `NEXT_PUBLIC_NEWS_API_KEY` | Não | newsapi.org (notícias reais) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Para push | Gerar com `web-push` ou script do projeto |
| `VAPID_PRIVATE_KEY` | Para push | Mesmo par acima |

### 3.3 Scripts SQL no Supabase (ordem)

Execute no **SQL Editor** do projeto Supabase, **nesta ordem**:

1. **`docs/SETUP_COMPLETO.sql`**  
   - Cria tabelas: `profiles`, `chats`, `chat_participants`, `messages`, etc.  
   - RLS, políticas e Realtime.  
   - **Obrigatório.**

2. **`docs/adicionar_mensagens_efemeras.sql`**  
   - Colunas e lógica para mensagens efêmeras.  
   - **Opcional.**

3. **`docs/push_subscriptions.sql`**  
   - Tabela `push_subscriptions` e RLS.  
   - **Obrigatório** se for usar push.

4. **`docs/trigger_create_profile.sql`**  
   - Trigger em `auth.users`: ao criar usuário, insere perfil em `profiles` (nickname e avatar).  
   - **Obrigatório** para cadastro com nickname.

### 3.4 Storage e Realtime

- **Storage**: crie o bucket `chat-media` (privado) para mídia do chat.
- **Realtime**: habilite nas tabelas usadas pelo chat (ex.: `messages`, `chats`, `chat_participants`), conforme indicado no `SETUP_COMPLETO.sql`.

### 3.5 Autenticação (Supabase)

- **Authentication → URL Configuration**
  - **Site URL**: em desenvolvimento use `http://localhost:3005`; em produção use a URL do app (ex.: `https://seu-app.vercel.app`).
  - **Redirect URLs**: inclua `http://localhost:3005/**` e `https://seu-app.vercel.app/**` (ou o domínio real).

- **Authentication → Email**
  - Se **Confirm email** estiver ativo, o usuário precisa confirmar o email antes de logar; o link de confirmação usa o Redirect URL acima.
  - Se desativar, o cadastro permite login imediato após signup.

### 3.6 Rodar localmente

```bash
yarn install
yarn dev
```

Acesse: **http://localhost:3005**

- Ir em `/signup` para criar conta (email, senha, nickname).
- Em seguida fazer login em `/login` e usar o app (notícias, menu lateral, push, chat).

---

## 4. Deploy na Vercel

1. Conecte o repositório (ex.: GitHub `felipemonteiro-bfx/MESSAGES`) ao projeto na Vercel.
2. Em **Settings → Environment Variables** defina pelo menos:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (Recomendado) `SUPABASE_SERVICE_ROLE_KEY`
   - Para push: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`
3. Em **Authentication → URL Configuration** no Supabase, use a URL de produção (ex.: `https://seu-app.vercel.app`) em **Site URL** e em **Redirect URLs**.
4. Após cada push na branch configurada (ex.: `main`), a Vercel faz o deploy automático.

Detalhes adicionais: **DEPLOY_VERCEL.md** e **VERCEL_ENV_VARS.md** na raiz do projeto.

---

## 5. Fluxo do usuário

1. Acessa o app → se não houver sessão, vai para **/login**.
2. Em **Cadastrar** (ou `/signup`): preenche email, senha e nickname → signup Supabase → trigger cria perfil → redireciona para `/login?registered=1`.
3. Faz **login** em `/login` → redireciona para `/`.
4. Na home: vê a capa de notícias e pode abrir o **menu lateral (☰)** para Início, Receber alertas (push), Sair.
5. Clique em uma notícia → abre em **nova aba**.
6. A partir da interface, acessa o chat e as demais funcionalidades.

---

## 6. Troubleshooting

| Problema | O que verificar |
|----------|------------------|
| Cadastro não cria usuário/perfil | Supabase: trigger `trigger_create_profile.sql` instalado; RLS em `profiles` permite INSERT para o próprio usuário. |
| Login não redireciona / sessão não persiste | Site URL e Redirect URLs no Supabase; cookies em produção (domínio e HTTPS). |
| “Não tem nada” após cadastrar | Garantir que as rotas `/login` e `/signup` existem e que a home redireciona para `/login` quando não há sessão. |
| Menu lateral não abre | Verificar componente StealthNews (sidebar e estado de abertura). |
| Notícias não abrem em nova aba | Lista de notícias deve usar `window.open(url, '_blank')` ou `<a target="_blank">` com `url` definido. |
| Push não funciona | Tabela `push_subscriptions` criada; envs VAPID na Vercel; HTTPS; Service Worker e `/api/push/subscribe` sendo chamados. |
| Erro de build “useSearchParams suspense” | Página que usa `useSearchParams()` deve estar dentro de um `<Suspense>` (ex.: wrapper na página de login). |

---

## 7. Estrutura de documentação no repositório

- **README.md** – Visão geral, funcionalidades, instalação rápida e links.
- **docs/DOCUMENTACAO_APLICACAO.md** – Este arquivo (documentação completa).
- **docs/SETUP_COMPLETO.sql** – Schema principal do banco.
- **docs/trigger_create_profile.sql** – Criação automática de perfil no signup.
- **docs/push_subscriptions.sql** – Tabela e RLS para push.
- **CONFIGURAR_SUPABASE.md**, **DEPLOY_VERCEL.md**, **CONFIGURAR_NEWSAPI.md** – Guias específicos.

Para dúvidas sobre mensagens efêmeras ou schema de mensagens, consulte também **docs/adicionar_mensagens_efemeras.sql** e **docs/messaging_schema.sql** (se existirem).
