# 🔐 Stealth Messaging – Sistema de Mensagens Disfarçado

Aplicativo de **mensagens em tempo real** disfarçado como app de **notícias**. A interface pública mostra notícias; usuários autenticados acessam o chat.

## 🎯 Funcionalidades

| Funcionalidade | Descrição |
|----------------|-----------|
| **Login e cadastro** | Cadastro/login pelo **botão oculto** (Fale Conosco ou duplo clique na data). 1ª vez: signup (nickname, email, senha); depois: só PIN. Rotas `/login` e `/signup` também disponíveis. |
| **Menu lateral** | Ícone ☰ abre sidebar com: Início, Receber alertas de notícias (push), Sair. |
| **Notícias em nova aba** | Clique em qualquer notícia abre o link em nova aba (inclui mocks com URL). |
| **Push disfarçado** | “Receber alertas de notícias” inscreve o dispositivo para notificações (Web Push). |
| **Mensagens em tempo real** | Chat com Supabase Realtime. |
| **Upload de mídia** | Fotos, vídeos e **áudio** (gravação ou arquivo) no chat. |
| **Notificações inteligentes** | Push notifications diferenciadas: mensagens reais vs notícias disfarçadas. |
| **Toast ao receber** | Notificação in-app quando recebe mensagem de outro usuário. |
| **Retenção de dados** | Mensagens e mídia mantidos por **mínimo de 10 dias** (efêmeras respeitam período mínimo). |
| **Auto-lock** | Volta ao modo notícias após inatividade. |
| **Rate limit PIN** | Após 5 tentativas erradas, bloqueio de 1 minuto. |
| **Esconder agora** | Ícone discreto no header do chat que volta ao portal imediatamente. |

## 🚀 Instalação rápida

```bash
git clone https://github.com/felipemonteiro-bfx/MESSAGES.git stealth-messaging
cd stealth-messaging
yarn install
cp .env.example .env.local
```

Edite `.env.local` com as credenciais do Supabase (e opcionalmente News API e VAPID para push). Depois execute no **Supabase → SQL Editor**, nesta ordem:

1. `docs/SETUP_COMPLETO.sql` – tabelas (profiles, chats, messages, etc.), RLS e Realtime  
2. `docs/adicionar_mensagens_efemeras.sql` – mensagens efêmeras com retenção mínima de 10 dias  
3. `docs/retencao_10_dias.sql` – política de retenção mínima (opcional, já incluído no passo 2)  
4. `docs/push_subscriptions.sql` – tabela de inscrições push  
5. `docs/trigger_create_profile.sql` – cria perfil ao registrar usuário  

Em seguida:

- **Storage**: criar bucket `chat-media` (privado).  
- **Realtime**: habilitado nas tabelas indicadas no `SETUP_COMPLETO.sql`.  
- **Auth**: em *Authentication → URL Configuration*, definir *Site URL* (ex.: `http://localhost:3005` ou a URL da Vercel).  
  - **Importante**: Desabilitar confirmação de email em *Authentication → Settings → Email Auth* → desmarque "Enable email confirmations" (aceita qualquer email sem validação).

```bash
yarn dev
```

Acesse: **http://localhost:3005**

- **Portal público:** a home (`/`) mostra o portal de notícias para todos, sem login. Após cadastro, redireciona para o portal (não para `/login`).
- **Acesso ao chat:** clique em "Fale Conosco" (rodapé) ou dê **duplo clique na data** (header). 1ª vez: cadastro (nickname, email qualquer, senha) → aparece PinPad para configurar PIN; depois: apenas PIN. **Cadastro só aparece ao clicar em "Fale Conosco"**.
- **Rotas diretas:** `/signup` e `/login` para cadastro e login tradicionais (após cadastro, vai para portal `/`).

## 📁 Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Chave anônima (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | Para APIs server-side | Chave service role |
| `NEXT_PUBLIC_NEWS_API_KEY` | Não | News API para notícias reais |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Para push | Chave pública VAPID (Web Push) |
| `VAPID_PRIVATE_KEY` | Para push | Chave privada VAPID |

Gerar par VAPID: `node scripts/generate-vapid.js` (se existir) ou use [web-push](https://www.npmjs.com/package/web-push).

## 🧪 Testes E2E (Playwright)

Os testes usam as mesmas variáveis do `.env.local`. Se preferir um ambiente isolado, crie `.env.test` a partir de `.env.test.example`:

```bash
cp .env.test.example .env.test
# Edite .env.test com as credenciais do Supabase
```

**Primeira vez** – instalar browsers:

```bash
npm run test:e2e:install
```

**Executar testes:**

```bash
npm run test:e2e        # Todos os testes
npm run test:e2e:ui     # Interface gráfica
npx playwright test tests/e2e/auth-flow.spec.ts  # Arquivo específico
```

O Playwright inicia o servidor Next.js automaticamente (porta 3005) e usa o Supabase configurado em `.env.local` ou `.env.test`.

## 📱 Apps Mobile (Android e iOS)

O app está preparado para gerar apps nativos usando **Capacitor**:

```bash
# Setup inicial (primeira vez)
npm install
CAPACITOR=true npm run build
npx cap add android  # ou ios
npx cap sync

# Abrir no IDE nativo
npm run cap:open:android  # Android Studio
npm run cap:open:ios      # Xcode (macOS)
```

📖 **Guia completo:** [docs/BUILD_MOBILE.md](docs/BUILD_MOBILE.md)  
⚡ **Setup rápido:** [docs/SETUP_MOBILE.md](docs/SETUP_MOBILE.md)

## 📚 Documentação

- **[docs/DOCUMENTACAO_APLICACAO.md](docs/DOCUMENTACAO_APLICACAO.md)** – Documentação completa da aplicação (setup, rotas, deploy, troubleshooting)  
- **[docs/CONFIGURAR_AUTH_SEM_CONFIRMACAO.md](docs/CONFIGURAR_AUTH_SEM_CONFIRMACAO.md)** – Como desabilitar confirmação de email no Supabase  
- **[docs/BUILD_MOBILE.md](docs/BUILD_MOBILE.md)** – Guia completo para build Android/iOS  
- **[docs/SETUP_MOBILE.md](docs/SETUP_MOBILE.md)** – Setup rápido para mobile  
- `CONFIGURAR_SUPABASE.md` – Configuração do Supabase  
- `DEPLOY_VERCEL.md` – Deploy na Vercel  
- `CONFIGURAR_NEWSAPI.md` – Notícias reais com News API  
- `STEALTH_MESSAGING.md` – Detalhes do sistema stealth  

## 🛠️ Tecnologias

- Next.js 16 (App Router)
- React 19
- Supabase (Auth, Database, Storage, Realtime)
- TypeScript, Tailwind CSS, Framer Motion, Zod
- Web Push (notificações)

## 📝 Licença

Privado
