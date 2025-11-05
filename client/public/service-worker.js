// Service Worker for WhatsApp Clone
// Handles background notifications, offline support, and caching

// Cache names for different types of content
const STATIC_CACHE_NAME = 'ak-chats-static-v1';
const DYNAMIC_CACHE_NAME = 'ak-chats-dynamic-v1';
const MESSAGES_CACHE_NAME = 'ak-chats-messages-v1';
const API_CACHE_NAME = 'ak-chats-api-v1';

// Resources to cache immediately on install
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/new-logo.jpg',
  '/chat-logo.png',
  '/assets/index.css',
  '/assets/index.js',
  '/offline.html'
];

// API endpoints to cache for offline use
const API_ENDPOINTS = [
  { url: '/api/users/contacts', method: 'GET' },
  { url: '/api/groups', method: 'GET' }
];

// Listen for install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');

  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();

  // Cache static resources
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .catch(error => {
        console.error('Error caching static resources:', error);
      })
  );
});

// Listen for activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');

  // Claim clients to ensure the service worker controls all clients
  event.waitUntil(
    Promise.all([
      clients.claim(),

      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName !== MESSAGES_CACHE_NAME &&
              cacheName !== API_CACHE_NAME
            ) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Listen for push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received', event);

  if (!event.data) {
    console.log('No data received with push notification');
    return;
  }

  try {
    // Parse the data from the push notification
    const data = event.data.json();
    console.log('Push notification data:', data);

    // Show notification with enhanced options for mobile devices
    const notificationPromise = self.registration.showNotification(data.title || 'New Message', {
      body: data.message || 'You have a new message',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: data.tag || 'message-' + Date.now(), // Unique tag to ensure multiple notifications
      data: data,
      vibrate: [200, 100, 200], // Vibration pattern
      renotify: true, // Always notify, even if there's already a notification with the same tag
      requireInteraction: true, // Notification remains until user interacts with it
      actions: [
        {
          action: 'reply',
          title: 'Reply',
          icon: '/reply-icon.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/close-icon.png'
        }
      ],
      // Android specific options
      android: {
        channelId: 'messages', // Must match the channel created in the app
        priority: 'high', // High priority for Android
        visibility: 'public' // Show on lock screen
      }
    });

    // Wait for the notification to be shown
    event.waitUntil(notificationPromise);
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
});

// Listen for notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked', event);

  // Get the action (if any)
  const action = event.action;

  // Close the notification
  event.notification.close();

  if (action === 'reply') {
    // Handle reply action
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // If there's at least one client, focus on it and send a message to open reply
        if (clientList.length > 0) {
          clientList[0].focus();
          clientList[0].postMessage({
            type: 'NOTIFICATION_REPLY',
            data: event.notification.data
          });
          return;
        }
        // Otherwise, open a new window
        return clients.openWindow('/').then(client => {
          // Wait for the window to load and then send the message
          setTimeout(() => {
            client.postMessage({
              type: 'NOTIFICATION_REPLY',
              data: event.notification.data
            });
          }, 1000);
        });
      })
    );
  } else if (action === 'close') {
    // Just close the notification (already done above)
    return;
  } else {
    // Default action - open or focus the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // If there's at least one client, focus on it
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        // Otherwise, open a new window
        return clients.openWindow('/');
      })
    );
  }
});

// Helper function to determine if a request is for an API
const isApiRequest = (url) => {
  return url.pathname.startsWith('/api/');
};

// Helper function to determine if a request is for a static asset
const isStaticAsset = (url) => {
  return (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/static/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  );
};

// Helper function to determine if a request is for a message
const isMessageRequest = (url) => {
  return url.pathname.includes('/api/messages/');
};

// Listen for fetch events (for offline support)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin && !url.origin.includes('my-whatsapp-backend-iku0.onrender.com')) {
    return;
  }

  // Handle API requests
  if (isApiRequest(url)) {
    if (isMessageRequest(url)) {
      // For message requests, use network first, then cache
      event.respondWith(
        fetch(event.request)
          .then(response => {
            // Clone the response to store in cache
            const responseToCache = response.clone();

            caches.open(MESSAGES_CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If network fails, try to get from cache
            return caches.match(event.request)
              .then(cachedResponse => {
                if (cachedResponse) {
                  return cachedResponse;
                }

                // If not in cache, return a default offline message response
                return new Response(
                  JSON.stringify({
                    error: 'You are offline. Messages will be synced when you are back online.'
                  }),
                  {
                    headers: { 'Content-Type': 'application/json' },
                    status: 503
                  }
                );
              });
          })
      );
    } else {
      // For other API requests, use network first, then cache
      event.respondWith(
        fetch(event.request)
          .then(response => {
            // Clone the response to store in cache
            const responseToCache = response.clone();

            caches.open(API_CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If network fails, try to get from cache
            return caches.match(event.request)
              .then(cachedResponse => {
                if (cachedResponse) {
                  return cachedResponse;
                }

                // If not in cache, return a default offline API response
                return new Response(
                  JSON.stringify({
                    error: 'You are offline. This data will be available when you are back online.'
                  }),
                  {
                    headers: { 'Content-Type': 'application/json' },
                    status: 503
                  }
                );
              });
          })
      );
    }
  }
  // Handle static assets
  else if (isStaticAsset(url)) {
    // For static assets, use cache first, then network
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // If not in cache, fetch from network and cache
          return fetch(event.request)
            .then(response => {
              // Clone the response to store in cache
              const responseToCache = response.clone();

              caches.open(STATIC_CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });

              return response;
            })
            .catch(error => {
              console.error('Error fetching static asset:', error);
              // Return a fallback for images
              if (
                event.request.url.endsWith('.png') ||
                event.request.url.endsWith('.jpg') ||
                event.request.url.endsWith('.jpeg')
              ) {
                return caches.match('/logo.png');
              }
            });
        })
    );
  }
  // Handle HTML navigation requests
  else if (event.request.mode === 'navigate') {
    // For navigation requests, use cache first, then network, with offline fallback
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // If not in cache, fetch from network
          return fetch(event.request)
            .then(response => {
              // Clone the response to store in cache
              const responseToCache = response.clone();

              caches.open(DYNAMIC_CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });

              return response;
            })
            .catch(() => {
              // If offline, return the offline page
              return caches.match('/offline.html');
            });
        })
    );
  }
  // For all other requests, use network first with cache fallback
  else {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response to store in cache
          const responseToCache = response.clone();

          caches.open(DYNAMIC_CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        })
        .catch(() => {
          // If network fails, try to get from cache
          return caches.match(event.request);
        })
    );
  }
});

// Handle background sync for offline messages
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    console.log('Attempting to sync offline messages');
    event.waitUntil(syncOfflineMessages());
  }
});

// Function to sync offline messages
const syncOfflineMessages = async () => {
  try {
    // Get all clients
    const clients = await self.clients.matchAll();

    // Send a message to the client to sync offline messages
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_OFFLINE_MESSAGES'
      });
    });

    return true;
  } catch (error) {
    console.error('Error syncing offline messages:', error);
    return false;
  }
};

// Store notification channel information
let notificationChannels = {
  messages: {
    id: 'messages',
    name: 'Messages',
    description: 'Notifications for new messages',
    importance: 'high'
  }
};

// Listen for message events from the client
self.addEventListener('message', (event) => {
  console.log('Message received in service worker:', event.data);

  if (event.data && event.data.type === 'PLAY_NOTIFICATION_SOUND') {
    // We can't play sounds directly in the service worker
    // Instead, we'll post a message back to all clients to play the sound
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'PLAY_NOTIFICATION_SOUND'
        });
      });
    });
  }

  // Handle notification channel setup
  if (event.data && event.data.type === 'SETUP_NOTIFICATION_CHANNEL') {
    if (event.data.channel) {
      console.log('Setting up notification channel:', event.data.channel);
      notificationChannels[event.data.channel.id] = event.data.channel;
    }
  }

  // Handle cache update request
  if (event.data && event.data.type === 'UPDATE_CACHE') {
    const { cacheName, url, data } = event.data;
    if (cacheName && url && data) {
      caches.open(cacheName).then(cache => {
        const response = new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' }
        });
        cache.put(new Request(url), response);
        console.log(`Updated cache: ${cacheName} for URL: ${url}`);
      });
    }
  }
});
