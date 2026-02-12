# 🛡️ Guardião de Notas v15.0 Platinum 🚀✨💎

O **Guardião de Notas** é uma plataforma de elite para gestão de ativos imobilizados, proteção patrimonial e inteligência financeira. Transformamos simples notas fiscais em um dossiê digital auditado, garantindo seus direitos e valorizando seu patrimônio.

## 💎 Funcionalidades Platinum (Classe Mundial)

### 🏦 Inteligência Financeira & Gestão
- **Balanço Consolidado:** Monitoramento de patrimônio líquido em tempo real.
- **ROI de Upgrades:** Cálculo automático de valorização baseado em melhorias técnicas.
- **Monitor de Câmbio 2.0:** Impacto da flutuação do Dólar/Euro no custo de reposição dos seus bens.
- **Módulo Business (CNPJ):** Cálculo de depreciação contábil linear para ativos de escritório.
- **Subscription Guardian:** Gestão de assinaturas digitais vinculadas aos seus bens físicos.

### 🔐 Segurança & Blindagem
- **Panic Mode (Disfarce):** Camuflagem instantânea para um app fake de notas, protegido por senha individual.
- **Filtro de Privacidade:** Borramento (blur) dinâmico de valores monetários em ambientes públicos.
- **Selo de Integridade Digital:** Hash de autenticidade único para cada item auditado.
- **Sucessão Patrimonial (Death Switch):** Gatilho de inatividade para transmissão automática de bens para herdeiros.

### 🤖 Automação & IA (Gemini 1.5 Flash)
- **IA OCR Real:** Extração de chaves NF-e, bandeiras de cartão, valores e datas de notas reais.
- **Semantic IA Search:** Busca por linguagem natural (Ex: "O que comprei na Amazon ano passado?").
- **Price Watchdog:** Monitoramento de preços live para acionar seguro Proteção de Preço do cartão.
- **Consultor Advisor IA:** Assistente jurídico e técnico para vícios ocultos e reclamações CDC.

### 🤝 Ecossistema & Compliance
- **Marketplace Real:** Vitrine de bens seminovos com histórico auditado e selo de procedência.
- **Family Sharing 2.0:** Colaboração em tempo real e pastas compartilhadas para a família.
- **Modo Viagem Global:** Declaração de bens multilingue (Português, Inglês, Espanhol).
- **Scanner de Recalls:** Varredura global de segurança (ANVISA/SENACON).

## 🛠️ Stack Tecnológica

- **Frontend:** Next.js 15.1.6 (App Router), Tailwind CSS, Framer Motion.
- **Backend:** Supabase SSR (Auth, Database, Storage).
- **IA:** Google Gemini 1.5 Flash.
- **Pagamentos:** Stripe (Plans Pro & Family).
- **Qualidade:** Playwright (100% Master Audit Passed).

## 📋 Configuração de Elite

### Pré-requisitos

- Node.js 20.x ou superior
- Yarn 1.22 ou superior
- Conta no Supabase
- Conta no Stripe (para pagamentos)

### Instalação

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/felipemonteiro-bfx/MESSAGES.git
   cd MESSAGES
   ```

2. **Instale as dependências:**
   ```bash
   yarn install
   ```

3. **Configure o ambiente:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edite `.env.local` com suas chaves:
   
   **Variáveis obrigatórias:**
   - `NEXT_PUBLIC_SUPABASE_URL` - URL do seu projeto Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Chave anônima do Supabase
   - `STRIPE_SECRET_KEY` - Chave secreta do Stripe (sk_test_...)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Chave pública do Stripe (pk_test_...)
   
   **Variáveis opcionais:**
   - `NEXT_PUBLIC_GEMINI_API_KEY` - Chave da API do Google Gemini (para recursos de IA)
   - `STRIPE_WEBHOOK_SECRET` - Secret do webhook do Stripe (whsec_...)
   - `NODE_ENV` - Ambiente (development/production/test)

4. **Execute o projeto:**
   ```bash
   yarn dev
   ```
   
   O projeto estará disponível em `http://localhost:3001`

### Configuração do Stripe Webhook

Para processar eventos do Stripe (checkout, assinaturas, etc.):

1. No dashboard do Stripe, vá em **Developers > Webhooks**
2. Clique em **Add endpoint**
3. URL: `https://seu-dominio.com/api/webhook`
4. Eventos para escutar:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copie o **Signing secret** e adicione em `STRIPE_WEBHOOK_SECRET`

### Testes Locais com Stripe CLI

```bash
# Instalar Stripe CLI
# https://stripe.com/docs/stripe-cli

# Autenticar
stripe login

# Escutar webhooks localmente
stripe listen --forward-to localhost:3001/api/webhook
```

## 🧪 Testes

```bash
# Rodar todos os testes
yarn test

# Testes com UI
yarn test:ui

# Testes em modo debug
yarn test:debug

# Verificar tipos TypeScript
yarn type-check

# Verificar lint
yarn lint
```

## 🚀 Deploy

### Build de Produção

```bash
yarn build
yarn start
```

### Variáveis de Ambiente em Produção

Certifique-se de configurar todas as variáveis de ambiente no seu provedor de hospedagem (Vercel, Railway, etc.)

## 🤝 Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes sobre como contribuir com o projeto.

---
**Guardião de Notas: Protegendo o que é seu, hoje e sempre.** 🛡️💎🏆
