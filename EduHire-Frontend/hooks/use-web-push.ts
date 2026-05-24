'use client';

import { useEffect, useRef } from 'react';
import { apiClient } from '../lib/api-client';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray.buffer;
}

export function useWebPush(userId: string | undefined) {
  const subscribed = useRef(false);

  useEffect(() => {
    if (!userId || subscribed.current) return;
    if (!VAPID_PUBLIC_KEY) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function subscribe() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const existing = await registration.pushManager.getSubscription();
        const subscription =
          existing ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          }));

        await apiClient.post('/users/me/push-subscription', subscription.toJSON());
        subscribed.current = true;
      } catch {
        // Silently fail — push is a nice-to-have
      }
    }

    subscribe();
  }, [userId]);
}
