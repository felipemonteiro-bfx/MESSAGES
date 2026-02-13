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
| **Upload de mídia** | Fotos, vídeos e áudio no chat. |
| **Auto-lock** | Volta ao modo notícias após inatividade. |

## 🚀 Instalação rápida

```bash
git clone https://github.com/felipemonteiro-bfx/MESSAGES.git stealth-messaging
cd stealth-messaging
yarn install
cp .env.example .env.local
```

Edite `.env.local` com as credenciais do Supabase (e opcionalmente News API e VAPID para push). Depois execute no **Supabase → SQL Editor**, nesta ordem:

1. `docs/SETUP_COMPLETO.sql` – tabelas (profiles, chats, messages, etc.), RLS e Realtime  
2. `docs/adicionar_mensagens_efemeras.sql` – mensagens efêmeras (opcional)  
3. `docs/push_subscriptions.sql` – tabela de inscrições push  
4. `docs/trigger_create_profile.sql` – cria perfil ao registrar usuário  

Em seguida:

- **Storage**: criar bucket `chat-media` (privado).  
- **Realtime**: habilitado nas tabelas indicadas no `SETUP_COMPLETO.sql`.  
- **Auth**: em *Authentication → URL Configuration*, definir *Site URL* (ex.: `http://localhost:3005` ou a URL da Vercel).

```bash
yarn dev
```

Acesse: **http://localhost:3005**

- **Portal público:** a home (`/`) mostra o portal de notícias para todos, sem login.
- **Acesso ao chat:** clique em "Fale Conosco" (rodapé) ou dê **duplo clique na data** (header). 1ª vez: cadastro (nickname, email, senha); depois: digite o PIN de 4 dígitos.
- **Rotas diretas:** `/signup` e `/login` para cadastro e login tradicionais.

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

## 📚 Documentação

- **[docs/DOCUMENTACAO_APLICACAO.md](docs/DOCUMENTACAO_APLICACAO.md)** – Documentação completa da aplicação (setup, rotas, deploy, troubleshooting)  
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
