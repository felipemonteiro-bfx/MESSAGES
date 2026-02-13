# Migração de APIs para Mobile

## ⚠️ Importante: APIs Server-Side

Quando o Next.js é buildado com `output: 'export'` (modo estático para Capacitor), **rotas de API server-side não funcionam** (`/api/*`).

### Rotas afetadas:
- `/api/push/send` - Envio de push notifications
- `/api/push/subscribe` - Registro de push subscriptions
- `/api/auth/callback` - Callback OAuth (pode funcionar via redirect)

---

## 🔧 Soluções

### Opção 1: Edge Functions do Supabase (Recomendado)

Mover a lógica de push para **Supabase Edge Functions**:

1. **Criar Edge Function:**
   ```bash
   supabase functions new send-push
   ```

2. **Mover lógica de `/api/push/send` para Edge Function**
   - Usar `supabase.functions.invoke('send-push')` no cliente
   - Edge Function tem acesso a `VAPID_PRIVATE_KEY`

3. **Vantagens:**
   - Funciona em web e mobile
   - Escalável
   - Não requer servidor próprio

### Opção 2: Usar Push Notifications Nativas do Capacitor

Para mobile, usar **@capacitor/push-notifications** em vez de Web Push:

```typescript
import { PushNotifications } from '@capacitor/push-notifications';

// Registrar para push nativo
await PushNotifications.register();

// Escutar notificações
PushNotifications.addListener('pushNotificationReceived', (notification) => {
  // Notificação recebida
});
```

**Vantagens:**
- Funciona nativamente no mobile
- Melhor performance
- Suporte completo a ações e badges

### Opção 3: Servidor Separado (Backend)

Manter APIs em servidor separado (ex.: Vercel Serverless Functions) e chamar via HTTPS:

```typescript
// No app mobile
const response = await fetch('https://seu-app.vercel.app/api/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ recipientId, content }),
});
```

---

## 📝 Implementação Recomendada

### Para Mobile (Capacitor):

1. **Usar Push Notifications nativas** (`@capacitor/push-notifications`)
2. **Mover lógica de envio para Edge Function do Supabase**
3. **Manter Web Push apenas para versão web**

### Estrutura sugerida:

```
src/
  lib/
    push/
      web-push.ts      # Web Push (versão web)
      native-push.ts   # Push nativo (mobile via Capacitor)
      index.ts         # Detecta plataforma e usa apropriado
```

---

## 🔄 Migração Passo a Passo

### 1. Instalar plugin nativo

```bash
npm install @capacitor/push-notifications
npx cap sync
```

### 2. Criar wrapper de push

Criar `src/lib/push/index.ts` que detecta plataforma:

```typescript
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export async function registerPush() {
  if (Capacitor.isNativePlatform()) {
    // Mobile: usar push nativo
    await PushNotifications.register();
  } else {
    // Web: usar Web Push existente
    // ... código atual
  }
}
```

### 3. Mover `/api/push/send` para Supabase Edge Function

- Criar função `send-push` no Supabase
- Chamar via `supabase.functions.invoke()` no cliente

---

## ✅ Status Atual

- ✅ **Web Push** funcionando (versão web)
- ⚠️ **APIs server-side** não funcionam em export estático
- 📱 **Preparado para Capacitor** (estrutura pronta)
- 🔄 **Migração necessária** para push nativo no mobile

---

## 📚 Referências

- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Next.js Static Export](https://nextjs.org/docs/app/api-reference/next-config-js/output)
