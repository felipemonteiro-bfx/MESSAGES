# 🔐 Sistema de Mensagens Stealth - Documentação Completa

## 📋 Visão Geral

Sistema de mensagens completamente disfarçado como um aplicativo de notícias em tempo real. O sistema permite comunicação secreta através de uma interface que parece ser apenas um agregador de notícias.

## 🎯 Funcionalidades Principais

### 1. **Interface Pública: Notícias em Tempo Real**
- Busca notícias reais do Brasil e do mundo
- Atualização automática a cada 5 minutos
- Categorias: Top Stories, Brasil, Mundo, Tecnologia, Esportes, Saúde, Economia, Entretenimento
- Design limpo e profissional que parece um app de notícias real

### 2. **Acesso Secreto às Mensagens**
- **Botão "Fale Conosco"**: Clique para abrir o PIN
- **Duplo clique na data/hora**: Alternativa para abrir o PIN
- PIN de 4 dígitos configurável
- Após inserir o PIN correto, o sistema de mensagens aparece

### 3. **Sistema de Mensagens Stealth**
- Chat em tempo real usando Supabase Realtime
- Interface escura e discreta
- Envio de texto, imagens, vídeos e áudio
- Notificações disfarçadas como notícias

### 4. **Auto-Logout Inteligente**
- Volta automaticamente para o modo notícias quando:
  - Usuário sai da página (visibility change)
  - Página perde foco por mais de 30 segundos
  - Navegador é fechado
- Garante que mensagens nunca fiquem expostas

### 5. **Notificações Disfarçadas**
- Quando recebe mensagem, aparece como notificação de notícia
- Título da notificação parece ser uma manchete real
- Clique na notificação abre o PIN para acessar mensagens

### 6. **Upload de Mídia**
- **Fotos**: Upload e visualização de imagens
- **Vídeos**: Upload e reprodução de vídeos
- **Áudio**: Gravação de áudio ou upload de arquivos de áudio
- Todos os arquivos são armazenados no Supabase Storage

## 🚀 Como Usar

### Configuração Inicial

1. **Configurar API de Notícias (Opcional)**
   ```env
   NEXT_PUBLIC_NEWS_API_KEY=sua_chave_api_aqui
   ```
   - Se não configurar, o sistema usa notícias mock
   - Para obter chave gratuita: https://newsapi.org/

2. **Configurar PIN**
   - Na primeira vez que acessar, será solicitado configurar um PIN de 4 dígitos
   - O PIN é armazenado localmente (localStorage)

3. **Configurar Storage no Supabase**
   - Criar bucket `chat-media` no Supabase Storage
   - Configurar políticas de acesso conforme necessário

### Acessar Mensagens

1. **Método 1: Botão "Fale Conosco"**
   - Na tela de notícias, clique no botão azul "Fale Conosco"
   - Digite seu PIN de 4 dígitos
   - Sistema de mensagens será desbloqueado

2. **Método 2: Duplo Clique na Data**
   - Clique duas vezes rapidamente na data/hora no cabeçalho
   - Digite seu PIN
   - Acesso às mensagens

### Enviar Mensagens

1. Selecione uma conversa da lista
2. Digite sua mensagem ou use o botão de anexo (📎)
3. Para enviar mídia:
   - Clique no botão de anexo
   - Escolha: Foto, Vídeo ou Áudio
   - Para áudio: clique para gravar ou selecione arquivo
4. Envie pressionando Enter ou clicando no botão de enviar

### Voltar para Modo Notícias

- Clique no botão discreto no canto inferior direito (ícone de notícia)
- Ou simplesmente saia da página (auto-lock)

## 📱 Otimização Mobile

### Safari iPhone
- ✅ Interface totalmente responsiva
- ✅ Touch-friendly (botões grandes)
- ✅ Suporte a gravação de áudio nativa
- ✅ Upload de fotos/vídeos da galeria
- ✅ Notificações funcionam mesmo em background

### Recursos Mobile Especiais
- Menu de mídia otimizado para touch
- Gravação de áudio com feedback visual
- Preview de imagens antes de enviar
- Scroll suave e performático

## 🔒 Segurança

### Proteções Implementadas

1. **Auto-Lock**
   - Bloqueia automaticamente quando sai da página
   - Protege contra visualização acidental

2. **PIN Local**
   - PIN armazenado apenas localmente
   - Não enviado para servidor

3. **RLS (Row Level Security)**
   - Todas as mensagens protegidas por RLS do Supabase
   - Usuários só veem suas próprias mensagens

4. **Validação de Entrada**
   - Todas as mensagens são validadas e sanitizadas
   - Prevenção contra XSS e injeção

5. **Rate Limiting**
   - Limite de 30 mensagens por minuto
   - Prevenção contra spam

## 🛠️ Estrutura Técnica

### Componentes Principais

1. **StealthNews.tsx**
   - Componente de notícias que busca dados reais
   - Integração com NewsAPI ou fallback mock
   - Botões secretos para acesso

2. **StealthMessagingProvider.tsx**
   - Gerencia estado stealth/normal
   - Auto-lock quando necessário
   - Notificações disfarçadas

3. **ChatLayout.tsx** (Modificado)
   - Suporte completo para mídia
   - Gravação de áudio
   - Upload de arquivos

### APIs Utilizadas

- **NewsAPI**: Para notícias reais (opcional)
- **Supabase Realtime**: Para mensagens em tempo real
- **Supabase Storage**: Para mídia (fotos, vídeos, áudio)
- **MediaRecorder API**: Para gravação de áudio

## 📊 Banco de Dados

### Tabelas Utilizadas

- `profiles`: Perfis de usuários
- `chats`: Conversas
- `chat_participants`: Participantes das conversas
- `messages`: Mensagens (com campos `media_url` e `media_type`)

### Storage

- Bucket: `chat-media`
- Estrutura: `chat-media/{chat_id}/{user_id}/{timestamp}.{ext}`

## 🎨 Personalização

### Alterar Tema
- Modificar cores em `ChatLayout.tsx`
- Tema escuro padrão para discreção

### Alterar Textos
- Todos os textos podem ser modificados nos componentes
- Tradução completa para português

### Configurar Notificações
- Modificar `handleMessageNotification` em `StealthMessagingProvider.tsx`
- Personalizar formato das notificações disfarçadas

## 🐛 Solução de Problemas

### Notícias não carregam
- Verifique se `NEXT_PUBLIC_NEWS_API_KEY` está configurada
- Sistema usa fallback automático se API falhar

### PIN não funciona
- Limpe localStorage e configure novamente
- Verifique se PIN tem exatamente 4 dígitos

### Mídia não envia
- Verifique se bucket `chat-media` existe no Supabase
- Verifique políticas de acesso do Storage
- Verifique tamanho do arquivo (limite recomendado: 10MB)

### Auto-lock muito agressivo
- Ajuste timeout em `StealthMessagingProvider.tsx` (linha ~50)
- Padrão: 30 segundos sem foco

### Notificações não aparecem
- Verifique permissões do navegador
- No mobile, pode precisar de permissão explícita

## 🚀 Próximas Melhorias

- [ ] Suporte para grupos de chat
- [ ] Mensagens autodestrutivas
- [ ] Criptografia end-to-end
- [ ] Modo offline
- [ ] Sincronização entre dispositivos
- [ ] Temas personalizáveis
- [ ] Busca dentro das mensagens

## 📝 Notas Importantes

1. **Privacidade**: Este sistema é para uso pessoal. Use com responsabilidade.

2. **Performance**: Notícias são atualizadas a cada 5 minutos para economizar API calls.

3. **Storage**: Configure limites de tamanho no Supabase para evitar custos.

4. **Mobile**: Testado no Safari iOS. Pode precisar ajustes para outros navegadores.

---

**Desenvolvido com ❤️ usando Next.js, React, Supabase e TypeScript**
