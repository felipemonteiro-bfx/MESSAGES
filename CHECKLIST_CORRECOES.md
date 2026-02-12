# ✅ Checklist de Correções - Warranty Tracker

## 🔴 CRÍTICO - Corrigir Imediatamente

### Segurança
- [ ] **SEC-001:** Remover PIN hardcoded (`src/components/shared/PinPad.tsx:15`)
  - [ ] Criar sistema de PIN configurável pelo usuário
  - [ ] Armazenar hash do PIN (não texto plano)
  - [ ] Permitir configuração na primeira vez
  - [ ] Adicionar opção de recuperação/reset

- [ ] **SEC-002:** Implementar rotas de API faltantes
  - [ ] `src/app/api/checkout/route.ts` - Integração completa Stripe
  - [ ] `src/app/api/billing-portal/route.ts` - Portal de billing
  - [ ] Adicionar validação de sessão do usuário
  - [ ] Implementar tratamento de erros adequado
  - [ ] Adicionar logs estruturados

- [ ] **SEC-003:** Validação de variáveis de ambiente
  - [ ] Criar `src/lib/env.ts` com validação
  - [ ] Fail fast se variáveis faltando
  - [ ] Documentar variáveis necessárias no README
  - [ ] Adicionar exemplo `.env.example`

### Funcionalidade
- [ ] **FUNC-001:** Sistema de mensagens
  - [ ] Adicionar validação de entrada (nickname, conteúdo)
  - [ ] Sanitizar inputs antes de salvar
  - [ ] Adicionar limite de caracteres
  - [ ] Implementar rate limiting por usuário

---

## 🟡 ALTO - Corrigir Este Mês

### Qualidade de Código
- [ ] **CODE-001:** Remover tipos `any`
  - [ ] Criar interface `User` apropriada
  - [ ] Criar tipos para `Chat`, `Message`, `ChatParticipant`
  - [ ] Tipar todos os componentes
  - [ ] Habilitar `noImplicitAny` no tsconfig (se não estiver)

- [ ] **CODE-002:** Melhorar tratamento de erros
  - [ ] Criar `src/lib/error-handler.ts`
  - [ ] Mensagens de erro mais específicas
  - [ ] Adicionar Error Boundaries (`src/components/ErrorBoundary.tsx`)
  - [ ] Implementar logging estruturado

- [ ] **CODE-003:** Validação de entrada
  - [ ] Instalar e configurar Zod
  - [ ] Criar schemas de validação
  - [ ] Validar dados do Supabase antes de usar
  - [ ] Adicionar sanitização de strings

### Segurança
- [ ] **SEC-004:** Rate Limiting
  - [ ] Instalar `@upstash/ratelimit` ou similar
  - [ ] Adicionar rate limiting no middleware
  - [ ] Limitar tentativas de login (5 por 15min)
  - [ ] Limitar envio de mensagens (30 por minuto)
  - [ ] Adicionar CAPTCHA após tentativas falhadas

- [ ] **SEC-005:** Logging seguro
  - [ ] Remover `console.error` com dados sensíveis
  - [ ] Implementar logger estruturado
  - [ ] Não logar detalhes de erros de auth em produção
  - [ ] Adicionar níveis de log (debug, info, warn, error)

---

## 🟢 MÉDIO - Melhorias Futuras

### Performance
- [ ] **PERF-001:** Otimizar queries Supabase
  - [ ] Usar joins ao invés de múltiplas queries
  - [ ] Adicionar índices no banco de dados
  - [ ] Implementar paginação onde necessário
  - [ ] Cache de queries frequentes

- [ ] **PERF-002:** Otimizar re-renders
  - [ ] Adicionar `React.memo` onde apropriado
  - [ ] Revisar Context providers
  - [ ] Usar `useMemo` e `useCallback` adequadamente
  - [ ] Lazy load de componentes pesados

### Testes
- [ ] **TEST-001:** Aumentar cobertura
  - [ ] Adicionar testes unitários (Jest/Vitest)
  - [ ] Testes de integração para APIs
  - [ ] Mais testes E2E com Playwright
  - [ ] Meta: 70%+ de cobertura

- [ ] **TEST-002:** CI/CD
  - [ ] Rodar testes automaticamente
  - [ ] Verificações de segurança (npm audit)
  - [ ] Linting automático
  - [ ] Type checking

### Documentação
- [ ] **DOC-001:** Melhorar documentação
  - [ ] Adicionar comentários JSDoc em funções complexas
  - [ ] Documentar APIs no README
  - [ ] Criar guia de contribuição
  - [ ] Documentar arquitetura

### UX/UI
- [ ] **UX-001:** Estados de loading consistentes
  - [ ] Adicionar skeletons onde faltam
  - [ ] Loading states em todas as operações async
  - [ ] Feedback visual adequado

- [ ] **UX-002:** Tratamento de erros na UI
  - [ ] Mensagens de erro amigáveis
  - [ ] Opções de retry onde apropriado
  - [ ] Fallbacks para estados de erro

---

## 📋 Checklist de Verificação Pré-Deploy

Antes de fazer deploy em produção, verificar:

### Segurança
- [ ] Nenhum secret hardcoded no código
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Rate limiting implementado
- [ ] Validação de entrada em todos os endpoints
- [ ] HTTPS configurado
- [ ] CORS configurado corretamente
- [ ] Headers de segurança configurados (CSP, HSTS, etc.)

### Funcionalidade
- [ ] Todas as rotas de API implementadas
- [ ] Testes passando
- [ ] Sem erros de TypeScript
- [ ] Sem warnings do ESLint críticos
- [ ] Build de produção funcionando

### Performance
- [ ] Bundle size aceitável
- [ ] Imagens otimizadas
- [ ] Queries otimizadas
- [ ] Cache configurado

### Monitoramento
- [ ] Logging configurado
- [ ] Error tracking (Sentry, etc.)
- [ ] Analytics (opcional)
- [ ] Health checks

---

## 🛠️ Ferramentas Recomendadas

### Desenvolvimento
- [ ] Instalar Zod para validação
- [ ] Configurar Prettier (se não tiver)
- [ ] Configurar Husky para pre-commit hooks
- [ ] Adicionar commitlint

### Segurança
- [ ] Snyk ou Dependabot para dependências
- [ ] npm audit regularmente
- [ ] OWASP ZAP para testes de segurança

### Qualidade
- [ ] SonarQube ou CodeClimate
- [ ] TypeScript strict mode
- [ ] ESLint com regras mais rigorosas

---

## 📝 Notas

- Priorizar itens marcados como 🔴 CRÍTICO
- Revisar este checklist semanalmente
- Atualizar conforme problemas são resolvidos
- Criar issues no GitHub para cada item

**Última atualização:** 12/02/2026
