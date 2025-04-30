// Notification helper functions for the WhatsApp clone
// This file provides additional utilities for handling notifications

// Check if the app is in the background
export const isAppInBackground = () => {
  return document.visibilityState !== 'visible';
};

// Check if the app is running on a mobile device
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Check if the app is installed as a PWA
export const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone || 
         document.referrer.includes('android-app://');
};

// Check if notifications are supported
export const areNotificationsSupported = () => {
  return "Notification" in window && "serviceWorker" in navigator;
};

// Check if notification permission is granted
export const hasNotificationPermission = () => {
  return Notification.permission === "granted";
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notifications");
    return false;
  }
  
  if (Notification.permission === "granted") {
    return true;
  }
  
  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }
  
  return false;
};

// Register background sync for offline messages
export const registerBackgroundSync = async () => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-messages');
      console.log('Background sync registered');
      return true;
    } catch (error) {
      console.error('Error registering background sync:', error);
      return false;
    }
  }
  return false;
};

// Store a message for background sync
export const storeMessageForSync = (message) => {
  try {
    // Get existing messages
    const storedMessages = JSON.parse(localStorage.getItem('offline_messages') || '[]');
    
    // Add new message
    storedMessages.push({
      ...message,
      timestamp: Date.now(),
      synced: false
    });
    
    // Store updated messages
    localStorage.setItem('offline_messages', JSON.stringify(storedMessages));
    
    return true;
  } catch (error) {
    console.error('Error storing message for sync:', error);
    return false;
  }
};

// Get messages that need to be synced
export const getUnsynedMessages = () => {
  try {
    const storedMessages = JSON.parse(localStorage.getItem('offline_messages') || '[]');
    return storedMessages.filter(message => !message.synced);
  } catch (error) {
    console.error('Error getting unsynced messages:', error);
    return [];
  }
};

// Mark a message as synced
export const markMessageAsSynced = (messageId) => {
  try {
    const storedMessages = JSON.parse(localStorage.getItem('offline_messages') || '[]');
    
    const updatedMessages = storedMessages.map(message => 
      message._id === messageId ? { ...message, synced: true } : message
    );
    
    localStorage.setItem('offline_messages', JSON.stringify(updatedMessages));
    
    return true;
  } catch (error) {
    console.error('Error marking message as synced:', error);
    return false;
  }
};

// Clear synced messages
export const clearSyncedMessages = () => {
  try {
    const storedMessages = JSON.parse(localStorage.getItem('offline_messages') || '[]');
    
    const unsynedMessages = storedMessages.filter(message => !message.synced);
    
    localStorage.setItem('offline_messages', JSON.stringify(unsynedMessages));
    
    return true;
  } catch (error) {
    console.error('Error clearing synced messages:', error);
    return false;
  }
};
