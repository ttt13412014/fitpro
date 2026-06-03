'use client';

import { useEffect } from 'react';
import toast from 'react-hot-toast';

export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registrado:', registration.scope);

        // Detectar actualización disponible
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              toast('Nueva versión disponible. Recargá para actualizar.', {
                icon: '🔄',
                duration: 5000,
              });
            }
          });
        });
      })
      .catch((err) => console.log('[PWA] SW registration failed:', err));

    // Detectar cuando está instalada como PWA
    window.addEventListener('appinstalled', () => {
      toast.success('¡FitPro instalada correctamente!');
    });
  }, []);

  return null;
}
