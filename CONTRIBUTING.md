# Guia de Contribuição

Obrigado por considerar contribuir com o Warranty Tracker! 🎉

## Como Contribuir

### 1. Fork e Clone

```bash
# Fork o repositório no GitHub
# Depois clone seu fork
git clone https://github.com/seu-usuario/warranty-tracker.git
cd warranty-tracker
```

### 2. Instalar Dependências

```bash
yarn install
```

### 3. Configurar Ambiente

```bash
# Copie o arquivo de exemplo
cp .env.example .env.local

# Configure as variáveis de ambiente necessárias
```

### 4. Criar uma Branch

```bash
git checkout -b feature/nome-da-sua-feature
# ou
git checkout -b fix/nome-do-bug
```

### 5. Fazer Mudanças

- Siga os padrões de código do projeto
- Adicione testes quando apropriado
- Atualize documentação se necessário
- Mantenha commits pequenos e descritivos

### 6. Testar

```bash
# Verificar tipos
yarn type-check

# Verificar lint
yarn lint

# Rodar testes
yarn test

# Build
yarn build
```

### 7. Commit

Use mensagens de commit descritivas:

```bash
git commit -m "feat: adiciona sistema de rate limiting"
git commit -m "fix: corrige validação de PIN"
git commit -m "docs: atualiza README"
```

**Convenção de Commits:**
- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Mudanças na documentação
- `style:` Formatação, ponto e vírgula, etc
- `refactor:` Refatoração de código
- `test:` Adição ou correção de testes
- `chore:` Mudanças em build, dependências, etc

### 8. Push e Pull Request

```bash
git push origin feature/nome-da-sua-feature
```

Depois, abra um Pull Request no GitHub.

## Padrões de Código

### TypeScript

- Use TypeScript strict mode
- Evite `any` - use tipos apropriados
- Adicione tipos para funções e componentes

### Estilo

- Use Prettier para formatação
- Siga as regras do ESLint
- Use nomes descritivos para variáveis e funções

### Estrutura

- Componentes em `src/components/`
- Utilitários em `src/lib/`
- Tipos em `src/types/`
- Rotas de API em `src/app/api/`

## Testes

- Adicione testes para novas funcionalidades
- Mantenha cobertura de testes alta
- Use Playwright para testes E2E

## Perguntas?

Sinta-se à vontade para abrir uma issue para discutir mudanças maiores antes de começar a trabalhar nelas.

Obrigado por contribuir! 🚀
