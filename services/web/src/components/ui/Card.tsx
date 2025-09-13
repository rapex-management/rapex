import React, { memo, useMemo } from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'elevated' | 'outlined' | 'glass' | 'gradient';
  hover?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = memo(({
  children,
  className = '',
  padding = 'md',
  variant = 'default',
  hover = false,
  loading = false,
  onClick
}) => {
  // Memoized padding classes
  const paddingClasses = useMemo(() => ({
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  }), []);

  // Memoized variant classes for different visual styles
  const variantClasses = useMemo(() => ({
    default: 'bg-white border border-gray-200 shadow-sm',
    elevated: 'bg-white border border-gray-100 shadow-lg hover:shadow-xl',
    outlined: 'bg-white border-2 border-gray-300 shadow-none hover:border-orange-300',
    glass: 'bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-lg',
    gradient: 'bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-md'
  }), []);

  // Memoized final className
  const cardClasses = useMemo(() => {
    const baseClasses = 'rounded-xl transition-all duration-300 ease-in-out';
    const variantClass = variantClasses[variant];
    const paddingClass = paddingClasses[padding];
    const interactiveClasses = onClick || hover ? 'cursor-pointer hover:transform hover:scale-[1.02] hover:shadow-lg' : '';
    const loadingClass = loading ? 'animate-pulse pointer-events-none' : '';
    
    return `${baseClasses} ${variantClass} ${paddingClass} ${interactiveClasses} ${loadingClass} ${className}`.trim();
  }, [variant, padding, onClick, hover, loading, className, variantClasses, paddingClasses]);

  return (
    <div className={cardClasses} onClick={onClick}>
      {loading ? (
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
        </div>
      ) : (
        children
      )}
    </div>
  );
});

Card.displayName = 'Card';

// Pre-configured card variants for common use cases
export const StatsCard = memo<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  loading?: boolean;
}>(({ title, value, icon, trend, loading }) => (
  <Card variant="elevated" hover className="group">
    {loading ? (
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
        <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
      </div>
    ) : (
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-primary-soft rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <div className="text-white">{icon}</div>
          </div>
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-baseline">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend && (
              <span className={`ml-2 text-sm font-medium ${
                trend.positive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.positive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
        </div>
      </div>
    )}
  </Card>
));

StatsCard.displayName = 'StatsCard';

export const ActionCard = memo<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  loading?: boolean;
}>(({ title, description, icon, onClick, color = 'blue', loading }) => {
  const colorClasses = {
    blue: 'bg-blue-500 hover:bg-blue-600',
    green: 'bg-green-500 hover:bg-green-600',
    purple: 'bg-purple-500 hover:bg-purple-600',
    orange: 'bg-gradient-primary hover:shadow-lg',
    red: 'bg-red-500 hover:bg-red-600'
  };

  return (
    <Card 
      onClick={loading ? undefined : onClick} 
      hover={!loading}
      className={`${colorClasses[color]} text-white cursor-pointer group ${loading ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <div className="text-center py-4">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : (
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-white/90 text-sm">{description}</p>
        </div>
      )}
    </Card>
  );
});

ActionCard.displayName = 'ActionCard';
