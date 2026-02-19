# Alertas de Notícias — Troubleshooting

## O que são os "alertas de notícias"?

- **No celular (push):** Você recebe uma notificação **quando alguém te envia uma mensagem**. A notificação aparece como manchete de notícia (ex.: "Economia brasileira apresenta novos indicadores • G1") para manter o disfarce.
- **No site (toast):** A cada ~45 segundos, enquanto a página está aberta, aparece um alerta "última hora" no navegador. Isso **não** é enviado para o celular.

Ou seja: **não há envio de manchetes reais de notícias para o celular**. Os push são apenas para mensagens recebidas.

---

## Checklist: por que não recebo push no celular?

### 1. Chaves VAPID configuradas?
- Em **Vercel** (ou onde hospedar): Settings → Environment Variables
- Adicione: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`
- Gerar: `node scripts/generate-vapid.js`

### 2. Botão "Receber alertas" clicado?
- Você precisa clicar em **"Receber alertas de notícias"** no site e aceitar a permissão de notificações.
- O site precisa estar em **HTTPS** (obrigatório para push).

### 3. iOS (Safari / PWA)
- Web Push no Safari só funciona a partir do **iOS 16.4+**
- O usuário precisa **adicionar o site à tela inicial** (PWA) e abrir por esse ícone.
- Para app nativo (Capacitor): configurar **APNs** (Apple Push) — veja `docs/IOS_PUSH_SETUP.md`

### 4. Android
- Chrome/Edge em Android: Web Push deve funcionar se o site estiver em HTTPS e as permissões forem concedidas.
- App nativo: use **FCM** (Firebase Cloud Messaging).

### 5. Tabela e política no Supabase
- Tabela `push_subscriptions` deve existir (ou `push_tokens` para app nativo).
- Execute as migrações em `docs/setup_avatars_push_tokens.sql` e `docs/push_subscriptions.sql` se aplicável.

### 6. Teste rápido
- Peça para **outra pessoa** enviar uma mensagem para você.
- As notificações push são disparadas **apenas quando você recebe mensagem**, não por manchetes do feed de notícias.

---

## Resumo

| Esperado | Realidade |
|----------|-----------|
| Receber manchetes de notícias no celular | ❌ Não implementado. Push é só para mensagens. |
| Receber notificação quando alguém manda mensagem | ✅ Sim, se VAPID/APNs estiverem configurados e você tiver ativado os alertas. |
