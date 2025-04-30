import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const ReactionPicker = ({ isOpen, onClose, onSelectEmoji, position }) => {
  const pickerRef = useRef(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50"
          style={{ pointerEvents: 'none' }}
        >
          <motion.div
            ref={pickerRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute rounded-full shadow-lg p-1"
            style={{ 
              top: position.y, 
              left: position.x,
              pointerEvents: 'auto',
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              zIndex: 50
            }}
          >
            <div className="flex space-x-1">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSelectEmoji(emoji);
                    onClose();
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="text-xl">{emoji}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ReactionPicker;
