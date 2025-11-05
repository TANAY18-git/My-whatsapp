import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { initNotifications } from './lib/notificationSystem'

// Initialize the service worker and notification system
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Initialize notifications (which registers the service worker)
    initNotifications()
      .then(() => {
        console.log('Notification system initialized successfully');
      })
      .catch(error => {
        console.error('Error initializing notification system:', error);
      });
  });
}

// Add online/offline event listeners for the entire app
window.addEventListener('online', () => {
  console.log('App is online');
  document.body.classList.remove('offline');

  // Try to sync any pending messages
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(registration => {
      registration.sync.register('sync-messages')
        .then(() => console.log('Background sync registered after coming online'))
        .catch(err => console.error('Error registering background sync:', err));
    });
  }
});

window.addEventListener('offline', () => {
  console.log('App is offline');
  document.body.classList.add('offline');
});

// Set initial offline class if needed
if (!navigator.onLine) {
  document.body.classList.add('offline');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
