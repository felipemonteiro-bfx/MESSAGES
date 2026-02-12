# Verificação completa – versão online com todas as funções

Use este guia para deixar o **stealth-messaging** atualizado e funcionando no Supabase, GitHub e Vercel.

---

## 1. Compilação e testes locais (já verificados)

- **Type-check:** `yarn type-check` ✅  
- **Lint:** `yarn lint` ✅  
- **Build:** `yarn build` ✅ (com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` definidos)

---

## 2. Supabase – ordem dos scripts

Execute no **SQL Editor** do Supabase, **nesta ordem**:

| Ordem | Arquivo | O que faz |
|-------|---------|-----------|
| 1 | `docs/SETUP_COMPLETO.sql` | Cria `profiles`, `chats`, `chat_participants`, `messages`, bucket `chat-media`, funções e políticas |
| 2 | `docs/adicionar_mensagens_efemeras.sql` | Colunas `expires_at`, `is_ephemeral` e função de limpeza |
| 3 | `docs/push_subscriptions.sql` | Tabela `push_subscriptions` para notificações push |
| 4 | `docs/trigger_create_profile.sql` | Trigger que cria perfil ao criar usuário em `auth.users` |

Depois de rodar, confira:

- **Table Editor:** existem as tabelas `profiles`, `chats`, `chat_participants`, `messages`, `push_subscriptions`.
- **Storage:** existe o bucket `chat-media`.
- **Authentication:** usuários podem se cadastrar e fazer login.

---

## 3. Variáveis de ambiente (Vercel e local)

### Obrigatórias (app e auth)

- `NEXT_PUBLIC_SUPABASE_URL` – URL do projeto (ex.: `https://xxxx.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – chave anon/public

### Opcionais

- `NEXT_PUBLIC_NEWS_API_KEY` – notícias reais (NewsAPI)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` – chave pública VAPID (push)
- `VAPID_PRIVATE_KEY` – chave privada VAPID (só no servidor; **não** usar `NEXT_PUBLIC_`)

Para gerar as chaves VAPID:

```bash
node scripts/generate-vapid.js
```

Adicione as duas linhas no `.env.local` e em **Vercel → Settings → Environment Variables** (Production e Preview).

---

## 4. GitHub

- **Repositório:** o que está em **main** é o que a Vercel usa.
- Para publicar alterações:
  ```bash
  git add .
  git commit -m "sua mensagem"
  git push origin main
  ```
- **CI:** se existir workflow em `.github/workflows/ci.yml`, ele roda a cada push; o build usa placeholders se as envs não estiverem no GitHub.

---

## 5. Vercel

- **Deploy:** a cada push em **main**, a Vercel faz deploy automático.
- **Variáveis:** confira em **Settings → Environment Variables** que as variáveis acima estão preenchidas (principalmente Supabase e, se for usar push, VAPID).
- **URL:** após o deploy, o app fica em `https://seu-projeto.vercel.app` (ou domínio customizado).

---

## 6. Checklist de funções

| Função | Como testar |
|--------|-------------|
| **Login / Signup** | Criar conta com email e nickname; fazer login. |
| **Perfil** | Após signup, ver perfil no app; editar nickname se houver tela de perfil. |
| **Notícias (disfarce)** | Na tela inicial, ver notícias; clicar no **menu (três linhas)** (toast); clicar em uma notícia (abre em nova aba). |
| **Fale Conosco / PIN** | Duplo clique na data ou botão "Fale Conosco"; digitar PIN e acessar mensagens. |
| **Chat** | Adicionar contato (nickname/email), enviar mensagem de texto e mídia. |
| **Push disfarçado** | Clicar em "Receber alertas de notícias", permitir notificações; em outro usuário, enviar mensagem e conferir notificação no dispositivo. |
| **Mensagens efêmeras** | Se a UI tiver opção de enviar mensagem efêmera, enviar e verificar que some após o tempo. |

---

## 7. Resumo rápido

1. **Supabase:** rodar os 4 SQLs na ordem acima.  
2. **Vercel:** configurar envs (Supabase + VAPID se usar push).  
3. **GitHub:** código atualizado em **main**.  
4. **Deploy:** push em **main** → Vercel atualiza sozinha.  

Com isso, a versão mais recente fica online com as funções principais (auth, perfil, notícias, menu, links, chat, push) funcionando.
