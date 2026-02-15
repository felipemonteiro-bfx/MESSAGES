'use client';

import { useEffect, useRef } from 'react';

/**
 * Registra o Service Worker e gerencia atualizações.
 * NÃO pede permissão de notificação automaticamente — 
 * isso deve ser feito após ação explícita do usuário.
 */
export default function ServiceWorkerRegistration() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        registrationRef.current = registration;
        console.log('Service Worker registrado:', registration.scope);

        // Detectar atualizações do SW
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
              // Nova versão disponível — o usuário verá na próxima navegação
              console.log('Nova versão do Service Worker disponível');
            }
          });
        });
      })
      .catch((error) => {
        console.error('Erro ao registrar Service Worker:', error);
      });
  }, []);

  return null;
}

/**
 * Função utilitária para solicitar permissão de notificação.
 * Deve ser chamada após uma ação do usuário (ex: clicar em "Ativar notificações").
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  
  if (Notification.permission !== 'default') {
    return Notification.permission;
  }

  return Notification.requestPermission();
}
