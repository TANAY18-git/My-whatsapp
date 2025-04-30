// Notification system for the WhatsApp clone
// This file handles notification sounds and previews based on user settings

// Import the base64 encoded notification sound
import { createNotificationSound } from './notificationSound';

// Create the notification sound from base64
const DEFAULT_NOTIFICATION_SOUND = createNotificationSound();

// Service worker registration
let swRegistration = null;

// Get notification settings - always enabled
const getNotificationSettings = () => {
  // Always return enabled settings regardless of what's in localStorage
  return {
    notificationSound: true,
    messagePreview: true,
    darkMode: true
  };
};

// Play notification sound - always enabled
export const playNotificationSound = () => {
  try {
    // Create and play the sound
    const sound = createNotificationSound();

    // The play method now uses Web Audio API internally
    // and returns a resolved promise
    sound.play()
      .then(() => {
        console.log('Notification sound triggered');
        return true;
      })
      .catch(error => {
        // This should never happen with our implementation
        console.error('Unexpected error with notification sound:', error);
        return false;
      });

    return true; // Sound triggered
  } catch (error) {
    console.error('Error with notification sound:', error);
    return false;
  }
};

// Show notification with message preview (always enabled)
export const showNotification = (title, message) => {
  // Check if notifications are supported
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notifications");
    return false;
  }

  // Always show message preview
  const notificationMessage = message;

  // Check if permission is already granted
  if (Notification.permission === "granted") {
    // If we have a service worker registration and the page is not visible, use it
    if (swRegistration && document.visibilityState !== 'visible') {
      createServiceWorkerNotification(title, notificationMessage);
    } else {
      createNotification(title, notificationMessage);
    }
    return true;
  }
  // Check if permission is not denied
  else if (Notification.permission !== "denied") {
    try {
      // Request permission and show notification if granted
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          if (swRegistration && document.visibilityState !== 'visible') {
            createServiceWorkerNotification(title, notificationMessage);
          } else {
            createNotification(title, notificationMessage);
          }
          return true;
        }
      });
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  } else {
    // If permission is denied, at least play the sound
    playNotificationSound();
  }

  return false;
};

// Create and display the notification using the service worker
const createServiceWorkerNotification = (title, message) => {
  try {
    if (!swRegistration) {
      console.warn('Service worker not registered, falling back to regular notification');
      return createNotification(title, message);
    }

    // Detect if we're on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    // Create notification options with enhanced settings for mobile
    const options = {
      body: message,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: 'message-' + Date.now(), // Unique tag to ensure multiple notifications
      data: {
        url: window.location.href,
        timestamp: Date.now()
      },
      silent: true, // Don't use browser's default sound (we'll play our own)
      vibrate: isMobile ? [200, 100, 200] : undefined, // Vibration pattern for mobile
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
      ]
    };

    // Add Android-specific options
    if (isAndroid) {
      options.android = {
        channelId: 'messages', // Must match the channel created in the service worker
        priority: 'high', // High priority for Android
        visibility: 'public' // Show on lock screen
      };
    }

    // Show notification through service worker
    swRegistration.showNotification(title, options)
      .then(() => {
        console.log('Service worker notification shown');
        // Tell service worker to play sound
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'PLAY_NOTIFICATION_SOUND'
          });
        }
      })
      .catch(error => {
        console.error('Error showing service worker notification:', error);
        // Fall back to regular notification
        createNotification(title, message);
      });

    return true;
  } catch (error) {
    console.error('Error creating service worker notification:', error);
    // Fall back to regular notification
    return createNotification(title, message);
  }
};

// Create and display the notification
const createNotification = (title, message) => {
  try {
    // Detect if we're on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Create the notification with enhanced options for mobile
    const notification = new Notification(title, {
      body: message,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: 'message-' + Date.now(), // Unique tag
      silent: true, // Don't use browser's default sound
      vibrate: isMobile ? [200, 100, 200] : undefined, // Vibration pattern for mobile
      requireInteraction: true, // Notification remains until user interacts with it
      data: {
        url: window.location.href,
        timestamp: Date.now()
      }
    });

    // Note: We don't call playNotificationSound() here because it's already called
    // in the Chat component when a message is received

    // Close notification after 10 seconds (longer for better visibility)
    setTimeout(() => {
      notification.close();
    }, 10000);

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
};

// Initialize notification system
export const initNotifications = async () => {
  // Request notification permission on init
  if (Notification.permission !== "denied" && Notification.permission !== "granted") {
    try {
      Notification.requestPermission();
    } catch (error) {
      console.warn('Could not request notification permission:', error);
    }
  }

  // Register service worker for background notifications
  if ('serviceWorker' in navigator) {
    try {
      // Register the service worker with a more specific scope
      swRegistration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      console.log('Service Worker registered with scope:', swRegistration.scope);

      // Wait for the service worker to be ready
      const serviceWorkerReady = await navigator.serviceWorker.ready;
      console.log('Service Worker is ready:', serviceWorkerReady);

      // Create notification channels for Android
      if (swRegistration.pushManager) {
        // Check if we're on Android and can create notification channels
        if ('Notification' in window && 'serviceWorker' in navigator && navigator.userAgent.indexOf('Android') !== -1) {
          try {
            // This is a workaround since we can't directly create notification channels from the web
            // We'll use the service worker to handle the notification display with proper channel settings
            console.log('Setting up for Android notifications');

            // We'll use a custom event to tell the service worker about our notification preferences
            if (swRegistration.active) {
              swRegistration.active.postMessage({
                type: 'SETUP_NOTIFICATION_CHANNEL',
                channel: {
                  id: 'messages',
                  name: 'Messages',
                  description: 'Notifications for new messages',
                  importance: 'high'
                }
              });
            } else {
              console.warn('Service Worker is not active yet, will retry setup');
              // Retry after a short delay
              setTimeout(() => {
                if (swRegistration.active) {
                  swRegistration.active.postMessage({
                    type: 'SETUP_NOTIFICATION_CHANNEL',
                    channel: {
                      id: 'messages',
                      name: 'Messages',
                      description: 'Notifications for new messages',
                      importance: 'high'
                    }
                  });
                }
              }, 1000);
            }
          } catch (error) {
            console.error('Error setting up Android notification channels:', error);
          }
        }
      }

      // Register for background sync if supported
      if ('SyncManager' in window) {
        try {
          // Register for background sync
          await serviceWorkerReady.sync.register('sync-messages');
          console.log('Background sync registered for messages');
        } catch (error) {
          console.error('Error registering for background sync:', error);
        }
      } else {
        console.warn('Background Sync is not supported in this browser');
      }

      // Listen for messages from the service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Message from service worker:', event.data);

        if (event.data && event.data.type === 'PLAY_NOTIFICATION_SOUND') {
          playNotificationSound();
        }

        // Handle sync offline messages request
        if (event.data && event.data.type === 'SYNC_OFFLINE_MESSAGES') {
          console.log('Received request to sync offline messages');
          syncOfflineMessages();
        }
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  } else {
    console.warn('Service workers are not supported in this browser');
  }

  console.log('Notification system initialized');
};

// Function to sync offline messages
const syncOfflineMessages = async () => {
  try {
    // Check if we have any offline messages to sync
    const offlineMessages = JSON.parse(localStorage.getItem('offline_messages') || '[]');

    if (offlineMessages.length === 0) {
      console.log('No offline messages to sync');
      return;
    }

    console.log(`Found ${offlineMessages.length} offline messages to sync`);

    // Get the user from localStorage
    const user = JSON.parse(localStorage.getItem('whatsapp_user'));

    if (!user || !user.token) {
      console.error('User not logged in, cannot sync messages');
      return;
    }

    // Try to send each message
    for (const message of offlineMessages) {
      if (message.synced) continue;

      try {
        // Determine the API endpoint based on message type
        const isGroupMessage = message.groupId !== undefined;
        const endpoint = isGroupMessage
          ? `/api/groups/${message.groupId}/messages`
          : '/api/messages';

        // Send the message to the server
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify(message)
        });

        if (response.ok) {
          // Mark the message as synced
          message.synced = true;
          console.log(`Successfully synced message: ${message._id || 'new message'}`);
        } else {
          console.error(`Failed to sync message: ${await response.text()}`);
        }
      } catch (error) {
        console.error('Error syncing message:', error);
      }
    }

    // Update the offline messages in localStorage
    localStorage.setItem('offline_messages', JSON.stringify(offlineMessages));

    // Clean up synced messages
    const unsynced = offlineMessages.filter(message => !message.synced);
    localStorage.setItem('offline_messages', JSON.stringify(unsynced));

    console.log(`Sync complete. ${offlineMessages.length - unsynced.length} messages synced, ${unsynced.length} remaining`);
  } catch (error) {
    console.error('Error in syncOfflineMessages:', error);
  }
};

// Test notification system
export const testNotification = () => {
  // Play notification sound
  const soundPlayed = playNotificationSound();

  // Show desktop notification
  let notificationShown = false;
  try {
    notificationShown = showNotification("WhatsApp Clone", "This is a test notification");
  } catch (error) {
    console.error('Error showing notification:', error);
  }

  // Log test results
  console.log('Notification test results:', {
    soundPlayed,
    notificationShown
  });

  return {
    soundPlayed,
    notificationShown
  };
};
