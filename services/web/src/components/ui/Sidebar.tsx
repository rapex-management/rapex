import React, { useState } from 'react';
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

export const Sidebar: React.FC<SidebarProps> = ({ items, userInfo, onLogout }) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isActiveRoute = (href: string) => {
    return router.asPath === href || router.asPath.startsWith(href + '/');
  };

  const renderSidebarItem = (item: SidebarItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isActive = item.href && isActiveRoute(item.href);

    return (
      <div key={item.id}>
        {item.href ? (
          <Link href={item.href}>
            <div className={`
              sidebar-item ${isActive ? 'active' : ''} 
              ${level > 0 ? 'ml-4 pl-4 border-l border-gray-200' : ''}
            `}>
              <span className="flex-shrink-0">{item.icon}</span>
              {!isCollapsed && (
                <span className="ml-3 flex-1">{item.label}</span>
              )}
            </div>
          </Link>
        ) : (
          <div
            onClick={() => hasChildren && toggleExpanded(item.id)}
            className={`
              sidebar-item ${level > 0 ? 'ml-4 pl-4 border-l border-gray-200' : ''}
              ${hasChildren ? 'cursor-pointer' : ''}
            `}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!isCollapsed && (
              <>
                <span className="ml-3 flex-1">{item.label}</span>
                {hasChildren && (
                  <svg 
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
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
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderSidebarItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">RX</span>
            </div>
            {!isCollapsed && (
              <div className="ml-3">
                <h1 className="text-lg font-bold text-gray-900">RAPEX</h1>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {items.map(item => renderSidebarItem(item))}
      </div>

      {/* User Section */}
      <div className="border-t border-gray-200 p-4">
        {!isCollapsed ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {userInfo.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userInfo.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userInfo.email}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
              <span className="text-white font-medium text-sm">
                {userInfo.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center p-2 text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
