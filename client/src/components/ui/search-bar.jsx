import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Input } from './input';

const SearchBar = ({ value, onChange, onClose, placeholder = "Search messages..." }) => {
  const inputRef = useRef(null);

  // Auto-focus the input when the search bar appears
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none"
        animate={{ scale: value ? 0.9 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" style={{ color: '#0A85FF' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </motion.div>
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="pl-12 pr-12 py-3 mobile-touch-target rounded-full transition-all duration-200"
        style={{
          height: '48px',
          boxShadow: value ? '0 4px 12px rgba(10, 133, 255, 0.15)' : '0 2px 8px rgba(0,0,0,0.08)',
          backgroundColor: 'white',
          fontSize: '16px',
          borderColor: value ? '#0A85FF' : 'transparent'
        }}
      />
      {value && (
        <motion.button
          onClick={onClose}
          className="absolute inset-y-0 right-0 flex items-center pr-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          <div className="bg-gray-200 hover:bg-gray-300 transition-colors duration-200 rounded-full p-1.5 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" style={{ color: '#666' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        </motion.button>
      )}
    </motion.div>
  );
};

export default SearchBar;
