import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TipManager = () => {
  const [currentTip, setCurrentTip] = useState(null);
  const [tipQueue, setTipQueue] = useState([]);

  // Tips that can be shown to users
  const tips = {
    'send-message': {
      title: 'Send a Message',
      content: 'Type your message and press Enter or click the send button to send it.',
      icon: 'message'
    },
    'voice-message': {
      title: 'Voice Messages',
      content: 'Press and hold the microphone button to record a voice message. Release to send.',
      icon: 'mic'
    },
    'offline-mode': {
      title: 'Offline Mode',
      content: 'You can still send messages when offline. They\'ll be delivered when you\'re back online.',
      icon: 'wifi-off'
    },
    'search-contacts': {
      title: 'Search Contacts',
      content: 'Use the search bar to quickly find contacts in your list.',
      icon: 'search'
    },
    'message-options': {
      title: 'Message Options',
      content: 'Right-click (or long-press on mobile) on any message to see more options.',
      icon: 'more'
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
