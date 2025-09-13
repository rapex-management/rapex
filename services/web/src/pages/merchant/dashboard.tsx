import React, { memo, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Sidebar } from '../../components/ui/Sidebar';
import { Card, StatsCard, ActionCard } from '../../components/ui/Card';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { MerchantAuthGuard } from '../../lib/auth/guards/MerchantAuthGuard';
import { useMerchantAuth } from '../../lib/auth/hooks/useMerchantAuth';
import { usePerformanceMonitor } from '../../hooks/usePerformance';

// Memoized dashboard stats data
const dashboardStats = [
  {
    title: "Today's Orders",
    value: "42",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    trend: { value: 12.5, positive: true }
  },
  {
    title: "Today's Revenue",
    value: "₱15,420",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    ),
    trend: { value: 8.3, positive: true }
  },
  {
    title: "Total Products",
    value: "1,247",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  },
  {
    title: "Store Rating",
    value: "4.8",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    trend: { value: 2.1, positive: true }
  }
];

// Quick actions configuration
const quickActionsConfig = [
  {
    title: "Add Product",
    description: "Add new products to your store",
    href: "/merchant/products/add",
    color: "orange" as const,
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    )
  },
  {
    title: "View Orders",
    description: "Manage your customer orders",
    href: "/merchant/orders",
    color: "blue" as const,
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )
  },
  {
    title: "Analytics",
    description: "View sales and performance data",
    href: "/merchant/analytics/sales",
    color: "green" as const,
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    title: "Settings",
    description: "Manage your store settings",
    href: "/merchant/settings/profile",
    color: "purple" as const,
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
];

const MerchantDashboard = memo(() => {
  const { user, logout } = useMerchantAuth();
  const { markStart, markEnd } = usePerformanceMonitor('MerchantDashboard');
  const router = useRouter();

  // Memoized logout handler
  const handleLogout = useCallback(async () => {
    markStart();
    await logout();
    markEnd('logout');
  }, [logout, markStart, markEnd]);

  // Memoized navigation handler
  const handleNavigate = useCallback((href: string) => {
    markStart();
    router.push(href);
    markEnd('navigation');
  }, [router, markStart, markEnd]);

  // Memoized quick actions with navigation
  const quickActions = useMemo(() => 
    quickActionsConfig.map(action => ({
      ...action,
      onClick: () => handleNavigate(action.href)
    }))
  , [handleNavigate]);

  // Memoized sidebar items to prevent recreation on every render
  const sidebarItems = useMemo(() => [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/merchant/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7z" />
        </svg>
      ),
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      children: [
        {
          id: 'orders-active',
          label: 'Active',
          icon: <div className="w-2 h-2 bg-green-500 rounded-full"></div>,
          children: [
            { id: 'orders-delivery', label: 'Delivery', href: '/merchant/orders/delivery', icon: <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div> },
            { id: 'orders-pickup', label: 'Pick-up', href: '/merchant/orders/pickup', icon: <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div> },
            { id: 'orders-scheduled', label: 'Scheduled Orders', href: '/merchant/orders/scheduled', icon: <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div> },
          ]
        },
        { id: 'orders-completed', label: 'Completed', href: '/merchant/orders/completed', icon: <div className="w-2 h-2 bg-gray-400 rounded-full"></div> },
        { id: 'orders-cancellations', label: 'Cancellations', href: '/merchant/orders/cancellations', icon: <div className="w-2 h-2 bg-red-400 rounded-full"></div> },
        { id: 'orders-returns', label: 'Returns/Refunds', href: '/merchant/orders/returns', icon: <div className="w-2 h-2 bg-yellow-400 rounded-full"></div> },
      ]
    },
    {
      id: 'products',
      label: 'Products',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      children: [
        { id: 'my-products', label: 'My Products', href: '/merchant/products', icon: <div className="w-2 h-2 bg-blue-500 rounded-full"></div> },
        { id: 'add-product', label: 'Add New Products', href: '/merchant/products/add', icon: <div className="w-2 h-2 bg-green-500 rounded-full"></div> },
        { id: 'bulk-upload-products', label: 'Bulk Upload', href: '/merchant/products/bulk', icon: <div className="w-2 h-2 bg-purple-500 rounded-full"></div> },
      ]
    },
    {
      id: 'fresh-products',
      label: 'Fresh Products',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      children: [
        { id: 'my-fresh-products', label: 'My Fresh Products', href: '/merchant/fresh-products', icon: <div className="w-2 h-2 bg-green-500 rounded-full"></div> },
        { id: 'add-fresh-product', label: 'Add New Fresh Products', href: '/merchant/fresh-products/add', icon: <div className="w-2 h-2 bg-green-600 rounded-full"></div> },
        { id: 'bulk-upload-fresh', label: 'Bulk Upload', href: '/merchant/fresh-products/bulk', icon: <div className="w-2 h-2 bg-green-700 rounded-full"></div> },
      ]
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      children: [
        { id: 'my-menu', label: 'My Menu', href: '/merchant/menu', icon: <div className="w-2 h-2 bg-orange-500 rounded-full"></div> },
        { id: 'add-menu', label: 'Add New Menu', href: '/merchant/menu/add', icon: <div className="w-2 h-2 bg-orange-600 rounded-full"></div> },
        { id: 'bulk-upload-menu', label: 'Bulk Upload', href: '/merchant/menu/bulk', icon: <div className="w-2 h-2 bg-orange-700 rounded-full"></div> },
      ]
    },
    {
      id: 'preloved',
      label: 'Pre-loved Products',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      children: [
        { id: 'my-preloved', label: 'My Pre-loved Products', href: '/merchant/preloved', icon: <div className="w-2 h-2 bg-pink-500 rounded-full"></div> },
        { id: 'add-preloved', label: 'Add New Pre-loved Products', href: '/merchant/preloved/add', icon: <div className="w-2 h-2 bg-pink-600 rounded-full"></div> },
        { id: 'bulk-upload-preloved', label: 'Bulk Upload', href: '/merchant/preloved/bulk', icon: <div className="w-2 h-2 bg-pink-700 rounded-full"></div> },
      ]
    },
    {
      id: 'analytics',
      label: 'Performance/Analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      children: [
        { id: 'sales-reports', label: 'Sales Reports', href: '/merchant/analytics/sales', icon: <div className="w-2 h-2 bg-indigo-500 rounded-full"></div> },
        { id: 'business-insights', label: 'Business Insights', href: '/merchant/analytics/insights', icon: <div className="w-2 h-2 bg-indigo-600 rounded-full"></div> },
      ]
    },
    {
      id: 'finance',
      label: 'Finance',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      children: [
        { id: 'wallet', label: 'Wallet', href: '/merchant/finance/wallet', icon: <div className="w-2 h-2 bg-green-500 rounded-full"></div> },
        { id: 'settlement', label: 'Settlement/Payouts', href: '/merchant/finance/settlement', icon: <div className="w-2 h-2 bg-green-600 rounded-full"></div> },
        { id: 'bank-settings', label: 'Bank Account Settings', href: '/merchant/finance/bank', icon: <div className="w-2 h-2 bg-green-700 rounded-full"></div> },
      ]
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5zM4 17h8v5l-5-5M4 4h16v9H4V4z" />
        </svg>
      ),
      children: [
        { id: 'announcements', label: 'Announcements', href: '/merchant/notifications/announcements', icon: <div className="w-2 h-2 bg-yellow-500 rounded-full"></div> },
        { id: 'broadcast', label: 'Broadcast Notification', href: '/merchant/notifications/broadcast', icon: <div className="w-2 h-2 bg-yellow-600 rounded-full"></div> },
      ]
    },
    {
      id: 'customer-service',
      label: 'Customer Service',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      children: [
        { id: 'messages', label: 'Messages/Chats', href: '/merchant/customer-service/messages', icon: <div className="w-2 h-2 bg-blue-500 rounded-full"></div> },
      ]
    },
    {
      id: 'store-settings',
      label: 'Store Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      children: [
        { id: 'profile-settings', label: 'Profile Settings', href: '/merchant/settings/profile', icon: <div className="w-2 h-2 bg-gray-500 rounded-full"></div> },
      ]
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      children: [
        { id: 'chat-admin', label: 'Chat with Admin', href: '/merchant/help/chat', icon: <div className="w-2 h-2 bg-red-500 rounded-full"></div> },
        { id: 'faqs', label: 'FAQs', href: '/merchant/help/faqs', icon: <div className="w-2 h-2 bg-red-600 rounded-full"></div> },
      ]
    },
  ], []);

  if (!user) {
    return <PageLoader />;
  }

  return (
    <MerchantAuthGuard requireActive={false}>
      <div className="flex h-screen bg-gray-50">
      <Sidebar
        items={sidebarItems}
        userInfo={{
          name: user.merchant_name || user.owner_name || user.username || 'Merchant',
          email: user.email,
          role: 'Merchant'
        }}
        onLogout={handleLogout}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Merchant Dashboard</h1>
              <p className="text-gray-600 mt-2">Welcome back, {user.merchant_name || user.owner_name}! Manage your business efficiently.</p>
            </div>

            {/* Quick Stats - Optimized */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {dashboardStats.map((stat) => (
                <StatsCard
                  key={stat.title}
                  title={stat.title}
                  value={stat.value}
                  icon={stat.icon}
                  trend={stat.trend}
                />
              ))}
            </div>

            {/* Quick Actions & Recent Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card variant="elevated">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {quickActions.map((action) => (
                    <ActionCard
                      key={action.title}
                      title={action.title}
                      description={action.description}
                      icon={action.icon}
                      onClick={action.onClick}
                      color={action.color}
                    />
                  ))}
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                  <a href="/merchant/orders" className="text-sm text-primary-600 hover:text-primary-500">
                    View all
                  </a>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Order #ORD-2024-{1000 + item}</p>
                        <p className="text-xs text-gray-500">Customer: John Doe • 15 mins ago</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">₱250.00</p>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
    </MerchantAuthGuard>
  );
});

MerchantDashboard.displayName = 'MerchantDashboard';

export default MerchantDashboard;
