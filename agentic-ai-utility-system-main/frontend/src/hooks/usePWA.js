import { useState, useEffect, useCallback } from 'react';

// Service Worker Registration Hook
export const useServiceWorker = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swRegistration, setSwRegistration] = useState(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration);
          setIsRegistered(true);
          setSwRegistration(registration);

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          });
        })
        .catch((err) => {
          console.error('SW registration failed:', err);
        });

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Message from SW:', event.data);
        
        if (event.data.type === 'SYNC_COMPLETE') {
          // Handle sync complete
          window.dispatchEvent(new CustomEvent('sync-complete', {
            detail: event.data
          }));
        }
        
        if (event.data.type === 'NOTIFICATION_CLICK') {
          // Handle notification click
          window.dispatchEvent(new CustomEvent('notification-click', {
            detail: event.data
          }));
        }
      });
    }
  }, []);

  const updateServiceWorker = useCallback(() => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [swRegistration]);

  return { isRegistered, updateAvailable, updateServiceWorker };
};

// Online/Offline Status Hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection type if available
    if ('connection' in navigator) {
      const connection = navigator.connection;
      setConnectionType(connection.effectiveType || 'unknown');
      
      connection.addEventListener('change', () => {
        setConnectionType(connection.effectiveType || 'unknown');
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionType };
};

// Push Notifications Hook
export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if ('PushManager' in window && 'Notification' in window) {
      setIsSupported(true);
      
      // Check existing subscription
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
          setSubscription(sub);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) return;

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.VITE_VAPID_PUBLIC_KEY || ''
          )
        });
        
        setSubscription(sub);
        setIsSubscribed(true);
        
        // Send subscription to server
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub)
        });
        
        return { success: true };
      }
      
      return { success: false, error: 'Permission denied' };
    } catch (err) {
      console.error('Push subscription failed:', err);
      return { success: false, error: err.message };
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;

    try {
      await subscription.unsubscribe();
      setIsSubscribed(false);
      setSubscription(null);
      
      // Notify server
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      
      return { success: true };
    } catch (err) {
      console.error('Push unsubscription failed:', err);
      return { success: false, error: err.message };
    }
  }, [subscription]);

  return { isSupported, isSubscribed, subscribe, unsubscribe };
};

// Background Sync Hook
export const useBackgroundSync = () => {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      setIsSupported(true);
    }
  }, []);

  const sync = useCallback(async (tag) => {
    if (!isSupported) return { success: false, error: 'Not supported' };

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      return { success: true };
    } catch (err) {
      console.error('Background sync failed:', err);
      return { success: false, error: err.message };
    }
  }, [isSupported]);

  return { isSupported, sync };
};

// Install Prompt Hook
export const useInstallPrompt = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return { success: false, error: 'No install prompt available' };

    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    
    return { success: outcome === 'accepted', outcome };
  }, [deferredPrompt]);

  return { isInstallable, isInstalled, promptInstall };
};

// Offline Storage Hook
export const useOfflineStorage = () => {
  const [db, setDb] = useState(null);

  useEffect(() => {
    const openDB = () => {
      const request = indexedDB.open('valtryek-offline', 1);
      
      request.onerror = () => console.error('Failed to open offline DB');
      request.onsuccess = () => setDb(request.result);
      
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        
        if (!database.objectStoreNames.contains('pending-faults')) {
          database.createObjectStore('pending-faults', { keyPath: 'id' });
        }
        
        if (!database.objectStoreNames.contains('pending-reports')) {
          database.createObjectStore('pending-reports', { keyPath: 'id' });
        }
        
        if (!database.objectStoreNames.contains('cached-data')) {
          database.createObjectStore('cached-data', { keyPath: 'key' });
        }
      };
    };

    openDB();
  }, []);

  const savePendingFault = useCallback(async (faultData) => {
    if (!db) return { success: false, error: 'DB not ready' };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pending-faults'], 'readwrite');
      const store = transaction.objectStore('pending-faults');
      
      const request = store.add({
        id: Date.now().toString(),
        data: faultData,
        timestamp: Date.now()
      });
      
      request.onsuccess = () => resolve({ success: true, id: request.result });
      request.onerror = () => reject({ success: false, error: request.error });
    });
  }, [db]);

  const getPendingFaults = useCallback(async () => {
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pending-faults'], 'readonly');
      const store = transaction.objectStore('pending-faults');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject([]);
    });
  }, [db]);

  const clearPendingFaults = useCallback(async () => {
    if (!db) return { success: false };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pending-faults'], 'readwrite');
      const store = transaction.objectStore('pending-faults');
      const request = store.clear();
      
      request.onsuccess = () => resolve({ success: true });
      request.onerror = () => reject({ success: false });
    });
  }, [db]);

  return {
    savePendingFault,
    getPendingFaults,
    clearPendingFaults
  };
};

// Combined PWA Hook
export const usePWA = () => {
  const serviceWorker = useServiceWorker();
  const networkStatus = useNetworkStatus();
  const pushNotifications = usePushNotifications();
  const backgroundSync = useBackgroundSync();
  const installPrompt = useInstallPrompt();
  const offlineStorage = useOfflineStorage();

  return {
    ...serviceWorker,
    ...networkStatus,
    ...pushNotifications,
    ...backgroundSync,
    ...installPrompt,
    ...offlineStorage,
    isPWA: window.matchMedia('(display-mode: standalone)').matches
  };
};

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

export default usePWA;
