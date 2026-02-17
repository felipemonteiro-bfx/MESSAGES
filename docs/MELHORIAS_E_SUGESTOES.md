# Melhorias, Correções e Sugestões – Stealth Messaging (Noticias24h)

> Documento gerado a partir da revisão do código em 2025.

---

## 1. Correções Aplicadas

### 1.1 Lint (ESLint)

| Arquivo | Problema | Correção |
|---------|----------|----------|
| `src/app/api/news/route.ts` | `let encoding` violava `prefer-const` | Alterado para `const encoding` |
| `src/components/shared/Navbar.tsx` | Comentário `eslint-disable` desnecessário | Removido |
| `src/hooks/useLocalStorage.ts` | Comentário `eslint-disable` desnecessário | Removido |

**Resultado:** `npm run lint` passa sem erros.

### 1.2 Testes E2E

| Mudança | Motivo |
|---------|--------|
| Botão "Fale Conosco" com `data-testid="fale-conosco-btn"` | Seletores mais estáveis e menos ambíguos |
| Timeouts aumentados em auth-flow | WebKit/Safari mais lentos em alguns cenários |
| Testes usam `getByTestId('fale-conosco-btn')` | Evita clicar em elemento errado (ex.: Footer) |

---

## 2. Sugestões de Melhorias

### 2.1 Performance

- **API de notícias (`/api/news`):**
  - Usar cache (ex.: `fetch` com `next: { revalidate }`) para feeds RSS.
  - Considerar `ISR` (Incremental Static Regeneration) para páginas de categoria.
- **Chat / mensagens:**
  - `@tanstack/react-virtual` já em uso – conferir configuração de `overscan` para rolagem suave.
  - Lazy load de imagens em mensagens com `loading="lazy"` ou `IntersectionObserver`.
- **Build:**
  - Verificar tree-shaking de `lucide-react` (importar ícones específicos em vez de `*`).

### 2.2 Usabilidade

- **Feedback visual:**
  - Estados de loading consistentes em botões e modais (ex.: spinner ou skeleton).
  - Toast/feedback claro em ações como “Contato adicionado” ou “Erro ao enviar”.
- **Acessibilidade:**
  - Garantir `aria-label` em ícones sem texto.
  - Ordem de foco em modais e fluxo de autenticação.
  - Suporte a teclado (Enter para enviar, Esc para fechar).
- **Modo stealth:**
  - Tooltip explicando o duplo clique em “Fale Conosco” (opcional e discreto).

### 2.3 Segurança

- **Supabase:**
  - RLS bem configurado em todas as tabelas.
  - Uso de `SECURITY DEFINER` apenas onde necessário (ex.: `get_user_by_email`).
- **Variáveis de ambiente:**
  - Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no cliente.
  - Usar `.env.test` com credenciais de teste separadas.

---

## 3. Novas Funcionalidades Sugeridas

### 3.1 Chat

- Busca de mensagens dentro de uma conversa.
- Edição e exclusão de mensagens (soft delete).
- Indicador de “digitando…” em tempo real.
- Chamadas de voz/vídeo (WebRTC) usando a infraestrutura existente.

### 3.2 Notícias

- Filtros por data (hoje, semana, mês).
- Salvar notícias favoritas no perfil.
- Modo de leitura offline (PWA com Service Worker).
- Compartilhamento direto para o chat.

### 3.3 Perfil e Privacidade

- Bloqueio de contatos.
- Modo “invisível” (online sem aparecer para outros).
- Exportação de dados (LGPD).

---

## 4. Automações Sugeridas

### 4.1 CI/CD

```yaml
# Exemplo para GitHub Actions
- run: npm ci
- run: npm run lint
- run: npm run build
- run: npx playwright install --with-deps
- run: npx playwright test --project=chromium
```

### 4.2 Testes E2E

- Rodar Playwright em CI apenas em `chromium` para reduzir tempo.
- Usar `webServer` do Playwright para subir o app em CI.
- Habilitar retries (`retries: 2`) em testes mais instáveis.

### 4.3 Deploy (Vercel)

- Build automático em `main`.
- Preview deploys em PRs.
- Variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_*`, etc.) configuradas no painel.

### 4.4 Banco de Dados

- Script de migração para aplicar `docs/buscar_por_email.sql` automaticamente.
- Backup automatizado do Supabase (plano apropriado).

---

## 5. Testes E2E – Observações

- Alguns testes falham em **WebKit** (Safari) por timing/flakiness.
- Testes que dependem de **Supabase** exigem `.env.test` ou `.env.local` com credenciais válidas.
- Em CI, garantir que o servidor esteja rodando antes dos testes ou usar `webServer` do Playwright.

---

## 6. Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento em http://localhost:3005 |
| `npm run build` | Build de produção |
| `npm run lint` | Verificar ESLint |
| `npm run lint:fix` | Corrigir automaticamente o que for possível |
| `npm run test:e2e` | Rodar testes E2E |
| `npm run test:e2e:ui` | UI do Playwright |
| `npm run test:e2e:install` | Instalar browsers do Playwright |
