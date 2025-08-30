import React, { useState, useRef, useEffect, useId } from 'react';

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  success?: string;
  helperText?: string;
  variant?: 'default' | 'floating' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  error,
  success,
  helperText,
  variant = 'default',
  size = 'md',
  leftIcon,
  disabled = false,
  required = false,
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const dropdownId = id || `dropdown-${generatedId}`;

  const selectedOption = options.find(option => option.value === value);

  const sizeClasses = {
    sm: 'h-10 text-sm',
    md: 'h-12 text-sm',
    lg: 'h-14 text-base'
  };

  const baseClasses = `
    w-full rounded-xl border-2 transition-all duration-300 
    focus:outline-none focus:ring-4 focus:ring-orange-500/20
    disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
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
    pr-12
  `;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOptionSelect = (optionValue: string) => {
    if (disabled) return;
    onChange?.(optionValue);
    setIsOpen(false);
    setIsFocused(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        setIsOpen(false);
        setIsFocused(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
    }
  };

  return (
    <div className="w-full" ref={dropdownRef}>
      {label && variant !== 'floating' && (
        <label htmlFor={dropdownId} className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Floating label */}
        {label && variant === 'floating' && (
          <label
            htmlFor={dropdownId}
            className={`
              absolute left-4 transition-all duration-300 pointer-events-none z-10
              ${isFocused || value
                ? 'top-2 text-xs text-orange-600 font-medium'
                : 'top-1/2 transform -translate-y-1/2 text-gray-500'
              }
            `}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
            <div className="text-gray-400">{leftIcon}</div>
          </div>
        )}

        {/* Dropdown Button */}
        <div
          id={dropdownId}
          className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses} ${className} flex items-center justify-between`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          tabIndex={disabled ? -1 : 0}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          
          {/* Dropdown Arrow */}
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Success/Error Icons */}
        {(success || error) && (
          <div className="absolute inset-y-0 right-12 flex items-center pointer-events-none">
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

        {/* Dropdown Options */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto">
            <div className="py-1" role="listbox">
              {options.map((option) => (
                <div
                  key={option.value}
                  className={`
                    relative px-4 py-3 cursor-pointer transition-colors duration-150
                    hover:bg-orange-50 hover:text-orange-900
                    ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    ${value === option.value ? 'bg-orange-100 text-orange-900' : 'text-gray-900'}
                  `}
                  onClick={() => !option.disabled && handleOptionSelect(option.value)}
                  role="option"
                  aria-selected={value === option.value}
                >
                  <div className="flex items-center justify-between">
                    <span className="block truncate">{option.label}</span>
                    {value === option.value && (
                      <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Helper Text, Success, or Error Message */}
      {(helperText || success || error) && (
        <div className="mt-2 text-sm">
          {error && (
            <p className="text-red-600 flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </p>
          )}
          {success && (
            <p className="text-green-600 flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{success}</span>
            </p>
          )}
          {helperText && !error && !success && (
            <p className="text-gray-500">{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
};
