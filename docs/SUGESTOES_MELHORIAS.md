# 15 Sugestões de Melhorias – Notícias 24h

Melhorias sugeridas para performance, usabilidade e funcionalidade.

---

## 1. Busca global de mensagens
- Campo de busca no chat para filtrar mensagens por texto.
- Índice full-text no Supabase para mensagens.
- UX: botão de busca no header do chat.

## 2. Reações rápidas (emoji)
- Permitir reagir a mensagens com emojis (👍, ❤️, 😂, etc.).
- Nova tabela `message_reactions` ou campo JSON em `messages`.
- Exibir reações abaixo da mensagem.

## 3. Mensagens de voz com playback inline
- Botão play/pause nas mensagens de áudio já enviadas.
- Barra de progresso e duração.
- Suporte a variação de velocidade (1x, 1.5x, 2x).

## 4. Modo escuro/claro automático
- Detectar `prefers-color-scheme` do sistema.
- Opção nas configurações: “Seguir sistema”, “Claro”, “Escuro”.

## 5. Chats favoritados/pinados
- Marcar chats como favoritos.
- Tabela `chat_favorites` ou campo em `profiles`.
- Chats favoritos fixos no topo da lista.

## 6. Enviar múltiplas fotos de uma vez
- Seleção de várias imagens na galeria.
- Envio em sequência com preview antes de confirmar.

## 7. Indicador de “digitando…”
- Canal Realtime para broadcast de status “digitando”.
- Exibir “Fulano está digitando…” no header do chat.

## 8. Histórico de mídia por chat
- Aba/aba lateral com fotos e vídeos do chat.
- Grid de thumbnails com lazy load.

## 9. Compartilhar localização (opcional)
- Botão para enviar localização atual (uma vez).
- Exibir mapa estático ou link do Maps.

## 10. Backup automático em nuvem
- Sincronizar mensagens com bucket Supabase (encriptado).
- Restaurar em novo dispositivo.

## 11. Filtro de notícias por favoritos
- Marcar categorias/fontes como favoritas.
- Ordem customizada das categorias nas notícias.

## 12. Respostas citadas (quote/reply)
- Botão “Responder” na mensagem.
- Exibir mensagem original destacada acima da resposta.

## 13. Ações rápidas em mensagens
- Long-press: copiar, responder, encaminhar, apagar.
- Menu contextual nativo no mobile.

## 14. Notificações por chat (mute/unmute)
- Silenciar chats específicos.
- Já existe mute; evoluir para granularidade (só notificação, som, etc.).

## 15. Temas visuais customizáveis
- Paletas de cores além de escuro/claro.
- Opções: Azul, Verde, Roxo, Alto contraste.

---

## Prioridade sugerida

| #   | Prioridade | Esforço |
|-----|------------|---------|
| 4   | Alta       | Baixo   |
| 12  | Alta       | Médio   |
| 13  | Alta       | Baixo   |
| 3   | Média      | Médio   |
| 7   | Média      | Médio   |
| 1   | Média      | Alto    |
| 2   | Média      | Médio   |
| 6   | Média      | Médio   |
| 8   | Baixa      | Médio   |
| 5   | Baixa      | Baixo   |
| 9   | Baixa      | Médio   |
| 10  | Baixa      | Alto    |
| 11  | Baixa      | Baixo   |
| 14  | Baixa      | Baixo   |
| 15  | Baixa      | Baixo   |
