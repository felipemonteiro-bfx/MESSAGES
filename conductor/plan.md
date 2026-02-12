# Plano de Desenvolvimento: Warranty Tracker SaaS

## 1. Visão Geral do Produto
Aplicativo Web SaaS para gerenciamento de garantias de produtos, focado em simplicidade e design moderno.

## 2. Stack Tecnológico
- **Frontend:** Next.js 14 (App Router)
- **Estilização:** Tailwind CSS (com componentes modernos, ex: Shadcn/UI se aprovado)
- **Backend/Database:** Supabase (Auth, PostgreSQL, Storage)
- **Linguagem:** TypeScript

## 3. Funcionalidades Detalhadas

### Autenticação (Supabase Auth)
- [ ] Sign Up (Email/Senha ou Magic Link)
- [ ] Login
- [ ] Logout
- [ ] Proteção de rotas (Middleware)

### Gerenciamento de Produtos
- [ ] **Adicionar Produto:**
  - Nome, Categoria, Data de Compra, Meses de Garantia.
  - Upload de Foto da Nota Fiscal (Supabase Storage).
- [ ] **Cálculo Automático:**
  - Data de Expiração = Data Compra + Meses Garantia.
  - Dias Restantes = Data Expiração - Hoje.
- [ ] **Dashboard/Listagem:**
  - Visualização em Cards ou Tabela.
  - Indicadores visuais de status (ex: "Vencendo em breve").
- [ ] **Exclusão:** Remover produto e imagem associada.

### Interface (UI/UX)
- [ ] Design Minimalista e Limpo.
- [ ] Responsivo (Mobile First).
- [ ] Feedback visual (loading states, toasts de sucesso/erro).

## 4. Estrutura de Dados (Sugestão Inicial)

**Tabela: `products`**
- `id` (uuid, pk)
- `user_id` (uuid, fk -> auth.users)
- `name` (text)
- `category` (text)
- `purchase_date` (date)
- `warranty_months` (int)
- `expiration_date` (date, calculado ou armazenado)
- `invoice_url` (text)
- `created_at` (timestamp)

## 5. Próximos Passos (Plano de Execução)
1.  **Setup Inicial:** Criar projeto Next.js com Tailwind e TypeScript.
2.  **Configuração Supabase:** Configurar cliente e variáveis de ambiente.
3.  **Autenticação:** Implementar páginas de login/registro.
4.  **Database:** Criar tabelas e políticas de segurança (RLS).
5.  **Core Features:** Implementar CRUD de produtos e Upload.
6.  **Polimento UI:** Melhorar design e responsividade.
