/**
 * Abstração de push: Web Push (navegador) ou Push nativo (Capacitor iOS/Android).
 * Detecta plataforma e usa a implementação correta.
 */

const getApiBase = () =>
  (typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_API_BASE || '')) || '';

export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const { Capacitor } = require('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function registerNativePush(): Promise<{ ok: boolean; token?: string; message: string }> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'denied') {
      return { ok: false, message: 'Notificações bloqueadas. Habilite nas Configurações.' };
    }
    if (perm.receive === 'prompt') {
      const req = await PushNotifications.requestPermissions();
      if (req.receive !== 'granted') {
        return { ok: false, message: 'Permissão de notificação negada.' };
      }
    }

    await PushNotifications.register();
    return { ok: true, token: undefined, message: 'Registrando...' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao registrar push nativo.';
    return { ok: false, message: msg };
  }
}

export async function subscribeNativeToken(token: string): Promise<{ ok: boolean; message: string }> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/push/subscribe-native`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      platform: typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
        ? 'ios'
        : 'android',
    }),
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, message: (data as { message?: string }).message || 'Falha ao salvar token.' };
  }
  return { ok: true, message: 'Notificações ativadas.' };
}
