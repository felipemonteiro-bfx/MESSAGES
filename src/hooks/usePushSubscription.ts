'use client';

import { useState, useCallback, useEffect } from 'react';

const VAPID_PUBLIC = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '') : '';

export function usePushSubscription() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported] = useState(
    typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
  );

  const registerAndSubscribe = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    if (!isSupported) return { ok: false, message: 'Navegador não suporta notificações push.' };
    if (!VAPID_PUBLIC) return { ok: false, message: 'Push não configurado (chave VAPID ausente).' };

    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const reg = await navigator.serviceWorker.ready;

      if (Notification.permission === 'denied') return { ok: false, message: 'Notificações foram bloqueadas. Habilite nas configurações do site.' };
      const current = Notification.permission;
      const permission = current === 'default' ? await Notification.requestPermission() : current;
      if (permission !== 'granted') return { ok: false, message: 'Permissão de notificação negada.' };

      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setIsSubscribed(true);
        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });
        if (!res.ok) return { ok: false, message: 'Falha ao registrar dispositivo.' };
        return { ok: true, message: 'Notificações já ativadas.' };
      }

      const key = urlBase64ToUint8Array(VAPID_PUBLIC);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key.buffer as ArrayBuffer,
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, message: (err as { message?: string }).message || 'Falha ao ativar notificações.' };
      }
      setIsSubscribed(true);
      return { ok: true, message: 'Notificações ativadas. Você verá "notícias" quando receber mensagens.' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao ativar notificações.';
      return { ok: false, message: msg };
    }
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported || !VAPID_PUBLIC) return;
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((sub) => {
      if (sub) setIsSubscribed(true);
    }).catch(() => {});
  }, [isSupported]);

  return { registerAndSubscribe, isSupported, isSubscribed, setIsSubscribed };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}
