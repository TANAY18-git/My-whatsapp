import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppTour from './AppTour';
import WelcomeModal from './WelcomeModal';
import TipManager from './TipManager';

const AppWrapper = ({ children }) => {
  const location = useLocation();
  const [tourLocation, setTourLocation] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showTour, setShowTour] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set tour location based on current route
  useEffect(() => {
    if (location.pathname === '/') {
      setTourLocation('home');
    } else if (location.pathname === '/profile') {
      setTourLocation('profile');
    } else if (location.pathname.includes('/chat')) {
      setTourLocation('chat');
    }
  }, [location]);

  // Handle starting the tour
  const handleStartTour = () => {
    // Remove the tour seen flag to restart the tour
    localStorage.removeItem('ak_chats_tour_seen');
    setShowTour(true);

    // Force a re-render of the AppTour component
    setTourLocation('');
    setTimeout(() => {
      setTourLocation(location.pathname === '/' ? 'home' :
                     location.pathname === '/profile' ? 'profile' : 'chat');
    }, 100);
  };

  return (
    <>
      {children}

      {/* Welcome modal for first-time users */}
      <WelcomeModal
        onStartTour={handleStartTour}
        onSkipTour={() => {
          localStorage.setItem('ak_chats_tour_seen', 'true');
        }}
      />

      {/* App tour */}
      {tourLocation && (
        <AppTour
          location={tourLocation}
          isMobile={isMobile}
          key={showTour ? 'show-tour' : 'hidden-tour'}
        />
      )}

      {/* Tip manager for contextual tips */}
      <TipManager />
    </>
  );
};

export default AppWrapper;
