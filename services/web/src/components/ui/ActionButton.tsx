import React, { memo } from 'react';
import { Button } from './Button';

export type ActionType = 'view' | 'edit' | 'duplicate' | 'delete';

interface ActionButtonProps {
  action: ActionType;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
  showLabel?: boolean;
}

const actionConfig: Record<ActionType, {
  icon: React.ReactNode;
  label: string;
  variant: 'outline' | 'ghost' | 'danger' | 'primary' | 'secondary';
  color: string;
  hoverColor: string;
}> = {
  view: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    label: 'View',
    variant: 'outline',
    color: 'text-blue-600',
    hoverColor: 'hover:text-blue-700 hover:bg-blue-50'
  },
  edit: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    label: 'Edit',
    variant: 'outline',
    color: 'text-green-600',
    hoverColor: 'hover:text-green-700 hover:bg-green-50'
  },
  duplicate: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    label: 'Duplicate',
    variant: 'outline',
    color: 'text-purple-600',
    hoverColor: 'hover:text-purple-700 hover:bg-purple-50'
  },
  delete: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    label: 'Delete',
    variant: 'danger',
    color: 'text-red-600',
    hoverColor: 'hover:text-red-700 hover:bg-red-50'
  }
};

export const ActionButton: React.FC<ActionButtonProps> = memo(({
  action,
  onClick,
  isLoading = false,
  disabled = false,
  size = 'sm',
  tooltip,
  showLabel = false
}) => {
  const config = actionConfig[action];
  
  if (showLabel) {
    return (
      <Button
        variant={config.variant}
        size={size}
        onClick={onClick}
        disabled={disabled || isLoading}
        isLoading={isLoading}
        leftIcon={config.icon}
        title={tooltip || config.label}
        className="min-w-0"
      >
        {config.label}
      </Button>
    );
  }

  // Icon-only button with custom styling for better performance
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      title={tooltip || config.label}
      className={`
        relative inline-flex items-center justify-center
        p-2 rounded-lg border border-gray-200
        transition-all duration-200 ease-in-out
        ${config.color} ${config.hoverColor}
        hover:border-current hover:shadow-md
        focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-20
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent
        disabled:hover:border-gray-200 disabled:hover:text-gray-400
        ${size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-10 h-10' : 'w-12 h-12'}
      `}
      aria-label={config.label}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        config.icon
      )}
    </button>
  );
});

ActionButton.displayName = 'ActionButton';

// Combined action buttons group for consistent spacing and layout
interface ActionButtonsGroupProps {
  productId: string;
  onAction: (action: ActionType, productId: string) => void;
  isLoading?: boolean;
  loadingActions?: Set<string>;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

export const ActionButtonsGroup: React.FC<ActionButtonsGroupProps> = memo(({
  productId,
  onAction,
  isLoading = false,
  loadingActions = new Set(),
  size = 'sm',
  showLabels = false
}) => {
  const actions: ActionType[] = ['view', 'edit', 'duplicate', 'delete'];
  const isProductLoading = loadingActions.has(productId);

  return (
    <div className={`flex items-center ${showLabels ? 'space-x-2' : 'space-x-1'}`}>
      {actions.map((action) => (
        <ActionButton
          key={action}
          action={action}
          onClick={() => onAction(action, productId)}
          isLoading={isProductLoading && isLoading}
          disabled={isLoading || isProductLoading}
          size={size}
          showLabel={showLabels}
        />
      ))}
    </div>
  );
});

ActionButtonsGroup.displayName = 'ActionButtonsGroup';