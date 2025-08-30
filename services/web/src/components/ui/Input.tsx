import React, { useState, useId } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  success?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
  variant?: 'default' | 'floating' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  success,
  leftIcon,
  rightIcon,
  helperText,
  variant = 'default',
  size = 'md',
  className = '',
  id,
  type = 'text',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId();
  const inputId = id || `input-${generatedId}`;

  const sizeClasses = {
    sm: 'h-10 text-sm',
    md: 'h-12 text-sm',
    lg: 'h-14 text-base'
  };

  const baseClasses = `
    w-full rounded-xl border-2 transition-all duration-300 
    focus:outline-none focus:ring-4 focus:ring-orange-500/20
    disabled:opacity-50 disabled:cursor-not-allowed
    ${sizeClasses[size]}
  `;

  const variantClasses = {
    default: `
      bg-gray-50/50 border-gray-200 
      hover:border-gray-300 hover:bg-gray-50
      focus:border-orange-500 focus:bg-white
      ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 bg-red-50/30' : ''}
      ${success ? 'border-green-400 focus:border-green-500 focus:ring-green-500/20 bg-green-50/30' : ''}
    `,
    floating: `
      bg-transparent border-gray-300 
      hover:border-gray-400
      focus:border-orange-500
      ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}
      ${success ? 'border-green-400 focus:border-green-500 focus:ring-green-500/20' : ''}
    `,
    outlined: `
      bg-white border-gray-300 shadow-sm
      hover:border-gray-400 hover:shadow-md
      focus:border-orange-500 focus:shadow-lg
      ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 shadow-red-100' : ''}
      ${success ? 'border-green-400 focus:border-green-500 focus:ring-green-500/20 shadow-green-100' : ''}
    `
  };

  const paddingClasses = `
    ${leftIcon ? 'pl-12' : 'pl-4'}
    ${rightIcon || type === 'password' ? 'pr-12' : 'pr-4'}
  `;

  return (
    <div className="w-full">
      {label && variant !== 'floating' && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Floating label */}
        {label && variant === 'floating' && (
          <label
            htmlFor={inputId}
            className={`
              absolute left-4 transition-all duration-300 pointer-events-none
              ${isFocused || props.value || props.defaultValue
                ? 'top-2 text-xs text-orange-600 font-medium'
                : 'top-1/2 transform -translate-y-1/2 text-gray-500'
              }
            `}
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
            <div className="text-gray-400">{leftIcon}</div>
          </div>
        )}

        {/* Input Field */}
        <input
          id={inputId}
          type={type === 'password' ? (showPassword ? 'text' : 'password') : type}
          className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses} ${className}`}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />

        {/* Right Icon or Password Toggle */}
        {(rightIcon || type === 'password') && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            {type === 'password' ? (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            ) : (
              <div className="text-gray-400">{rightIcon}</div>
            )}
          </div>
        )}

        {/* Success/Error Icons */}
        {(success || error) && !rightIcon && type !== 'password' && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            {success && (
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {error && (
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Helper Text, Success, or Error Message */}
      {(helperText || success || error) && (
        <div className="mt-2 text-sm">
          {error && <p className="text-red-600 flex items-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </p>}
          {success && <p className="text-green-600 flex items-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{success}</span>
          </p>}
          {helperText && !error && !success && <p className="text-gray-500">{helperText}</p>}
        </div>
      )}
    </div>
  );
};
