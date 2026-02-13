# 🤝 Guia de Contribuição - Stealth Messaging

Obrigado por considerar contribuir para o Stealth Messaging! Este documento fornece diretrizes para contribuir com o projeto.

---

## 📋 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Contribuir](#como-contribuir)
- [Setup do Ambiente](#setup-do-ambiente)
- [Padrões de Código](#padrões-de-código)
- [Processo de Pull Request](#processo-de-pull-request)
- [Estrutura do Projeto](#estrutura-do-projeto)

---

## 📜 Código de Conduta

Este projeto segue um código de conduta. Ao participar, você concorda em manter este código.

- Seja respeitoso e inclusivo
- Aceite críticas construtivas
- Foque no que é melhor para a comunidade
- Mostre empatia com outros membros

---

## 🚀 Como Contribuir

### Reportar Bugs

1. Verifique se o bug já não foi reportado nas [Issues](https://github.com/felipemonteiro-bfx/MESSAGES/issues)
2. Se não existir, crie uma nova issue com:
   - Título claro e descritivo
   - Passos para reproduzir
   - Comportamento esperado vs atual
   - Screenshots (se aplicável)
   - Ambiente (navegador, OS, versão)

### Sugerir Funcionalidades

1. Verifique se a funcionalidade já não foi sugerida
2. Crie uma issue com:
   - Descrição clara da funcionalidade
   - Casos de uso
   - Benefícios
   - Possíveis implementações

### Enviar Pull Requests

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 🛠️ Setup do Ambiente

### Pré-requisitos

- Node.js 18+ e npm/yarn
- Git
- Conta no Supabase (para desenvolvimento)

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/felipemonteiro-bfx/MESSAGES.git
cd MESSAGES
```

2. Instale dependências:
```bash
npm install
# ou
yarn install
```

3. Configure variáveis de ambiente:
```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais:
```
NEXT_PUBLIC_SUPABASE_URL=sua_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave
NEXT_PUBLIC_NEWS_API_KEY=sua_chave_newsapi
```

4. Execute o servidor de desenvolvimento:
```bash
npm run dev
# ou
yarn dev
```

5. Acesse `http://localhost:3005`

---

## 📐 Padrões de Código

### TypeScript

- Use TypeScript para todo código novo
- Evite `any` - use tipos específicos
- Documente funções complexas com JSDoc

### Estilo de Código

- Use ESLint (configurado no projeto)
- Formate com Prettier (se configurado)
- Siga convenções do Next.js

### Estrutura de Arquivos

```
src/
  ├── app/              # Rotas Next.js (App Router)
  ├── components/       # Componentes React
  │   ├── shared/      # Componentes compartilhados
  │   └── messaging/   # Componentes de mensagens
  ├── lib/             # Utilitários e helpers
  ├── hooks/           # Custom hooks
  ├── types/           # Definições TypeScript
  └── styles/          # Estilos globais
```

### Convenções de Nomenclatura

- Componentes: PascalCase (`ChatLayout.tsx`)
- Arquivos de utilitários: camelCase (`pin.ts`)
- Hooks: camelCase com prefixo `use` (`useAuth.ts`)
- Constantes: UPPER_SNAKE_CASE (`MAX_ATTEMPTS`)

---

## 🔄 Processo de Pull Request

### Antes de Enviar

1. ✅ Código compila sem erros (`npm run build`)
2. ✅ Testes passam (`npm run test` se houver)
3. ✅ ESLint passa (`npm run lint`)
4. ✅ TypeScript valida (`npm run type-check`)
5. ✅ Documentação atualizada (se necessário)

### Template de PR

```markdown
## Descrição
Breve descrição das mudanças

## Tipo de Mudança
- [ ] Bug fix
- [ ] Nova funcionalidade
- [ ] Breaking change
- [ ] Documentação

## Como Testar
Passos para testar as mudanças

## Checklist
- [ ] Código segue padrões do projeto
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
- [ ] Sem warnings do linter
```

---

## 🏗️ Estrutura do Projeto

### Componentes Principais

- `StealthMessagingProvider`: Gerenciamento de estado global e modo stealth
- `StealthNews`: Portal de notícias (disfarce)
- `ChatLayout`: Interface de mensagens
- `PinPad`: Autenticação por PIN
- `AuthForm`: Formulário de login/cadastro

### Bibliotecas Principais

- **Next.js 16**: Framework React
- **Supabase**: Backend (auth, database, storage)
- **Framer Motion**: Animações
- **Tailwind CSS**: Estilização
- **Zod**: Validação de schemas
- **Sonner**: Notificações toast

---

## 🧪 Testes

### Executar Testes E2E

```bash
# Instalar Playwright (primeira vez)
npx playwright install

# Executar testes
npx playwright test

# Interface gráfica
npx playwright test --ui
```

### Testes Manuais

Antes de fazer PR, teste manualmente:
- [ ] Cadastro de novo usuário
- [ ] Login e desbloqueio com PIN
- [ ] Envio de mensagens (texto, imagem, áudio)
- [ ] Recebimento de mensagens
- [ ] Modo incógnito
- [ ] Notificações push

---

## 📚 Recursos Adicionais

- [Documentação da API](./API.md)
- [Arquitetura do Projeto](./ARCHITECTURE.md) (se existir)
- [Guia de Deploy](./DEPLOY.md) (se existir)

---

## ❓ Dúvidas?

Se tiver dúvidas sobre como contribuir:
1. Verifique a documentação existente
2. Procure em issues anteriores
3. Abra uma nova issue com a tag `question`

---

**Obrigado por contribuir! 🎉**
