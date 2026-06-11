import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Bersihkan Service Worker lama yang menyebabkan cache corrupt & layar putih
if ('serviceWorker' in navigator) {
  // Unregister semua service worker yang ada
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for (let registration of registrations) {
      registration.unregister();
      console.log('PWA Service Worker lama berhasil dihapus:', registration.scope);
    }
  });
  
  // Hapus cache lama jika ada
  if ('caches' in window) {
    caches.keys().then(function(cacheNames) {
      cacheNames.forEach(function(cacheName) {
        caches.delete(cacheName);
        console.log('Cache PWA lama berhasil dibersihkan:', cacheName);
      });
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
