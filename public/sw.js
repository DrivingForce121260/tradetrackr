// TradeTrackr Service Worker
// Version: 1.1.0 - Fixed Quirks Mode issue
const CACHE_NAME = 'tradetrackr-v1.1';
const RUNTIME_CACHE = 'tradetrackr-runtime-v1.1';
const OFFLINE_QUEUE = 'tradetrackr-offline-queue';

// Assets to cache on install
// Note: index.html is NOT cached to prevent Quirks Mode issues
const STATIC_ASSETS = [
  '/manifest.json',
  '/offline.html'
];

// Install event - Cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting(); // Activate immediately
    })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[Service Worker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      return self.clients.claim(); // Take control of all pages
    })
  );
});

// Fetch event - Network-first strategy for API, Cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API calls - Network-first strategy
  if (url.pathname.startsWith('/api/') || url.hostname.includes('firebase')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets - Cache-first strategy
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // HTML pages - Always fetch from network first (no aggressive caching)
  // This ensures we always get the latest version and avoid Quirks Mode issues
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstNoCache(request));
    return;
  }

  // Default: Network-first
  event.respondWith(networkFirstStrategy(request));
});

// Network-first strategy (for API calls)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', request.url);
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's an API call and we're offline, queue it
    if (request.url.includes('/api/') || request.url.includes('firebase')) {
      await queueOfflineRequest(request);
    }
    
    throw error;
  }
}

// Cache-first strategy (for static assets)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Failed to fetch:', request.url);
    throw error;
  }
}

// Network-first with no caching for HTML pages (prevents Quirks Mode issues)
async function networkFirstNoCache(request) {
  try {
    // Always fetch from network for HTML to ensure latest version
    const networkResponse = await fetch(request, {
      cache: 'no-store' // Don't cache HTML pages
    });
    
    return networkResponse;
  } catch (error) {
    // Only use cache as last resort when offline
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page if available
    if (request.headers.get('accept')?.includes('text/html')) {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    throw error;
  }
}

// Queue offline request for later sync
async function queueOfflineRequest(request) {
  try {
    const queue = await getOfflineQueue();
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.body ? await request.clone().text() : null,
      timestamp: Date.now()
    };
    
    queue.push(requestData);
    
    // Store queue in IndexedDB or cache
    const cache = await caches.open(OFFLINE_QUEUE);
    await cache.put(
      new Request('/offline-queue'),
      new Response(JSON.stringify(queue))
    );
    
    console.log('[Service Worker] Queued offline request:', request.url);
  } catch (error) {
    console.error('[Service Worker] Failed to queue request:', error);
  }
}

// Get offline queue
async function getOfflineQueue() {
  try {
    const cache = await caches.open(OFFLINE_QUEUE);
    const response = await cache.match('/offline-queue');
    
    if (response) {
      return await response.json();
    }
  } catch (error) {
    console.error('[Service Worker] Failed to get queue:', error);
  }
  
  return [];
}

// Message handler for sync requests
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'SYNC_OFFLINE_QUEUE') {
    await syncOfflineQueue();
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Sync offline queue when online
async function syncOfflineQueue() {
  const queue = await getOfflineQueue();
  
  if (queue.length === 0) {
    return;
  }
  
  console.log('[Service Worker] Syncing', queue.length, 'queued requests');
  
  const successful = [];
  const failed = [];
  
  for (const requestData of queue) {
    try {
      const response = await fetch(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.body
      });
      
      if (response.ok) {
        successful.push(requestData);
      } else {
        failed.push(requestData);
      }
    } catch (error) {
      console.error('[Service Worker] Failed to sync request:', requestData.url, error);
      failed.push(requestData);
    }
  }
  
  // Remove successful requests from queue
  if (successful.length > 0) {
    const remainingQueue = queue.filter(
      (req) => !successful.some((s) => s.timestamp === req.timestamp)
    );
    
    const cache = await caches.open(OFFLINE_QUEUE);
    await cache.put(
      new Request('/offline-queue'),
      new Response(JSON.stringify(remainingQueue))
    );
    
    // Notify clients
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'QUEUE_SYNCED',
        successful: successful.length,
        remaining: remainingQueue.length
      });
    });
  }
}

// Listen for online event to trigger sync
self.addEventListener('online', () => {
  console.log('[Service Worker] Back online, syncing queue...');
  syncOfflineQueue();
});



