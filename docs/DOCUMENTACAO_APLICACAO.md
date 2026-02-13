# Documentação da Aplicação – Stealth Messaging

Documentação completa do sistema: visão geral, rotas, setup e deploy.

---

## 1. Visão geral

O **Stealth Messaging** é um app de mensagens em tempo real cuja interface pública se apresenta como um **aplicativo de notícias**. A home (`/`) é **pública**: qualquer pessoa vê o portal de notícias. O acesso ao chat é secreto: botão "Fale Conosco" (rodapé) ou **duplo clique na data** (header). Na 1ª vez: cadastro (nickname, email, senha) ou login; depois: apenas o PIN de 4 dígitos.

### Principais características

- **Autenticação**: cadastro com email (qualquer email, sem confirmação), senha e nickname; login com email/senha. Após cadastro, redireciona para portal (`/`), não para `/login`. Cadastro só aparece ao clicar em "Fale Conosco".
- **Perfil**: criado automaticamente no signup (tabela `profiles`), com nickname e avatar.
- **Capa (notícias)**: lista de notícias; ao clicar, o link abre em **nova aba**.
- **Menu lateral (☰)**: Início, Receber alertas de notícias (push), Sair.
- **Push disfarçado**: notificações Web Push configuradas como "alertas de notícias".
- **Notificações inteligentes**: mensagens reais têm notificação diferenciada (título "Nova mensagem"), enquanto notícias mantêm disfarce.
- **Chat**: mensagens em tempo real (Supabase Realtime), mídia (fotos, vídeo, **áudio**), mensagens efêmeras (opcional).
- **Envio de áudio**: gravação direta no app ou upload de arquivo de áudio.
- **Toast ao receber**: notificação in-app quando recebe mensagem de outro usuário.
- **Retenção de dados**: mensagens e mídia mantidos por **mínimo de 10 dias** (mesmo efêmeras respeitam período mínimo).
- **Rate limit no PIN**: após 5 tentativas erradas, bloqueio de 1 minuto (anti brute-force).
- **Botão "Esconder agora"**: ícone discreto no header do chat que volta ao portal imediatamente (situações de risco).

---

## 2. Rotas da aplicação

| Rota | Acesso | Descrição |
|------|--------|-----------|
| `/` | Público | Home: portal de notícias (StealthNews) para todos. Acesso ao chat via botão oculto (Fale Conosco ou duplo clique na data) → signup/login ou PIN. |
| `/login` | Público | Página de login (email/senha). Query `?registered=1` mostra toast de conta criada. |
| `/signup` | Público | Cadastro (email qualquer, senha, nickname). Após sucesso, redireciona para portal (`/`), não para `/login`. |
| `/auth/callback` | Público | Callback OAuth do Supabase. Redireciona para portal (`/`). |
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
   - **Retenção mínima de 10 dias** garantida (mesmo para efêmeras).  
   - **Opcional.**

3. **`docs/push_subscriptions.sql`**  
   - Tabela `push_subscriptions` e RLS.  
   - **Obrigatório** se for usar push.

4. **`docs/retencao_10_dias.sql`** (opcional)  
   - Política de retenção mínima de 10 dias para mensagens e mídia.  
   - Já incluído em `adicionar_mensagens_efemeras.sql`, mas disponível como arquivo standalone.

5. **`docs/trigger_create_profile.sql`**  
   - Trigger em `auth.users`: ao criar usuário, insere perfil em `profiles` (nickname e avatar).  
   - **Obrigatório** para cadastro com nickname.

### 3.4 Storage e Realtime

- **Storage**: crie o bucket `chat-media` (privado) para mídia do chat.
- **Realtime**: habilite nas tabelas usadas pelo chat (ex.: `messages`, `chats`, `chat_participants`), conforme indicado no `SETUP_COMPLETO.sql`.

### 3.5 Autenticação (Supabase)

- **Authentication → URL Configuration**
  - **Site URL**: em desenvolvimento use `http://localhost:3005`; em produção use a URL do app (ex.: `https://seu-app.vercel.app`).
  - **Redirect URLs**: inclua `http://localhost:3005/**` e `https://seu-app.vercel.app/**` (ou o domínio real).

- **Authentication → Settings → Email Auth**
  - **Desmarque "Enable email confirmations"** para aceitar qualquer email sem validação (recomendado para este app).
  - Se confirmar email estiver ativo, o usuário precisa confirmar o email antes de logar; o link de confirmação usa o Redirect URL acima.
  - Com confirmação desabilitada, o cadastro permite login imediato após signup e aceita qualquer email (mesmo inválido).
  - 📖 **Guia completo:** [docs/CONFIGURAR_AUTH_SEM_CONFIRMACAO.md](CONFIGURAR_AUTH_SEM_CONFIRMACAO.md)

### 3.6 Rodar localmente

```bash
yarn install
yarn dev
```

Acesse: **http://localhost:3005**

- Portal público (`/`) mostra notícias para todos.
- Clique em "Fale Conosco" para cadastro/login (1ª vez) ou apenas PIN (depois).
- Após cadastro, redireciona para portal (`/`), não para `/login`.

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

1. **Acessa o app** → portal de notícias (home pública, sem login).
2. **Acesso ao chat:** clica em "Fale Conosco" (rodapé) ou dá **duplo clique na data** (header).
3. **1ª vez (não logado):** modal de cadastro ou login (nickname, email, senha). Após sucesso → configura PIN de 4 dígitos.
4. **Depois (já logado):** só digita o PIN.
5. PIN correto → abre o chat. Menu lateral (☰): Início, Receber alertas (push), Sair.
6. **Enviar mensagens**: texto, fotos, vídeos ou **áudio** (gravação ou arquivo).
7. **Receber mensagens**: toast in-app + push notification (se habilitado). Notificações de mensagens reais são diferenciadas de notícias.
8. **Esconder rapidamente**: ícone de jornal no header do chat volta ao portal a qualquer momento.
9. Clique em qualquer notícia → abre em **nova aba**.
10. **Retenção**: todas as mensagens e mídia são mantidas por **mínimo de 10 dias**.

---

## 6. Troubleshooting

| Problema | O que verificar |
|----------|------------------|
| Cadastro não cria usuário/perfil | Supabase: trigger `trigger_create_profile.sql` instalado; RLS em `profiles` permite INSERT para o próprio usuário. |
| Login não redireciona / sessão não persiste | Site URL e Redirect URLs no Supabase; cookies em produção (domínio e HTTPS). |
| "Não tem nada" após cadastrar | Garantir que as rotas `/login` e `/signup` existem e que a home é pública; o acesso ao chat é pelo botão oculto (Fale Conosco ou duplo clique na data). |
| Menu lateral não abre | Verificar componente StealthNews (sidebar e estado de abertura). |
| Notícias não abrem em nova aba | Lista de notícias deve usar `window.open(url, '_blank')` ou `<a target="_blank">` com `url` definido. |
| Push não funciona | Tabela `push_subscriptions` criada; envs VAPID na Vercel; HTTPS; Service Worker e `/api/push/subscribe` sendo chamados. |
| Notificações não aparecem | Verificar permissão do navegador; Service Worker registrado (`/sw.js`); VAPID configurado. |
| Mensagens não aparecem | Verificar Realtime habilitado nas tabelas; RLS permite SELECT para participantes do chat. |
| Áudio não funciona | Verificar permissão de microfone; navegador suporta MediaRecorder API; bucket `chat-media` criado. |
| Erro de build "useSearchParams suspense" | Página que usa `useSearchParams()` deve estar dentro de um `<Suspense>` (ex.: wrapper na página de login). |

---

## 7. Estrutura de documentação no repositório

- **README.md** – Visão geral, funcionalidades, instalação rápida e links.
- **docs/DOCUMENTACAO_APLICACAO.md** – Este arquivo (documentação completa).
- **docs/SETUP_COMPLETO.sql** – Schema principal do banco.
- **docs/trigger_create_profile.sql** – Criação automática de perfil no signup.
- **docs/push_subscriptions.sql** – Tabela e RLS para push.
- **docs/adicionar_mensagens_efemeras.sql** – Mensagens efêmeras com retenção mínima de 10 dias.
- **docs/retencao_10_dias.sql** – Política de retenção mínima (standalone).
- **CONFIGURAR_SUPABASE.md**, **DEPLOY_VERCEL.md**, **CONFIGURAR_NEWSAPI.md** – Guias específicos.

Para dúvidas sobre mensagens efêmeras ou schema de mensagens, consulte também **docs/adicionar_mensagens_efemeras.sql** e **docs/messaging_schema.sql** (se existirem).
