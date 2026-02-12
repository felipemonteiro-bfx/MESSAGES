# ⚡ Quick Start - Warranty Tracker

Guia rápido para começar a usar o projeto.

## 🚀 Início Rápido (5 minutos)

### 1. Instalar Dependências

```bash
yarn install
```

### 2. Configurar Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env.local

# Editar .env.local com suas chaves
# (Abra no editor e preencha as variáveis)
```

### 3. Rodar Projeto

```bash
yarn dev
```

Acesse: http://localhost:3001

## 🧪 Testar

```bash
# Verificar se tudo está OK
yarn type-check    # Verificar TypeScript
yarn lint          # Verificar código
yarn test          # Rodar testes
yarn build         # Build de produção
```

## 📦 Scripts Disponíveis

```bash
yarn dev              # Desenvolvimento (porta 3001)
yarn build            # Build de produção
yarn start            # Servidor de produção
yarn lint             # Verificar lint
yarn lint:fix         # Corrigir lint automaticamente
yarn type-check       # Verificar tipos TypeScript
yarn test             # Rodar testes Playwright
yarn test:ui          # Testes com interface gráfica
yarn format           # Formatar código com Prettier
```

## 🔧 Configuração Mínima

Para começar a testar, você precisa de:

1. **Supabase** (gratuito)
   - Criar projeto em https://supabase.com
   - Copiar URL e anon key para `.env.local`

2. **Stripe** (modo teste)
   - Criar conta em https://stripe.com
   - Usar chaves de teste (começam com `sk_test_` e `pk_test_`)

3. **Gemini AI** (opcional)
   - Criar API key em https://makersuite.google.com/app/apikey

## 📝 Estrutura do Projeto

```
warranty-tracker/
├── src/
│   ├── app/              # Rotas Next.js
│   ├── components/       # Componentes React
│   ├── lib/              # Utilitários e helpers
│   └── types/            # Tipos TypeScript
├── .github/              # CI/CD e templates
├── scripts/              # Scripts auxiliares
└── tests/                # Testes Playwright
```

## 🐛 Problemas?

1. **Erro de variáveis de ambiente**
   - Verifique se `.env.local` existe
   - Confirme que todas as variáveis obrigatórias estão preenchidas

2. **Erro de build**
   - Execute `yarn install` novamente
   - Verifique versão do Node.js (20.x)

3. **Erro de TypeScript**
   - Execute `yarn type-check` para ver erros detalhados
   - Verifique se todos os tipos estão corretos

## 📚 Próximos Passos

- 📖 Leia [README.md](README.md) para documentação completa
- 🤝 Veja [CONTRIBUTING.md](CONTRIBUTING.md) para contribuir
- 🚀 Veja [SETUP_GITHUB.md](SETUP_GITHUB.md) para configurar GitHub
- 📝 Veja [PRIMEIRO_COMMIT.md](PRIMEIRO_COMMIT.md) para primeiro commit

## 🎯 Funcionalidades Principais

- ✅ Autenticação (Supabase)
- ✅ Sistema de mensagens em tempo real
- ✅ Pagamentos (Stripe)
- ✅ Rate limiting
- ✅ Logging seguro
- ✅ Validação de entrada
- ✅ Error boundaries
- ✅ Sistema de PIN seguro

---

**Pronto para começar!** 🚀
