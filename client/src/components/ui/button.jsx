import React from 'react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => {
    useTheme(); // Use theme context to ensure component updates when theme changes

    const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      default: "bg-primary text-white hover:bg-dark",
      secondary: "bg-secondary text-white hover:bg-primary",
      outline: "border hover:text-white",
      ghost: "hover:text-white",
      link: "underline-offset-4 hover:underline text-primary",
    };

    const sizes = {
      default: "h-10 py-2 px-4",
      sm: "h-9 px-3 rounded-md",
      lg: "h-11 px-8 rounded-md",
      icon: "h-10 w-10",
    };

    // Custom styles for dark mode
    const getButtonStyle = () => {
      if (variant === 'outline') {
        return {
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        };
      }
      return {};
    };

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        style={getButtonStyle()}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
