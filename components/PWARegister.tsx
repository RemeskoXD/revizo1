'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
        }
        
        // Force active caches to clear
        if (window.caches) {
          caches.keys().then((names) => {
            for (let name of names) {
              caches.delete(name);
            }
          });
        }
      }).catch((err) => {
        console.error('Failed to clear service workers:', err);
      });
    }
  }, []);

  return null;
}
