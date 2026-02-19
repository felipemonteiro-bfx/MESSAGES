# iOS – Configuração de Notificações Nativas (APNs)

## Visão geral

O app usa **@capacitor/push-notifications** para notificações nativas no iOS. O token é salvo via `/api/push/subscribe-native` e enviado via APNs pelo backend.

---

## 1. Tabela no Supabase

A tabela `push_tokens` já está em `docs/setup_avatars_push_tokens.sql`. Execute o script completo no SQL Editor do Supabase.

---

## 2. Configuração no Apple Developer

1. Acesse [Apple Developer Portal](https://developer.apple.com/account/)
2. **Identifiers** → App IDs → selecione/crie o App ID (`com.noticias24h.app`) com **Push Notifications** habilitada
3. **Keys** → crie uma **APNs Auth Key** (.p8)
   - Anote: **Key ID**
   - Baixe o arquivo `.p8` (só pode baixar uma vez)
4. Anote o **Team ID** (Membership)
5. No Xcode: **Signing & Capabilities** → adicione **Push Notifications**

---

## 3. Variáveis de ambiente na Vercel

Em **Vercel → Settings → Environment Variables**, adicione:

| Variável        | Valor                                      | Obrigatório |
|-----------------|--------------------------------------------|-------------|
| `APNS_KEY_P8`   | Conteúdo do arquivo .p8 (todo o texto)     | Sim         |
| `APNS_KEY_ID`   | Key ID (ex: ABC123XYZ)                     | Sim         |
| `APNS_TEAM_ID`  | Team ID (ex: 9ABCDE1234)                   | Sim         |
| `APNS_BUNDLE_ID`| Bundle ID (ex: com.noticias24h.app)        | Sim         |
| `APNS_PRODUCTION` | `true` para produção, `false` para sandbox | Não (usa NODE_ENV) |

### Como obter o valor de `APNS_KEY_P8`

O arquivo `.p8` tem este formato:

```
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
...
-----END PRIVATE KEY-----
```

Copie **todo** o conteúdo (incluindo as linhas BEGIN e END) e cole no valor da variável `APNS_KEY_P8`. Em variáveis de ambiente, pode ser necessário substituir quebras de linha por `\n` ou usar o formato multiline da Vercel.

---

## 4. Fluxo do envio

1. O app iOS registra-se no APNs e obtém um **device token**
2. O token é enviado para `/api/push/subscribe-native` e salvo em `push_tokens`
3. Quando uma mensagem é enviada, `/api/push/send` busca os tokens iOS do destinatário
4. O backend usa a lib `apn` para enviar a notificação ao APNs
5. A Apple entrega a notificação ao dispositivo (sempre disfarçada como notícia)

---

## 5. Build iOS

```bash
npx cap sync
npx cap open ios
```

No Xcode: selecione simulador ou dispositivo, Run (▶️).

O app carrega de `https://notices24h.vercel.app` (configurado em `capacitor.config.ts`).

---

## 6. Testar

1. Instale o app no dispositivo físico (push não funciona no simulador)
2. Faça login e ative notificações no portal de notícias
3. De outro dispositivo/navegador, envie uma mensagem
4. A notificação deve aparecer disfarçada como manchete de notícia
