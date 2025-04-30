import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Always use dark theme
  const [theme, setTheme] = useState('dark');

  // Update theme attribute on document and save to localStorage when theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('whatsapp_theme', 'dark');
  }, []);

  // Toggle function is kept for compatibility but does nothing
  const toggleTheme = () => {
    // Do nothing - theme is permanently set to dark
    console.log('Theme toggle attempted, but theme is permanently set to dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
