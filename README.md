# 🔐 Stealth Messaging - Sistema de Mensagens Disfarçado

Sistema de mensagens completamente disfarçado como um aplicativo de notícias em tempo real.

## 🎯 Funcionalidades

- **Interface Pública**: Aplicativo de notícias em tempo real
- **Acesso Secreto**: PIN de 4 dígitos para acessar mensagens
- **Mensagens em Tempo Real**: Chat usando Supabase Realtime
- **Upload de Mídia**: Fotos, vídeos e áudio
- **Auto-Lock**: Volta automaticamente para modo notícias após 10 segundos sem foco
- **Notificações Disfarçadas**: Mensagens aparecem como notícias

## 🚀 Instalação

1. Clone o repositório:
```bash
git clone <seu-repositorio>
cd stealth-messaging
```

2. Instale as dependências:
```bash
yarn install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais do Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
NEXT_PUBLIC_NEWS_API_KEY=sua-chave-news-api (opcional)
```

4. Execute o script SQL no Supabase:
- Acesse o SQL Editor no Supabase
- Execute o conteúdo de `docs/messaging_schema.sql`

5. Crie os buckets de Storage no Supabase:
- `chat-media` (privado) - para mídia das mensagens

6. Ative o Realtime nas tabelas:
- `messages`
- `chats`
- `chat_participants`

7. Execute o projeto:
```bash
yarn dev
```

Acesse: http://localhost:3005

## 📚 Documentação

- `STEALTH_MESSAGING.md` - Documentação completa do sistema
- `CONFIGURAR_SUPABASE.md` - Guia de configuração do Supabase
- `DEPLOY_VERCEL.md` - Guia completo de deploy no Vercel
- `CONFIGURAR_NEWSAPI.md` - Como configurar NewsAPI para notícias reais
- `TESTAR_NO_SAFARI.md` - Como testar no iPhone Safari
- `MELHORIAS_IMPLEMENTADAS.md` - Lista de melhorias aplicadas

## 🛠️ Tecnologias

- Next.js 15.1.6
- React 19
- Supabase (Auth, Database, Storage, Realtime)
- TypeScript
- Tailwind CSS
- Framer Motion
- Zod (validação)

## 📝 Licença

Privado
