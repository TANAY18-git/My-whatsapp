import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MessageMenu = ({ isOpen, onClose, onDeleteForMe, onDeleteForEveryone, onForward, onReply, position, isSender }) => {
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
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
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute rounded-md shadow-lg"
            style={{
              top: position.y,
              left: position.x,
              pointerEvents: 'auto',
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              zIndex: 50
            }}
          >
            <div className="py-1">
              <button
                onClick={onReply}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                style={{ color: 'var(--text-primary)' }}
              >
                Reply
              </button>

              <button
                onClick={onForward}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                style={{ color: 'var(--text-primary)' }}
              >
                Forward
              </button>

              <button
                onClick={onDeleteForMe}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                style={{ color: 'var(--text-primary)' }}
              >
                Delete for me
              </button>

              {isSender && (
                <button
                  onClick={onDeleteForEveryone}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Delete for everyone
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MessageMenu;
