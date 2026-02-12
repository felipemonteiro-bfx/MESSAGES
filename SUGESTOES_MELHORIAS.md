# 💡 Sugestões de Melhorias – Stealth Messaging

Lista de **pelo menos 8** ideias para evoluir o projeto (segurança, stealth, UX, performance e recursos).

---

## 1. **PIN com biometria (Face ID / impressão digital)**

- **O quê:** Permitir desbloquear com Face ID ou impressão digital no mobile, além do PIN.
- **Por quê:** Mais rápido e discreto; menos digitação na tela.
- **Como:** Usar a Web Authentication API (`navigator.credentials`) ou um wrapper (ex.: `@simplewebauthn/browser`) para autenticação biométrica no navegador.

---

## 2. **Modo “tela quebrada” ou tela em branco ao minimizar**

- **O quê:** Ao sair do app (minimizar ou trocar de aba), mostrar uma tela que parece “tela quebrada”, tela preta ou última notícia congelada, em vez do chat.
- **Por quê:** Se alguém pegar o celular, não vê que é mensagens.
- **Como:** No `visibilitychange` ou `blur`, trocar o conteúdo renderizado por um componente fake (imagem de tela quebrada ou screenshot da última notícia).

---

## 3. **Notificações push disfarçadas**

- **O quê:** Push notifications que parecem notícias (“Nova manchete: …”) e, ao tocar, pedem PIN e abrem o chat.
- **Por quê:** Receber avisos de mensagem sem parecer app de mensagens.
- **Como:** Service Worker + Push API; título/body no estilo manchete; deep link que abre o app e depois o PinPad.

---

## 4. **Mensagens que “somem” (efêmeras)**

- **O quê:** Opção de enviar mensagem que some após X segundos ou após ser lida (estilo “visualização única”).
- **Por quê:** Mais privacidade e alinhado ao conceito stealth.
- **Como:** Campo `expires_at` ou `is_ephemeral` em `messages`; job ou trigger no Supabase para apagar após o tempo; na UI, marcar como “visualização única” e limpar após leitura/tempo.

---

## 5. **Ícone e nome do PWA como app de notícias**

- **O quê:** Ícone e nome do PWA 100% de notícias (ex.: “Notícias BR”, ícone de jornal).
- **Por quê:** Na gaveta de apps e na barra de tarefas não chama atenção como “mensagens”.
- **Como:** Ajustar `manifest.json` (nome, short_name, ícones) e favicon; usar ícone de notícias em vários tamanhos.

---

## 6. **Bloquear screenshot / gravação de tela no chat**

- **O quê:** Dificultar (ou avisar) quando o usuário tenta screenshot ou gravação de tela na área do chat.
- **Por quê:** Reduzir vazamento por captura de tela.
- **Como:** `navigator.mediaDevices.getDisplayMedia` não é bloqueável pelo site, mas dá para detectar foco em janela de captura e esconder conteúdo sensível ou mostrar overlay “Não permitido captura”. Em alguns ambientes (ex.: apps nativos) há APIs nativas para isso.

---

## 7. **Atalho de teclado para bloquear**

- **O quê:** Atalho (ex.: `Ctrl+Shift+L` ou `Escape` duas vezes) para travar e voltar ao modo notícias na hora.
- **Por quê:** Bloqueio rápido se alguém se aproximar.
- **Como:** `useEffect` com `keydown`; ao detectar o atalho, chamar `lockMessaging()` do contexto.

---

## 8. **Indicador “digitando…” e status online**

- **O quê:** Mostrar “fulano está digitando” e um indicador simples de online/offline.
- **Por quê:** Experiência mais próxima de um chat comum.
- **Como:** Canal Realtime (Supabase) ou tabela `presence`/`typing`; no front, escutar eventos e mostrar por alguns segundos “digitando…” e atualizar status.

---

## 9. **Busca dentro do chat**

- **O quê:** Buscar mensagens por texto dentro de uma conversa (e, se quiser, em todas).
- **Por quê:** Encontrar mensagens antigas sem rolar tudo.
- **Como:** Campo de busca que filtra `messages` por `content` (e opcionalmente por `chat_id`); no Supabase, `ilike` ou full‑text se precisar escalar.

---

## 10. **Temas (claro/escuro) e acessibilidade**

- **O quê:** Tema claro/escuro e contraste aumentado (modo “acessível”).
- **Por quê:** Conforto visual e inclusão.
- **Como:** CSS variables ou Tailwind dark mode; toggle no header das notícias ou nas configurações; persistir em `localStorage` e aplicar na raiz (`html`).

---

## Resumo rápido

| # | Sugestão                         | Dificuldade | Impacto |
|---|----------------------------------|------------|--------|
| 1 | PIN + biometria                  | Média      | Alto   |
| 2 | Tela fake ao minimizar           | Baixa      | Alto   |
| 3 | Notificações push disfarçadas    | Média      | Alto   |
| 4 | Mensagens efêmeras               | Média      | Médio  |
| 5 | PWA 100% notícias (ícone/nome)   | Baixa      | Alto   |
| 6 | Dificultar screenshot/gravação   | Média      | Médio  |
| 7 | Atalho para bloquear             | Baixa      | Alto   |
| 8 | “Digitando…” e online            | Média      | Médio  |
| 9 | Busca no chat                    | Baixa      | Médio  |
|10 | Temas e acessibilidade           | Baixa      | Médio  |

Se quiser, posso detalhar o passo a passo de implementação de uma ou mais dessas (por exemplo: 2, 5, 7 e 10 primeiro).
