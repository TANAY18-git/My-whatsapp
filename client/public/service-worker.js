// Service Worker for WhatsApp Clone
// Handles background notifications

// Cache name for the app
const CACHE_NAME = 'whatsapp-clone-v1';

// Listen for install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
});

// Listen for activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  // Claim clients to ensure the service worker controls all clients
  event.waitUntil(clients.claim());
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

// Listen for fetch events (for offline support)
self.addEventListener('fetch', (event) => {
  // For now, just pass through all fetch requests
  // This can be enhanced later for offline support
});

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
});
