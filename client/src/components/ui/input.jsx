import React from 'react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

const Input = React.forwardRef(
  ({ className, type, ...props }, ref) => {
    useTheme(); // Use theme context to ensure component updates when theme changes

    const inputStyle = {
      backgroundColor: 'var(--bg-panel)',
      color: 'var(--text-primary)',
      borderColor: 'var(--border-color)',
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        style={inputStyle}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
