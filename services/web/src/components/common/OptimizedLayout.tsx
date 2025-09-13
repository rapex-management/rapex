import React, { memo, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { Sidebar } from '../ui/Sidebar';
import { usePerformanceMonitor } from '../../hooks/usePerformance';

// Reusable sidebar item interface
interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  children?: SidebarItem[];
}

interface OptimizedLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  sidebarItems: SidebarItem[];
  userInfo: {
    name: string;
    email: string;
    role: string;
  };
  onLogout: () => void;
  className?: string;
}

// Memoized layout component for dashboard pages
export const OptimizedLayout = memo<OptimizedLayoutProps>(({
  children,
  title = 'RAPEX - Merchant Dashboard',
  description = 'Manage your business efficiently with RAPEX merchant dashboard',
  sidebarItems,
  userInfo,
  onLogout,
  className = ''
}) => {
  const { markStart, markEnd } = usePerformanceMonitor('OptimizedLayout');

  // Memoized logout handler with performance tracking
  const handleLogout = useCallback(() => {
    markStart();
    onLogout();
    markEnd('logout');
  }, [onLogout, markStart, markEnd]);

  // Memoized container classes
  const containerClasses = useMemo(() => 
    `flex h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 ${className}`.trim()
  , [className]);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        
        {/* Performance optimizations */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://api.rapex.ph" />
        
        {/* PWA and mobile optimizations */}
        <meta name="theme-color" content="#f97316" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </Head>

      <div className={containerClasses}>
        <Sidebar
          items={sidebarItems}
          userInfo={userInfo}
          onLogout={handleLogout}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            {children}
          </main>
        </div>
      </div>
    </>
  );
});

OptimizedLayout.displayName = 'OptimizedLayout';

// Higher-order component for dashboard pages
export const withOptimizedLayout = <P extends object>(
  Component: React.ComponentType<P>,
  layoutProps: Omit<OptimizedLayoutProps, 'children'>
) => {
  const WrappedComponent = memo((props: P) => (
    <OptimizedLayout {...layoutProps}>
      <Component {...props} />
    </OptimizedLayout>
  ));

  WrappedComponent.displayName = `withOptimizedLayout(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default OptimizedLayout;
