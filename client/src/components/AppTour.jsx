import React, { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '../styles/tour.css';

const AppTour = ({ location, isMobile }) => {
  const [driverObj, setDriverObj] = useState(null);
  const [hasSeenTour, setHasSeenTour] = useState(false);

  // Check if user has seen the tour before
  useEffect(() => {
    const tourSeen = localStorage.getItem('ak_chats_tour_seen');
    if (tourSeen) {
      setHasSeenTour(true);
    }
  }, []);

  // Initialize driver.js
  useEffect(() => {
    if (hasSeenTour) return;

    // Create a new driver instance
    const driverInstance = driver({
      showProgress: true,
      animate: true,
      showButtons: ['next', 'previous', 'close'],
      steps: [],
      onDestroyed: () => {
        // Mark tour as seen when it's closed
        localStorage.setItem('ak_chats_tour_seen', 'true');
        setHasSeenTour(true);
      }
    });

    setDriverObj(driverInstance);

    return () => {
      if (driverInstance) {
        driverInstance.destroy();
      }
    };
  }, [hasSeenTour]);

  // Define tour steps based on current location and device
  useEffect(() => {
    if (!driverObj || hasSeenTour) return;

    // Wait for elements to be rendered
    const timeout = setTimeout(() => {
      let steps = [];

      // Home page tour (contacts list)
      if (location === 'home') {
        if (isMobile) {
          steps = getMobileHomeSteps();
        } else {
          steps = getDesktopHomeSteps();
        }
      }
      // Chat page tour
      else if (location === 'chat') {
        if (isMobile) {
          steps = getMobileChatSteps();
        } else {
          steps = getDesktopChatSteps();
        }
      }
      // Profile page tour
      else if (location === 'profile') {
        if (isMobile) {
          steps = getMobileProfileSteps();
        } else {
          steps = getDesktopProfileSteps();
        }
      }

      if (steps.length > 0) {
        driverObj.setSteps(steps);
        driverObj.drive();
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [driverObj, location, isMobile, hasSeenTour]);

  // Mobile home page steps
  const getMobileHomeSteps = () => {
    return [
      {
        element: '.search-bar-container',
        popover: {
          title: 'Search Contacts',
          description: 'Search for your contacts by typing their name here.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: '.mobile-contact-item:first-child',
        popover: {
          title: 'Chat with Contacts',
          description: 'Tap on any contact to start chatting with them.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: '.mobile-bottom-nav',
        popover: {
          title: 'Navigation',
          description: 'Use these buttons to navigate between chats, contacts, and settings.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: '.mobile-bottom-nav-item:nth-child(2)',
        popover: {
          title: 'Add Contacts',
          description: 'Tap here to add new contacts to your list.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: '.mobile-bottom-nav-item:nth-child(3)',
        popover: {
          title: 'Settings',
          description: 'Access your profile settings and preferences here.',
          side: 'top',
          align: 'center',
        }
      }
    ];
  };

  // Desktop home page steps
  const getDesktopHomeSteps = () => {
    return [
      {
        element: '.search-bar-container',
        popover: {
          title: 'Search Contacts',
          description: 'Search for your contacts by typing their name here.',
          side: 'right',
          align: 'start',
        }
      },
      {
        element: '.mobile-contact-item:first-child',
        popover: {
          title: 'Select a Contact',
          description: 'Click on any contact to start chatting with them.',
          side: 'right',
          align: 'center',
        }
      },
      {
        element: '.tablet-sidebar-width',
        popover: {
          title: 'Contacts Panel',
          description: 'All your contacts and recent chats appear in this panel.',
          side: 'right',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Add Contact"]',
        popover: {
          title: 'Add Contacts',
          description: 'Click here to add new contacts to your list.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Settings"]',
        popover: {
          title: 'Settings',
          description: 'Access your profile settings and preferences here.',
          side: 'bottom',
          align: 'center',
        }
      }
    ];
  };

  // Mobile chat page steps
  const getMobileChatSteps = () => {
    return [
      {
        element: '.mobile-header',
        popover: {
          title: 'Chat Header',
          description: 'Shows who you\'re chatting with. Tap the back button to return to your contacts.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: '.chat-container',
        popover: {
          title: 'Messages',
          description: 'Your conversation appears here. Blue bubbles are your messages, gray bubbles are from your contact.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: '.mobile-message-input',
        popover: {
          title: 'Send Messages',
          description: 'Type your message here and tap the send button to send it.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Voice Message"]',
        popover: {
          title: 'Voice Messages',
          description: 'Tap and hold this button to record a voice message.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Send"]',
        popover: {
          title: 'Send Button',
          description: 'Tap this button to send your message.',
          side: 'left',
          align: 'center',
        }
      }
    ];
  };

  // Desktop chat page steps
  const getDesktopChatSteps = () => {
    return [
      {
        element: '.chat-header',
        popover: {
          title: 'Chat Header',
          description: 'Shows who you\'re chatting with and their online status.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: '.chat-container',
        popover: {
          title: 'Messages',
          description: 'Your conversation appears here. Blue bubbles are your messages, gray bubbles are from your contact.',
          side: 'left',
          align: 'center',
        }
      },
      {
        element: '.message-input-container',
        popover: {
          title: 'Send Messages',
          description: 'Type your message here and press Enter or click the send button to send it.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Voice Message"]',
        popover: {
          title: 'Voice Messages',
          description: 'Click and hold this button to record a voice message.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: '.chat-bubble-sent',
        popover: {
          title: 'Message Status',
          description: 'Check marks show if your message was delivered and read. Right-click on messages for more options.',
          side: 'left',
          align: 'center',
        }
      }
    ];
  };

  // Mobile profile page steps
  const getMobileProfileSteps = () => {
    return [
      {
        element: '.profile-header',
        popover: {
          title: 'Profile Settings',
          description: 'Here you can manage your profile information and app settings.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: '.profile-photo-container',
        popover: {
          title: 'Profile Photo',
          description: 'This is your profile photo that others will see.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: 'input[name="name"]',
        popover: {
          title: 'Your Name',
          description: 'You can change your display name here.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: 'button[type="submit"]',
        popover: {
          title: 'Save Changes',
          description: 'Don\'t forget to save your changes by tapping this button.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Logout"]',
        popover: {
          title: 'Logout',
          description: 'Tap here to log out of your account.',
          side: 'top',
          align: 'center',
        }
      }
    ];
  };

  // Desktop profile page steps
  const getDesktopProfileSteps = () => {
    return [
      {
        element: '.profile-header',
        popover: {
          title: 'Profile Settings',
          description: 'Here you can manage your profile information and app settings.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: '.profile-photo-container',
        popover: {
          title: 'Profile Photo',
          description: 'This is your profile photo that others will see.',
          side: 'right',
          align: 'center',
        }
      },
      {
        element: 'input[name="name"]',
        popover: {
          title: 'Your Name',
          description: 'You can change your display name here.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: 'button[type="submit"]',
        popover: {
          title: 'Save Changes',
          description: 'Don\'t forget to save your changes by clicking this button.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Logout"]',
        popover: {
          title: 'Logout',
          description: 'Click here to log out of your account.',
          side: 'top',
          align: 'center',
        }
      }
    ];
  };

  // Reset tour function (can be called from parent component)
  const resetTour = () => {
    localStorage.removeItem('ak_chats_tour_seen');
    setHasSeenTour(false);
  };

  // Component doesn't render anything visible
  return null;
};

export default AppTour;
