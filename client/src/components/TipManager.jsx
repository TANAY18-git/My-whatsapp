import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TipManager = () => {
  const [currentTip, setCurrentTip] = useState(null);
  const [tipQueue, setTipQueue] = useState([]);

  // Tips that can be shown to users
  const tips = {
    'send-message': {
      title: 'Send a Message',
      content: 'Type your message and press Enter or click the send button to send it. Messages are delivered instantly when you\'re online.',
      icon: 'message'
    },
    'voice-message': {
      title: 'Voice Messages',
      content: 'Press and hold the microphone button to record a voice message. Release to send. Voice messages are perfect when you have a lot to say.',
      icon: 'mic'
    },
    'offline-mode': {
      title: 'Offline Mode',
      content: 'You can still send messages when offline. They\'ll be delivered automatically when you\'re back online. No need to resend them manually.',
      icon: 'wifi-off'
    },
    'search-contacts': {
      title: 'Search Contacts',
      content: 'Use the search bar to quickly find contacts in your list. You can search by name to find people faster.',
      icon: 'search'
    },
    'message-options': {
      title: 'Message Options',
      content: 'Right-click (or long-press on mobile) on any message to see options like delete, forward, or reply to specific messages.',
      icon: 'more'
    },
    'add-contact': {
      title: 'Add New Contact',
      content: 'To add a new contact, click the "Add Contact" button and enter their username. They\'ll need to accept your request.',
      icon: 'user-plus'
    },
    'create-group': {
      title: 'Create Group Chat',
      content: 'Create a group chat by clicking the "Create Group" button. Select multiple contacts and give your group a name.',
      icon: 'users'
    },
    'profile-settings': {
      title: 'Profile Settings',
      content: 'Update your profile information in Settings. You can change your username, password, and notification preferences.',
      icon: 'settings'
    },
    'message-status': {
      title: 'Message Status',
      content: 'One check mark means your message was sent, two check marks mean it was delivered, and blue check marks mean it was read.',
      icon: 'check'
    },
    'notifications': {
      title: 'Notifications',
      content: 'You\'ll receive notifications for new messages even when the app is closed. Click on a notification to open the conversation.',
      icon: 'bell'
    }
  };

  // Initialize tip tracking in localStorage
  useEffect(() => {
    const tipsShown = localStorage.getItem('ak_chats_tips_shown');
    if (!tipsShown) {
      localStorage.setItem('ak_chats_tips_shown', JSON.stringify({}));
    }
  }, []);

  // Show a tip
  const showTip = (tipId) => {
    // Check if this tip has been shown before
    const tipsShown = JSON.parse(localStorage.getItem('ak_chats_tips_shown') || '{}');

    if (!tipsShown[tipId]) {
      // Add tip to queue
      setTipQueue(prev => [...prev, tipId]);

      // Mark tip as shown
      tipsShown[tipId] = true;
      localStorage.setItem('ak_chats_tips_shown', JSON.stringify(tipsShown));
    }
  };

  // Process the tip queue
  useEffect(() => {
    if (tipQueue.length > 0 && !currentTip) {
      // Get the next tip from the queue
      const nextTipId = tipQueue[0];
      setCurrentTip(tips[nextTipId]);

      // Remove this tip from the queue
      setTipQueue(prev => prev.slice(1));

      // Auto-hide the tip after 5 seconds
      const timer = setTimeout(() => {
        setCurrentTip(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [tipQueue, currentTip, tips]);

  // Reset all tips (for testing)
  const resetTips = () => {
    localStorage.setItem('ak_chats_tips_shown', JSON.stringify({}));
  };

  // Attach the showTip function to the window for global access
  useEffect(() => {
    window.showTip = showTip;
    window.resetTips = resetTips;

    return () => {
      delete window.showTip;
      delete window.resetTips;
    };
  }, []);

  // Render the current tip
  return (
    <AnimatePresence>
      {currentTip && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 bg-white rounded-lg shadow-lg p-4 max-w-xs w-full flex items-start"
        >
          <div className="mr-3 mt-1 text-blue-500">
            {currentTip.icon === 'message' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            )}
            {currentTip.icon === 'mic' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
            {currentTip.icon === 'wifi-off' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {currentTip.icon === 'search' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            {currentTip.icon === 'more' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            )}
            {currentTip.icon === 'user-plus' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            )}
            {currentTip.icon === 'users' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
            {currentTip.icon === 'settings' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
            {currentTip.icon === 'check' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {currentTip.icon === 'bell' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">{currentTip.title}</h3>
            <p className="text-gray-600 text-xs mt-1">{currentTip.content}</p>
          </div>
          <button
            onClick={() => setCurrentTip(null)}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TipManager;
