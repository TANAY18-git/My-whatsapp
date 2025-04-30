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
          description: 'Search for your contacts by typing their name here. This helps you quickly find people in your contact list.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: '.mobile-contact-item:first-child',
        popover: {
          title: 'Chat with Contacts',
          description: 'Tap on any contact to start or continue a conversation with them. Your recent chats will appear at the top of this list.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: '.mobile-bottom-nav',
        popover: {
          title: 'Navigation Bar',
          description: 'This bottom navigation bar gives you access to all main features of the app. You can access chats, add contacts, create groups, and access settings.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: '.mobile-bottom-nav-item:nth-child(2)',
        popover: {
          title: 'Contact Requests',
          description: 'Tap here to view and manage your contact requests. When someone wants to add you as a contact, you\'ll see a notification here.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: '.mobile-bottom-nav-item:nth-child(3)',
        popover: {
          title: 'Create New Group',
          description: 'Tap here to create a new group chat. You can select multiple contacts to add to your group and give it a name.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Add Contact"]',
        popover: {
          title: 'Add New Contact',
          description: 'Tap this button to add a new contact. You\'ll need to enter their username to send them a contact request.',
          side: 'left',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Settings"]',
        popover: {
          title: 'Profile Settings',
          description: 'Access your profile settings here. You can change your username, manage your account, and log out from this screen.',
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
          description: 'Search for your contacts by typing their name here. This helps you quickly find people in your contact list.',
          side: 'right',
          align: 'start',
        }
      },
      {
        element: '.mobile-contact-item:first-child',
        popover: {
          title: 'Select a Contact',
          description: 'Click on any contact to start or continue a conversation with them. Your recent chats will appear at the top of this list.',
          side: 'right',
          align: 'center',
        }
      },
      {
        element: '.tablet-sidebar-width',
        popover: {
          title: 'Contacts Panel',
          description: 'All your contacts and recent chats appear in this panel. The sidebar stays visible on desktop, allowing you to quickly switch between conversations.',
          side: 'right',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Add Contact"]',
        popover: {
          title: 'Add New Contact',
          description: 'Click here to add a new contact. You\'ll need to enter their username to send them a contact request. Once they accept, you can start chatting.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Create Group"]',
        popover: {
          title: 'Create New Group',
          description: 'Click here to create a new group chat. You can select multiple contacts to add to your group and give it a name.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Contact Requests"]',
        popover: {
          title: 'Contact Requests',
          description: 'Click here to view and manage your contact requests. When someone wants to add you as a contact, you\'ll see a notification here.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Settings"]',
        popover: {
          title: 'Profile Settings',
          description: 'Access your profile settings here. You can change your username, manage your account, and log out from this screen.',
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
          description: 'Shows who you\'re chatting with. Tap the back button to return to your contacts list. You can also see if the person is online or offline.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: '.chat-container',
        popover: {
          title: 'Messages Area',
          description: 'Your conversation appears here. Blue bubbles are your messages, gray bubbles are from your contact. Messages are end-to-end encrypted for privacy.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: '.chat-bubble-sent',
        popover: {
          title: 'Message Status',
          description: 'Check marks show if your message was delivered and read. One check means sent, two blue checks mean read. Long-press on any message for more options.',
          side: 'left',
          align: 'center',
        }
      },
      {
        element: '.mobile-message-input',
        popover: {
          title: 'Message Input',
          description: 'Type your message here and tap the send button to send it. You can send text messages even when offline - they\'ll be delivered when you reconnect.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Voice Message"]',
        popover: {
          title: 'Voice Messages',
          description: 'Tap this button to record a voice message. You can record and send voice notes instead of typing text messages.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Send"]',
        popover: {
          title: 'Send Button',
          description: 'Tap this button to send your message. The button will be disabled until you type something.',
          side: 'left',
          align: 'center',
        }
      },
      {
        popover: {
          title: 'Message Options',
          description: 'Long-press on any message to see options like delete, forward, or reply. You can delete messages for yourself or for everyone.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Search"]',
        popover: {
          title: 'Search in Chat',
          description: 'Tap this button to search for specific messages within this conversation. Useful for finding important information in long chats.',
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
          description: 'Shows who you\'re chatting with and their online status. On desktop, you can right-click this area to access chat options.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: '.chat-container',
        popover: {
          title: 'Messages Area',
          description: 'Your conversation appears here. Blue bubbles are your messages, gray bubbles are from your contact. Messages are end-to-end encrypted for privacy.',
          side: 'left',
          align: 'center',
        }
      },
      {
        element: '.chat-bubble-sent',
        popover: {
          title: 'Message Status',
          description: 'Check marks show if your message was delivered and read. One check means sent, two blue checks mean read. Right-click on any message for more options.',
          side: 'left',
          align: 'center',
        }
      },
      {
        element: '.message-input-container',
        popover: {
          title: 'Message Input',
          description: 'Type your message here and press Enter or click the send button to send it. You can send text messages even when offline - they\'ll be delivered when you reconnect.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Voice Message"]',
        popover: {
          title: 'Voice Messages',
          description: 'Click this button to record a voice message. You can record and send voice notes instead of typing text messages.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Send"]',
        popover: {
          title: 'Send Button',
          description: 'Click this button to send your message. You can also press Enter on your keyboard to send.',
          side: 'left',
          align: 'center',
        }
      },
      {
        popover: {
          title: 'Message Options',
          description: 'Right-click on any message to see options like delete, forward, or reply. You can delete messages for yourself or for everyone.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Search"]',
        popover: {
          title: 'Search in Chat',
          description: 'Click this button to search for specific messages within this conversation. Useful for finding important information in long chats.',
          side: 'left',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Add Reaction"]',
        popover: {
          title: 'Message Reactions',
          description: 'Click this button to add emoji reactions to messages. You can see who reacted to a message by hovering over the reaction.',
          side: 'bottom',
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
          description: 'Here you can manage your profile information and app settings. This is where you can customize your account.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: '.profile-photo-container',
        popover: {
          title: 'Profile Photo',
          description: 'This is your profile photo that others will see. Your profile photo helps your contacts identify you.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: 'input[name="name"]',
        popover: {
          title: 'Change Username',
          description: 'You can change your display name here. This is the name that will be visible to your contacts.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: 'input[name="password"]',
        popover: {
          title: 'Change Password',
          description: 'You can update your password here for better security. Make sure to use a strong, unique password.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: 'button[type="submit"]',
        popover: {
          title: 'Save Changes',
          description: 'Don\'t forget to save your changes by tapping this button. Your updated profile information will be visible to your contacts immediately.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: '.notification-settings',
        popover: {
          title: 'Notification Settings',
          description: 'Manage your notification preferences here. You can control how you receive alerts for new messages.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: '.privacy-settings',
        popover: {
          title: 'Privacy Settings',
          description: 'Control your privacy settings here. You can manage who can see your information and contact you.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Logout"]',
        popover: {
          title: 'Logout',
          description: 'Tap here to log out of your account. You\'ll need to enter your username and password to log back in.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Back"]',
        popover: {
          title: 'Return to Chats',
          description: 'Tap this button to go back to your chats without making any changes to your profile.',
          side: 'bottom',
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
          description: 'Here you can manage your profile information and app settings. This is where you can customize your account.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: '.profile-photo-container',
        popover: {
          title: 'Profile Photo',
          description: 'This is your profile photo that others will see. Your profile photo helps your contacts identify you.',
          side: 'right',
          align: 'center',
        }
      },
      {
        element: 'input[name="name"]',
        popover: {
          title: 'Change Username',
          description: 'You can change your display name here. This is the name that will be visible to your contacts.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: 'input[name="password"]',
        popover: {
          title: 'Change Password',
          description: 'You can update your password here for better security. Make sure to use a strong, unique password.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: 'button[type="submit"]',
        popover: {
          title: 'Save Changes',
          description: 'Don\'t forget to save your changes by clicking this button. Your updated profile information will be visible to your contacts immediately.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: '.notification-settings',
        popover: {
          title: 'Notification Settings',
          description: 'Manage your notification preferences here. You can control how you receive alerts for new messages.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: '.privacy-settings',
        popover: {
          title: 'Privacy Settings',
          description: 'Control your privacy settings here. You can manage who can see your information and contact you.',
          side: 'bottom',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Logout"]',
        popover: {
          title: 'Logout',
          description: 'Click here to log out of your account. You\'ll need to enter your username and password to log back in.',
          side: 'top',
          align: 'center',
        }
      },
      {
        element: 'button[aria-label="Back"]',
        popover: {
          title: 'Return to Chats',
          description: 'Click this button to go back to your chats without making any changes to your profile.',
          side: 'bottom',
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
