// Notification system for the WhatsApp clone
// This file handles notification sounds and previews based on user settings

// Import the base64 encoded notification sound
import { createNotificationSound } from './notificationSound';

// Create the notification sound from base64
const DEFAULT_NOTIFICATION_SOUND = createNotificationSound();

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
    createNotification(title, notificationMessage);
    return true;
  }
  // Check if permission is not denied
  else if (Notification.permission !== "denied") {
    try {
      // Request permission and show notification if granted
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          createNotification(title, notificationMessage);
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

// Create and display the notification
const createNotification = (title, message) => {
  try {
    // Create the notification
    const notification = new Notification(title, {
      body: message,
      icon: '/logo.png',
      silent: true // Don't use browser's default sound
    });

    // Note: We don't call playNotificationSound() here because it's already called
    // in the Chat component when a message is received

    // Close notification after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

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
export const initNotifications = () => {
  // Request notification permission on init
  if (Notification.permission !== "denied" && Notification.permission !== "granted") {
    try {
      Notification.requestPermission();
    } catch (error) {
      console.warn('Could not request notification permission:', error);
    }
  }

  // No need to preload audio since we're using Web Audio API
  console.log('Notification system initialized');
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
