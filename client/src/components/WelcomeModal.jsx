import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WelcomeModal = ({ onStartTour, onSkipTour }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if this is the first time the user is visiting
    const hasVisitedBefore = localStorage.getItem('ak_chats_visited');

    if (!hasVisitedBefore) {
      // Show the welcome modal after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('ak_chats_visited', 'true');

    if (onSkipTour) {
      onSkipTour();
    }
  };

  const handleStartTour = () => {
    setIsVisible(false);
    localStorage.setItem('ak_chats_visited', 'true');

    if (onStartTour) {
      onStartTour();
    }
  };

  const handleNext = () => {
    if (currentStep < welcomeSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleStartTour();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const welcomeSteps = [
    {
      title: "Welcome to AK Chats!",
      description: "Thank you for joining our messaging platform. We've designed this app to be simple, secure, and reliable for all your communication needs.",
      image: "/new-logo.jpg"
    },
    {
      title: "Chat with Anyone",
      description: "Connect with friends and family by adding them as contacts. Send text messages, voice notes, and create group chats for team discussions.",
      image: "/chat-logo.png"
    },
    {
      title: "Works Offline",
      description: "AK Chats works even when you're offline. Your messages will be stored locally and sent automatically when you're back online.",
      image: "/logo.png"
    },
    {
      title: "Secure Messaging",
      description: "Your privacy matters to us. All messages are encrypted and can only be seen by you and the people you're chatting with.",
      image: "/chat-logo.png"
    },
    {
      title: "Customize Your Profile",
      description: "Set up your profile with a username that your contacts will recognize. You can update your profile information at any time.",
      image: "/logo.png"
    },
    {
      title: "Ready to Start?",
      description: "Let's take a quick tour of the app to help you get familiar with all the features. We'll show you how to use everything step by step.",
      image: "/new-logo.jpg"
    }
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
          >
            {/* Welcome content */}
            <div className="p-6">
              <div className="flex justify-center mb-6">
                <img
                  src={welcomeSteps[currentStep].image}
                  alt="AK Chats Logo"
                  className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
                />
              </div>

              <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
                {welcomeSteps[currentStep].title}
              </h2>

              <p className="text-center text-gray-600 mb-6">
                {welcomeSteps[currentStep].description}
              </p>

              {/* Progress dots */}
              <div className="flex justify-center space-x-2 mb-6">
                {welcomeSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentStep ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              {/* Buttons */}
              <div className="flex justify-between">
                {currentStep > 0 ? (
                  <button
                    onClick={handlePrevious}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Back
                  </button>
                ) : (
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Skip
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                >
                  {currentStep < welcomeSteps.length - 1 ? 'Next' : 'Start Tour'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeModal;
