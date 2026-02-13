# 🏗️ Arquitetura do Projeto - Stealth Messaging

Visão geral da arquitetura e decisões de design do projeto.

---

## 📐 Visão Geral

Stealth Messaging é uma aplicação web PWA construída com Next.js 16 (App Router) que funciona como um sistema de mensagens disfarçado de portal de notícias.

---

## 🎯 Princípios de Design

1. **Stealth First**: Tudo deve parecer um portal de notícias legítimo
2. **Segurança**: Criptografia E2E, PIN, modo incógnito
3. **Performance**: Lazy loading, code splitting, cache
4. **Offline First**: PWA funcional sem internet
5. **Mobile First**: Design responsivo, otimizado para mobile

---

## 🏛️ Arquitetura de Alto Nível

```
┌─────────────────────────────────────────┐
│         Cliente (Browser/PWA)           │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │   Next.js    │  │  Service Worker  │ │
│  │   (React)    │  │   (Offline)      │ │
│  └──────────────┘  └─────────────────┘ │
└──────────────┬──────────────────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────────────────┐
│         Vercel (Hosting)                │
│  ┌───────────────────────────────────┐  │
│  │      Next.js API Routes           │  │
│  │  - /api/push/send                 │  │
│  │  - /api/push/subscribe            │  │
│  └───────────────────────────────────┘  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Supabase (Backend)               │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │   Auth   │  │ Database │  │Storage │ │
│  │          │  │ (Postgres)│ │ (S3)   │ │
│  └──────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────┘
```

---

## 📁 Estrutura de Diretórios

```
stealth-messaging/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Layout raiz
│   │   ├── page.tsx            # Página inicial (portal)
│   │   ├── api/                # API Routes
│   │   │   ├── push/
│   │   │   └── auth/
│   │   └── auth/
│   │       └── callback/      # Callback OAuth
│   │
│   ├── components/              # Componentes React
│   │   ├── shared/             # Componentes compartilhados
│   │   │   ├── StealthMessagingProvider.tsx
│   │   │   ├── StealthNews.tsx
│   │   │   ├── PinPad.tsx
│   │   │   └── AuthForm.tsx
│   │   └── messaging/          # Componentes de mensagens
│   │       └── ChatLayout.tsx
│   │
│   ├── lib/                    # Utilitários
│   │   ├── supabase/           # Cliente Supabase
│   │   ├── pin.ts              # Gerenciamento PIN
│   │   ├── encryption.ts       # Criptografia E2E
│   │   ├── settings.ts         # Configurações
│   │   ├── monitoring.ts       # Logs e monitoramento
│   │   └── validation.ts      # Validação Zod
│   │
│   ├── hooks/                   # Custom hooks
│   │   ├── useAuth.ts
│   │   └── usePushSubscription.ts
│   │
│   └── types/                   # TypeScript types
│       └── messaging.ts
│
├── public/                      # Arquivos estáticos
│   ├── sw.js                    # Service Worker
│   └── manifest.json            # PWA manifest
│
├── docs/                        # Documentação
│   ├── API.md
│   ├── CONTRIBUTING.md
│   └── ARCHITECTURE.md
│
└── tests/                       # Testes
    └── e2e/                     # Testes E2E (Playwright)
```

---

## 🔄 Fluxo de Dados

### Autenticação

```
1. Usuário acessa portal (/)
2. Clica em "Fale Conosco" (duplo clique)
3. Se não logado → Modal de cadastro/login
4. Após login → PinPad para configurar PIN
5. PIN correto → Desbloqueia mensagens
```

### Envio de Mensagem

```
1. Usuário digita mensagem
2. Validação (Zod schema)
3. Rate limiting check
4. Upload de mídia (se houver) → Supabase Storage
5. Inserção no banco → Supabase Database
6. Realtime subscription → Notifica outros clientes
7. Push notification → Service Worker
```

### Recebimento de Mensagem

```
1. Supabase Realtime → Evento INSERT
2. Componente escuta evento
3. Adiciona mensagem ao estado local
4. Toast notification (se não estiver muted)
5. Push notification (se offline)
```

---

## 🗄️ Banco de Dados (Supabase)

### Tabelas Principais

- `profiles`: Perfis de usuários
- `chats`: Conversas (private/group)
- `chat_participants`: Participantes das conversas
- `messages`: Mensagens
- `push_subscriptions`: Subscriptions para push

### RLS (Row Level Security)

Todas as tabelas têm políticas RLS:
- Usuários só veem seus próprios dados
- Mensagens só visíveis para participantes do chat
- Storage protegido por políticas

---

## 🔐 Segurança

### Camadas de Segurança

1. **Autenticação**: Supabase Auth (JWT)
2. **Autorização**: RLS policies no banco
3. **PIN**: Hash no localStorage (não texto plano)
4. **E2E Encryption**: Web Crypto API (opcional)
5. **Rate Limiting**: Client-side e server-side
6. **CORS**: Configurado no Supabase

### Modo Stealth

- Portal de notícias sempre visível primeiro
- Mensagens só aparecem após PIN correto
- Auto-lock configurável
- Modo incógnito com auto-delete

---

## ⚡ Performance

### Otimizações Implementadas

1. **Code Splitting**: Webpack configurado
2. **Lazy Loading**: Mensagens paginadas
3. **Image Optimization**: Next.js Image component
4. **Service Worker**: Cache de assets
5. **Bundle Optimization**: Tree shaking, minificação

### Métricas Alvo

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Bundle size: < 500KB (gzipped)

---

## 📱 PWA (Progressive Web App)

### Funcionalidades

- ✅ Service Worker instalado
- ✅ Manifest.json configurado
- ✅ Offline support (cache)
- ✅ Push notifications
- ✅ Installable (Add to Home Screen)

### Service Worker Strategy

- **Assets estáticos**: Cache first
- **API calls**: Network first, fallback cache
- **Mensagens**: Cache para acesso offline

---

## 🧪 Testes

### E2E (Playwright)

- Fluxo de autenticação
- Envio/recebimento de mensagens
- Drag & drop de arquivos
- Modo incógnito

### Testes Manuais

- Checklist antes de cada deploy
- Testes em diferentes navegadores
- Testes em mobile (iOS/Android)

---

## 🚀 Deploy

### Vercel

- Deploy automático via GitHub
- Preview deployments para PRs
- Variáveis de ambiente configuradas

### Build Process

1. `npm run build` → Next.js build
2. TypeScript validation
3. ESLint check
4. Deploy para Vercel

---

## 🔮 Futuro

### Melhorias Planejadas

- Grupos de conversas
- Sincronização offline melhorada
- Testes automatizados completos
- Monitoramento com Sentry
- Analytics opcional

---

**Última atualização:** 2026-02-13
