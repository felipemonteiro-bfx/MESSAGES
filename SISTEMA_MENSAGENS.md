# 💬 Sistema de Mensagens - Guia Completo

## 📋 Visão Geral

O sistema de mensagens permite que os usuários se comuniquem em tempo real através de chats privados. O sistema está totalmente integrado ao projeto e utiliza Supabase para armazenamento e sincronização em tempo real.

## 🚀 Como Usar

### 1. Acessar o Sistema de Mensagens

- **Desktop**: Clique em "Mensagens" na barra de navegação superior
- **Mobile**: Toque no ícone de mensagens na barra inferior de navegação
- **URL Direta**: `/messages`

### 2. Adicionar um Novo Contato

1. Clique no botão **"+"** (ícone de adicionar usuário) no canto superior direito da lista de conversas
2. Digite o **nickname** do usuário que deseja adicionar
3. Clique em **"Adicionar"**
4. Um novo chat será criado automaticamente

**Requisitos do Nickname:**
- Deve ter entre 3 e 20 caracteres
- Pode conter apenas letras minúsculas, números e underscore (_)
- Exemplo válido: `joao_silva`, `user123`, `maria`

### 3. Enviar Mensagens

1. Selecione uma conversa da lista à esquerda
2. Digite sua mensagem no campo de texto na parte inferior
3. Pressione **Enter** ou clique no botão de enviar
4. Suas mensagens aparecerão à direita (azul), mensagens recebidas à esquerda (cinza)

**Dicas:**
- Pressione **Shift + Enter** para quebrar linha
- Mensagens são limitadas a 5000 caracteres
- Há um limite de 30 mensagens por minuto

### 4. Buscar Conversas

- Use o campo de busca no topo da lista de conversas
- A busca filtra por nome do contato ou conteúdo da última mensagem

## 🎨 Interface

### Layout Desktop
- **Lado Esquerdo**: Lista de conversas com última mensagem e hora
- **Lado Direito**: Área de chat com mensagens e campo de entrada

### Layout Mobile
- **Tela Cheia**: Lista de conversas ou área de chat
- **Navegação**: Use a seta para voltar à lista de conversas

## 🔧 Funcionalidades Técnicas

### Recursos Implementados

✅ **Chat em Tempo Real**
- Mensagens aparecem instantaneamente usando Supabase Realtime
- Sincronização automática entre dispositivos

✅ **Validação e Segurança**
- Validação de mensagens (tamanho, conteúdo)
- Sanitização de entrada para prevenir XSS
- Rate limiting (30 mensagens/minuto)

✅ **Interface Responsiva**
- Design adaptado para mobile e desktop
- Animações suaves com Framer Motion
- Tema escuro otimizado

✅ **Busca de Conversas**
- Busca em tempo real
- Filtra por nome ou última mensagem

✅ **Estados de Loading**
- Indicadores visuais durante carregamento
- Feedback ao enviar mensagens

## 📊 Estrutura do Banco de Dados

O sistema utiliza as seguintes tabelas do Supabase:

### `profiles`
- Armazena informações do usuário (nickname, avatar)
- Criada automaticamente no primeiro login

### `chats`
- Armazena informações das conversas
- Tipos: `private` (chat individual) ou `group` (grupo)

### `chat_participants`
- Relaciona usuários com chats
- Cada chat privado tem 2 participantes

### `messages`
- Armazena todas as mensagens
- Campos: conteúdo, remetente, chat, data/hora

## 🛠️ Configuração

### Pré-requisitos

1. **Banco de Dados**: Execute o script SQL em `docs/messaging_schema.sql` no Supabase
2. **Realtime**: Ative o Realtime nas tabelas `messages` e `chats` no Supabase
3. **RLS (Row Level Security)**: As políticas já estão configuradas no schema

### Variáveis de Ambiente

O sistema utiliza as mesmas variáveis do projeto principal:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📝 Como Criar um Perfil

Antes de usar o sistema de mensagens, você precisa ter um perfil criado:

1. Faça login no sistema
2. Vá para `/profile`
3. Configure seu **nickname** (obrigatório para mensagens)
4. Opcionalmente, adicione um avatar

**Importante**: O nickname deve ser único e seguir as regras de validação.

## 🐛 Solução de Problemas

### "Usuário não encontrado"
- Verifique se o nickname está correto
- Certifique-se de que o usuário já criou um perfil

### Mensagens não aparecem em tempo real
- Verifique se o Realtime está ativado no Supabase
- Verifique sua conexão com a internet

### "Limite de mensagens excedido"
- Aguarde alguns segundos antes de tentar novamente
- O limite é de 30 mensagens por minuto

### Chat não aparece na lista
- Recarregue a página
- Verifique se você é participante do chat

## 🔐 Segurança

- **Autenticação**: Apenas usuários logados podem usar o sistema
- **RLS**: Cada usuário só vê seus próprios chats e mensagens
- **Validação**: Todas as mensagens são validadas e sanitizadas
- **Rate Limiting**: Proteção contra spam e abuso

## 📱 Compatibilidade

- ✅ Chrome/Edge (últimas versões)
- ✅ Firefox (últimas versões)
- ✅ Safari (últimas versões)
- ✅ Mobile (iOS Safari, Chrome Mobile)

## 🎯 Próximas Melhorias (Futuras)

- [ ] Envio de imagens e arquivos
- [ ] Mensagens de voz
- [ ] Grupos de chat
- [ ] Status de leitura (✓✓)
- [ ] Mensagens apagadas
- [ ] Notificações push
- [ ] Busca dentro das mensagens

## 📞 Suporte

Se encontrar problemas ou tiver dúvidas:
1. Verifique este guia
2. Consulte os logs do console do navegador (F12)
3. Verifique a documentação do Supabase

---

**Desenvolvido com ❤️ usando Next.js, React, Supabase e TypeScript**
