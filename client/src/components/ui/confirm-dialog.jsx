import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './button';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-lg shadow-xl p-6"
            style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)' }}
          >
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h3>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              {message}
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={onConfirm}>
                Confirm
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
