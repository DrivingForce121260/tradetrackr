
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[Service Worker] Registered:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                console.log('[Service Worker] New version available');
                // Optionally show update notification to user
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('[Service Worker] Registration failed:', error);
      });

    // Listen for service worker messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'QUEUE_SYNCED') {
        console.log('[Service Worker] Queue synced:', event.data);
      }
    });
  });
}

// Initialize Firestore Offline Queue sync on app start
if (typeof window !== 'undefined') {
  window.addEventListener('load', async () => {
    // Wait a bit for Firebase to initialize
    setTimeout(async () => {
      try {
        const { firestoreOfflineQueue } = await import('@/services/firestoreOfflineQueue');
        
        // Auto-sync if online and queue has items
        if (navigator.onLine && firestoreOfflineQueue.getQueueLength() > 0) {
          console.log('[App] Auto-syncing Firestore offline queue on startup...');
          await firestoreOfflineQueue.syncQueue();
        }
      } catch (error) {
        console.error('[App] Failed to initialize Firestore offline queue sync:', error);
      }
    }, 2000);
  });
}

// Remove dark mode class addition
createRoot(document.getElementById("root")!).render(<App />);
