const CACHE_NAME = 'valtryek-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Cache failed:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip Socket.io requests
  if (url.pathname.includes('socket.io')) {
    return;
  }
  
  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Static assets - cache first, network fallback
  event.respondWith(cacheFirst(request));
});

// Cache-first strategy
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    // Return cached version and update in background
    fetch(request)
      .then((response) => {
        if (response.ok) {
          cache.put(request, response);
        }
      })
      .catch(() => {});
    
    return cached;
  }
  
  // Not in cache, fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.error('[SW] Fetch failed:', err);
    // Return offline fallback if available
    return caches.match('/offline.html');
  }
}

// Network-first strategy
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    console.log('[SW] Network failed, trying cache');
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    
    // Return error response for API calls
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'You are currently offline' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-faults') {
    event.waitUntil(syncFaults());
  }
  
  if (event.tag === 'sync-reports') {
    event.waitUntil(syncReports());
  }
});

// Sync pending faults
async function syncFaults() {
  const db = await openDB('valtryek-offline', 1);
  const faults = await db.getAll('pending-faults');
  
  for (const fault of faults) {
    try {
      const response = await fetch('/api/faults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fault.data)
      });
      
      if (response.ok) {
        await db.delete('pending-faults', fault.id);
        
        // Notify clients
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SYNC_COMPLETE',
              faultId: fault.id
            });
          });
        });
      }
    } catch (err) {
      console.error('[SW] Sync failed for fault:', fault.id, err);
    }
  }
}

// Sync pending reports
async function syncReports() {
  const db = await openDB('valtryek-offline', 1);
  const reports = await db.getAll('pending-reports');
  
  for (const report of reports) {
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report.data)
      });
      
      if (response.ok) {
        await db.delete('pending-reports', report.id);
      }
    } catch (err) {
      console.error('[SW] Sync failed for report:', report.id, err);
    }
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'Valtryek',
      body: event.data.text(),
      icon: '/icons/icon-192x192.png'
    };
  }
  
  const options = {
    body: data.body || 'New notification',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    data: data.data || {}
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Valtryek', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  const { notification } = event;
  const action = event.action;
  
  if (action === 'view') {
    event.waitUntil(
      self.clients.openWindow(notification.data.url || '/')
    );
  } else if (action === 'dismiss') {
    // Just close the notification
  } else {
    // Default action - open app
    event.waitUntil(
      self.clients.matchAll({ type: 'window' })
        .then((clientList) => {
          if (clientList.length > 0) {
            const client = clientList[0];
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              data: notification.data
            });
          } else {
            self.clients.openWindow(notification.data.url || '/');
          }
        })
    );
  }
});

// Message from client
self.addEventListener('message', (event) => {
  console.log('[SW] Message from client:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_ASSETS') {
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(event.data.assets))
      .then(() => {
        event.ports[0].postMessage({ success: true });
      })
      .catch((err) => {
        event.ports[0].postMessage({ success: false, error: err.message });
      });
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);
  
  if (event.tag === 'update-data') {
    event.waitUntil(updateCachedData());
  }
});

async function updateCachedData() {
  const cache = await caches.open(CACHE_NAME);
  
  // Update critical data
  const urlsToUpdate = [
    '/api/faults/active',
    '/api/technicians/online'
  ];
  
  for (const url of urlsToUpdate) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        cache.put(url, response);
      }
    } catch (err) {
      console.error('[SW] Failed to update:', url, err);
    }
  }
}

// IndexedDB helper
function openDB(name, version) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending-faults')) {
        db.createObjectStore('pending-faults', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('pending-reports')) {
        db.createObjectStore('pending-reports', { keyPath: 'id' });
      }
    };
  });
}

// ExtendableDB helper for IndexedDB operations
class ExtendableDB {
  constructor(db) {
    this.db = db;
  }
  
  getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Extend IndexedDB with helper methods
IDBDatabase.prototype.getAll = function(storeName) {
  return new ExtendableDB(this).getAll(storeName);
};

IDBDatabase.prototype.delete = function(storeName, id) {
  return new ExtendableDB(this).delete(storeName, id);
};
