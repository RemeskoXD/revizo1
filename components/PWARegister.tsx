'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Unregister all existing service workers to force cache bust
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        let hasOldWorker = false;
        for (let registration of registrations) {
          if (!registration.active?.scriptURL.endsWith('/sw.js')) {
             registration.unregister();
             hasOldWorker = true;
          }
        }
        if (hasOldWorker) {
           window.location.reload();
        }
      });

      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return null;
}
