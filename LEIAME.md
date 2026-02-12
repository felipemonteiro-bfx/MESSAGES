# 🛡️ WarrantyBfx - Rastreador de Garantias SaaS

Um aplicativo leve e moderno para você nunca mais perder o prazo de uma garantia. Perfeito para usar no celular e desktop.

## 🚀 Como começar

### 1. Configuração do Supabase
1. Crie um projeto no [Supabase](https://supabase.com).
2. Vá em **SQL Editor** e cole o script SQL que forneci na conversa.
3. Vá em **Storage**, crie um bucket chamado `invoices` e deixe-o como **público**.

### 2. Configuração do Projeto
No arquivo `.env.local`, substitua `SUA_ANON_KEY_AQUI` pela chave que está em **Project Settings > API** no seu painel do Supabase.

### 3. Rodar o App
Abra o terminal na pasta do projeto e digite:
```bash
yarn dev
```
O app estará disponível em `http://localhost:3001`.

## 📱 Destaques Mobile
- **Interface Touch-friendly:** Botões e campos largos para facilitar o uso no celular.
- **Upload Direto:** No celular, ao clicar em "Upload", você pode tirar uma foto da nota fiscal na hora.
- **Alertas Visuais:** Cores indicam o status (Verde = Ok, Amarelo = Vencendo, Vermelho = Expirado).

## 🛠️ Tecnologias
- Next.js 14 (App Router)
- Supabase (Auth, Database, Storage)
- Tailwind CSS (Estilização ultra leve)
- Lucide React (Ícones)
