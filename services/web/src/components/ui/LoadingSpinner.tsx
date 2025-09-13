import React, { memo } from 'react';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'gray' | 'success' | 'warning' | 'error';
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars' | 'ring';
  className?: string;
  text?: string;
  textPosition?: 'bottom' | 'right';
}

// Memoized component to prevent unnecessary re-renders
export const LoadingSpinner = memo<LoadingSpinnerProps>(({
  size = 'md',
  color = 'primary',
  variant = 'spinner',
  className = '',
  text,
  textPosition = 'bottom'
}) => {
  // Size configurations for optimal visual hierarchy
  const sizeConfig = {
    xs: { spinner: 'w-3 h-3', text: 'text-xs', spacing: 'space-y-1 space-x-1' },
    sm: { spinner: 'w-4 h-4', text: 'text-xs', spacing: 'space-y-1 space-x-1' },
    md: { spinner: 'w-6 h-6', text: 'text-sm', spacing: 'space-y-2 space-x-2' },
    lg: { spinner: 'w-8 h-8', text: 'text-base', spacing: 'space-y-2 space-x-2' },
    xl: { spinner: 'w-12 h-12', text: 'text-lg', spacing: 'space-y-3 space-x-3' }
  };

  // Color configurations matching the design system
  const colorConfig = {
    primary: 'border-orange-500 text-orange-500',
    secondary: 'border-purple-500 text-purple-500',
    white: 'border-white text-white',
    gray: 'border-gray-400 text-gray-400',
    success: 'border-green-500 text-green-500',
    warning: 'border-yellow-500 text-yellow-500',
    error: 'border-red-500 text-red-500'
  };

  const { spinner: spinnerSize, text: textSize, spacing } = sizeConfig[size];
  const colorClass = colorConfig[color];

  // Render different variants for visual variety
  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className={`flex ${spacing.split(' ')[2]} items-center`}>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`${spinnerSize} rounded-full ${colorClass.split(' ')[1]} animate-bounce`}
                style={{
                  backgroundColor: 'currentColor',
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.6s'
                }}
              />
            ))}
          </div>
        );

      case 'pulse':
        return (
          <div className={`${spinnerSize} rounded-full ${colorClass.split(' ')[1]} animate-pulse`} 
               style={{ backgroundColor: 'currentColor' }} />
        );

      case 'bars':
        return (
          <div className={`flex items-end ${spacing.split(' ')[2]}`} style={{ height: spinnerSize.split(' ')[1] }}>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`w-1 ${colorClass.split(' ')[1]} animate-pulse`}
                style={{
                  height: `${25 + i * 25}%`,
                  backgroundColor: 'currentColor',
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        );

      case 'ring':
        return (
          <div className={`${spinnerSize} relative`}>
            <div className={`absolute inset-0 rounded-full border-2 ${colorClass.split(' ')[0]} opacity-25`} />
            <div className={`absolute inset-0 rounded-full border-2 ${colorClass.split(' ')[0]} border-t-transparent animate-spin`} />
          </div>
        );

      case 'spinner':
      default:
        return (
          <div 
            className={`${spinnerSize} border-2 ${colorClass.split(' ')[0]} border-t-transparent rounded-full animate-spin`}
            role="status"
            aria-label="Loading"
          />
        );
    }
  };

  // Container with proper layout
  const containerClass = `
    flex items-center justify-center
    ${textPosition === 'right' ? 'flex-row' : 'flex-col'}
    ${text ? spacing.split(' ')[textPosition === 'right' ? 2 : 1] : ''}
    ${colorClass.split(' ')[1]}
    ${className}
  `.trim();

  return (
    <div className={containerClass}>
      {renderSpinner()}
      {text && (
        <span className={`${textSize} font-medium animate-pulse`}>
          {text}
        </span>
      )}
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

// Pre-configured loading components for common use cases
export const PageLoader = memo(() => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <LoadingSpinner 
      size="xl" 
      color="primary" 
      variant="ring" 
      text="Loading..." 
      className="text-center"
    />
  </div>
));

export const InlineLoader = memo(({ text = 'Loading...' }: { text?: string }) => (
  <LoadingSpinner 
    size="sm" 
    color="primary" 
    variant="spinner" 
    text={text} 
    textPosition="right"
  />
));

export const ButtonLoader = memo(() => (
  <LoadingSpinner 
    size="sm" 
    color="white" 
    variant="spinner"
  />
));

PageLoader.displayName = 'PageLoader';
InlineLoader.displayName = 'InlineLoader';
ButtonLoader.displayName = 'ButtonLoader';

export default LoadingSpinner;