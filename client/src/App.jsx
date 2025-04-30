import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import ProfilePage from './pages/ProfilePage';

// Notification System
import { initNotifications } from './lib/notificationSystem';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('whatsapp_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);

    // Initialize notification system
    initNotifications();

    // Request notification permission when the app loads
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      try {
        // We need to request permission on user interaction
        const requestPermission = () => {
          Notification.requestPermission().then(permission => {
            console.log('Notification permission:', permission);
            // Remove event listeners once permission is requested
            document.removeEventListener('click', requestPermission);
            document.removeEventListener('keydown', requestPermission);
          });
        };

        // Add event listeners to request permission on user interaction
        document.addEventListener('click', requestPermission);
        document.addEventListener('keydown', requestPermission);
      } catch (error) {
        console.warn('Could not set up notification permission request:', error);
      }
    }

    // Set up visibility change listener to handle background/foreground transitions
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up event listener
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handle visibility change (app going to background or coming to foreground)
  const handleVisibilityChange = () => {
    console.log('Visibility state changed:', document.visibilityState);

    // If the app is coming back to the foreground, check for any missed notifications
    if (document.visibilityState === 'visible') {
      console.log('App is now visible');
    } else {
      console.log('App is now hidden');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <div className="mb-6">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-900 p-2 shadow-lg" style={{ boxShadow: '0 0 20px rgba(104, 109, 224, 0.5)' }}>
            <img
              src="/new-logo.jpg"
              alt="AK Chats Logo"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register setUser={setUser} />} />
        <Route path="/profile" element={user ? <ProfilePage user={user} setUser={setUser} /> : <Navigate to="/login" />} />
        <Route path="/" element={user ? <Chat user={user} setUser={setUser} /> : <Navigate to="/login" />} />
        {/* Catch all other routes and redirect to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
