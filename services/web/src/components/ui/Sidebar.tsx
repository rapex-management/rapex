import React, { useState, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  children?: SidebarItem[];
}

interface SidebarProps {
  items: SidebarItem[];
  userInfo: {
    name: string;
    email: string;
    role: string;
  };
  onLogout: () => void;
}

// Memoized individual sidebar item component for better performance
const SidebarItemComponent = memo<{
  item: SidebarItem;
  level: number;
  isExpanded: boolean;
  isActive: boolean;
  isCollapsed: boolean;
  onToggleExpanded: (itemId: string) => void;
}>(({ item, level, isExpanded, isActive, isCollapsed, onToggleExpanded }) => {
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = useCallback(() => {
    if (hasChildren) {
      onToggleExpanded(item.id);
    }
  }, [hasChildren, item.id, onToggleExpanded]);

  // Memoized class names to prevent recalculation
  const itemClasses = useMemo(() => `
    sidebar-item 
    ${isActive ? 'active bg-gradient-primary-soft text-white shadow-md' : 'hover:bg-gray-50'} 
    ${level > 0 ? 'ml-4 pl-4 border-l border-gray-200' : ''}
    ${hasChildren ? 'cursor-pointer' : ''}
    flex items-center px-3 py-2 rounded-lg transition-all duration-200 ease-in-out
    ${isActive ? 'transform scale-[1.02]' : 'hover:transform hover:scale-[1.01]'}
  `.trim(), [isActive, level, hasChildren]);

  const iconClasses = useMemo(() => `
    flex-shrink-0 transition-colors duration-200
    ${isActive ? 'text-white' : 'text-gray-500'}
  `.trim(), [isActive]);

  const labelClasses = useMemo(() => `
    ml-3 flex-1 font-medium transition-colors duration-200
    ${isActive ? 'text-white' : 'text-gray-700'}
  `.trim(), [isActive]);

  return (
    <div>
      {item.href ? (
        <Link href={item.href} className="block">
          <div className={itemClasses}>
            <span className={iconClasses}>{item.icon}</span>
            {!isCollapsed && (
              <span className={labelClasses}>{item.label}</span>
            )}
          </div>
        </Link>
      ) : (
        <div onClick={handleClick} className={itemClasses}>
          <span className={iconClasses}>{item.icon}</span>
          {!isCollapsed && (
            <>
              <span className={labelClasses}>{item.label}</span>
              {hasChildren && (
                <svg 
                  className={`w-4 h-4 transition-all duration-200 ${
                    isExpanded ? 'rotate-90 text-orange-500' : 'text-gray-400'
                  }`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </>
          )}
        </div>
      )}
      
      {hasChildren && isExpanded && !isCollapsed && (
        <div className="mt-1 space-y-1 animate-fadeIn">
          {item.children!.map(child => (
            <SidebarItemWrapper 
              key={child.id} 
              item={child} 
              level={level + 1}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
});

SidebarItemComponent.displayName = 'SidebarItemComponent';

// Wrapper component to handle expanded state and active route checking
const SidebarItemWrapper = memo<{
  item: SidebarItem;
  level: number;
  onToggleExpanded: (itemId: string) => void;
}>(({ item, level, onToggleExpanded }) => {
  const router = useRouter();
  
  // Memoized active route check
  const isActive = useMemo(() => {
    if (!item.href) return false;
    return router.asPath === item.href || router.asPath.startsWith(item.href + '/');
  }, [item.href, router.asPath]);

  // Get expanded state from context or parent - for now we'll use a simple approach
  // In a real implementation, you might want to use React Context for this
  const [localExpanded, setLocalExpanded] = useState<string[]>([]);
  const isExpanded = localExpanded.includes(item.id);

  const handleToggle = useCallback((itemId: string) => {
    setLocalExpanded(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
    onToggleExpanded(itemId);
  }, [onToggleExpanded]);

  return (
    <SidebarItemComponent
      item={item}
      level={level}
      isExpanded={isExpanded}
      isActive={isActive}
      isCollapsed={false} // Will be passed from parent
      onToggleExpanded={handleToggle}
    />
  );
});

SidebarItemWrapper.displayName = 'SidebarItemWrapper';

export const Sidebar: React.FC<SidebarProps> = memo(({ items, userInfo, onLogout }) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();

  // Memoized callbacks for better performance
  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const handleLogout = useCallback(() => {
    onLogout();
  }, [onLogout]);

  // Memoized active route checker
  const isActiveRoute = useCallback((href: string) => {
    return router.asPath === href || router.asPath.startsWith(href + '/');
  }, [router.asPath]);

  // Memoized user initials
  const userInitials = useMemo(() => {
    return userInfo.name.charAt(0).toUpperCase();
  }, [userInfo.name]);

  // Optimized sidebar item renderer with memoization
  const renderSidebarItem = useCallback((item: SidebarItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isActive = item.href && isActiveRoute(item.href);

    const itemClasses = `
      sidebar-item transition-all duration-200 ease-in-out
      ${isActive ? 'active bg-gradient-primary-soft text-white shadow-md transform scale-[1.02]' : 'hover:bg-gray-50 hover:transform hover:scale-[1.01]'} 
      ${level > 0 ? 'ml-4 pl-4 border-l border-gray-200' : ''}
      ${hasChildren ? 'cursor-pointer' : ''}
      flex items-center px-3 py-2 rounded-lg group
    `.trim();

    const iconClasses = `
      flex-shrink-0 transition-colors duration-200
      ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}
    `.trim();

    const labelClasses = `
      ml-3 flex-1 font-medium transition-colors duration-200
      ${isActive ? 'text-white' : 'text-gray-700'}
    `.trim();

    return (
      <div key={item.id}>
        {item.href ? (
          <Link href={item.href} className="block">
            <div className={itemClasses}>
              <span className={iconClasses}>{item.icon}</span>
              {!isCollapsed && (
                <span className={labelClasses}>{item.label}</span>
              )}
            </div>
          </Link>
        ) : (
          <div
            onClick={() => hasChildren && toggleExpanded(item.id)}
            className={itemClasses}
          >
            <span className={iconClasses}>{item.icon}</span>
            {!isCollapsed && (
              <>
                <span className={labelClasses}>{item.label}</span>
                {hasChildren && (
                  <svg 
                    className={`w-4 h-4 transition-all duration-200 ${
                      isExpanded ? 'rotate-90 text-orange-500' : 'text-gray-400 group-hover:text-gray-600'
                    }`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </>
            )}
          </div>
        )}
        
        {hasChildren && isExpanded && !isCollapsed && (
          <div className="mt-1 space-y-1 animate-fadeIn">
            {item.children!.map(child => renderSidebarItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  }, [expandedItems, isCollapsed, isActiveRoute, toggleExpanded]);

  // Memoized sidebar container classes
  const sidebarClasses = useMemo(() => `
    ${isCollapsed ? 'w-16' : 'w-64'} 
    h-screen bg-white border-r border-gray-200 flex flex-col 
    transition-all duration-300 ease-in-out shadow-sm
  `.trim(), [isCollapsed]);

  return (
    <div className={sidebarClasses}>
      {/* Header - Optimized */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-md transform hover:scale-105 transition-transform">
              <span className="text-white font-bold text-sm">RX</span>
            </div>
            {!isCollapsed && (
              <div className="ml-3">
                <h1 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
                  RAPEX
                </h1>
              </div>
            )}
          </div>
          <button
            onClick={toggleCollapsed}
            className="p-2 rounded-lg hover:bg-white/80 transition-all duration-200 group"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg 
              className={`w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-all duration-200 ${
                isCollapsed ? 'rotate-180' : ''
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation - Optimized with custom scrollbar */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin">
        {items.map(item => renderSidebarItem(item))}
      </div>

      {/* User Section - Enhanced */}
      <div className="border-t border-gray-200 p-4 bg-gradient-to-r from-gray-50 to-gray-100">
        {!isCollapsed ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/60 transition-colors">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-medium text-sm">
                  {userInitials}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userInfo.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userInfo.email}
                </p>
                <p className="text-xs text-orange-600 font-medium">
                  {userInfo.role}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-lg transition-all duration-200 group"
            >
              <svg className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        ) : (
          <div className="space-y-3 flex flex-col items-center">
            <div 
              className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform cursor-pointer"
              title={`${userInfo.name} (${userInfo.role})`}
            >
              <span className="text-white font-medium text-sm">
                {userInitials}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2 text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-lg transition-all duration-200 group"
              title="Logout"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';
