import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Sidebar } from '../../components/ui/Sidebar';
import { Card } from '../../components/ui/Card';
import MerchantAuthGuard from '../../components/auth/MerchantAuthGuard';
import Notification from '../../components/ui/Notification';

interface DashboardStats {
  today_orders: number;
  total_orders: number;
  pending_orders: number;
  today_revenue: number;
  total_revenue: number;
  total_products: number;
  active_products: number;
  merchant_rating: number;
}

interface MerchantInfo {
  id: string;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  status: number;
  date_joined: string;
}

interface DashboardData {
  merchant_info: MerchantInfo;
  statistics: DashboardStats;
  quick_stats: {
    orders_this_week: number;
    revenue_this_week: number;
    orders_this_month: number;
    revenue_this_month: number;
  };
}

const MerchantDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState({
    isVisible: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: ''
  });
  
  const router = useRouter();

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setNotification({
      isVisible: true,
      type,
      title,
      message
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('merchant_token');
      
      if (!token) {
        router.push('/merchant/login');
        return;
      }

      const response = await fetch('/api/proxy/merchant/dashboard', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('merchant_token');
        localStorage.removeItem('merchant_refresh_token');
        localStorage.removeItem('merchant');
        router.push('/merchant/login');
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to load dashboard data: ${response.status}`);
      }

      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);
      showNotification('error', 'Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleLogout = async () => {
    try {
      const refresh = localStorage.getItem('merchant_refresh_token');
      if (refresh) {
        await fetch('/api/proxy/logout', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({refresh})
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('merchant_token');
      localStorage.removeItem('merchant_refresh_token');
      localStorage.removeItem('merchant');
      router.push('/merchant/login');
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusText = (status: number): string => {
    const statusMap: { [key: number]: string } = {
      0: 'Active',
      1: 'Inactive',
      2: 'Suspended',
      3: 'Pending',
      4: 'Rejected',
      5: 'Under Review',
      6: 'Banned'
    };
    return statusMap[status] || 'Unknown';
  };

  const getStatusColor = (status: number): string => {
    const colorMap: { [key: number]: string } = {
      0: 'text-green-600 bg-green-100',
      1: 'text-gray-600 bg-gray-100',
      2: 'text-red-600 bg-red-100',
      3: 'text-yellow-600 bg-yellow-100',
      4: 'text-red-600 bg-red-100',
      5: 'text-blue-600 bg-blue-100',
      6: 'text-red-600 bg-red-100'
    };
    return colorMap[status] || 'text-gray-600 bg-gray-100';
  };

  const sidebarItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/merchant',
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
      id: 'analytics',
      label: 'Analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      children: [
        { id: 'sales-report', label: 'Sales Report', href: '/merchant/analytics/sales', icon: <div className="w-2 h-2 bg-green-500 rounded-full"></div> },
        { id: 'performance', label: 'Performance', href: '/merchant/analytics/performance', icon: <div className="w-2 h-2 bg-blue-500 rounded-full"></div> },
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
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Dashboard</h3>
          <p className="text-gray-600 mb-4">{error || 'Unable to load dashboard data'}</p>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { merchant_info, statistics } = dashboardData;

  return (
    <MerchantAuthGuard requireActive={false}>
      <div className="flex h-screen bg-gray-50">
        <Notification
          isVisible={notification.isVisible}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={hideNotification}
        />
        
        <Sidebar
          items={sidebarItems}
          onLogout={handleLogout}
          userInfo={{
            name: merchant_info.owner_name,
            email: merchant_info.email,
            role: 'Merchant'
          }}
        />

        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Header */}
            <div className="mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Welcome back, {merchant_info.owner_name}!
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {merchant_info.business_name}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(merchant_info.status)}`}>
                    {getStatusText(merchant_info.status)}
                  </span>
                  <button
                    onClick={loadDashboardData}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Refresh"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Today&apos;s Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.today_orders}</p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Today&apos;s Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.today_revenue)}</p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Products</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.total_products}</p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Rating</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.merchant_rating}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <a href="/merchant/products/add" className="p-4 bg-gradient-to-r from-orange-400 to-pink-500 rounded-lg text-center hover:shadow-md transition-shadow">
                    <svg className="w-8 h-8 mx-auto mb-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <p className="text-sm font-medium text-white">Add Product</p>
                  </a>
                  
                  <a href="/merchant/orders" className="p-4 bg-blue-500 rounded-lg text-center hover:shadow-md transition-shadow">
                    <svg className="w-8 h-8 mx-auto mb-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm font-medium text-white">View Orders</p>
                  </a>
                  
                  <a href="/merchant/analytics/sales" className="p-4 bg-green-500 rounded-lg text-center hover:shadow-md transition-shadow">
                    <svg className="w-8 h-8 mx-auto mb-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-sm font-medium text-white">Analytics</p>
                  </a>
                  
                  <a href="/merchant/settings/profile" className="p-4 bg-gray-500 rounded-lg text-center hover:shadow-md transition-shadow">
                    <svg className="w-8 h-8 mx-auto mb-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm font-medium text-white">Settings</p>
                  </a>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Business Overview</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Total Orders</span>
                    <span className="font-semibold text-gray-900">{statistics.total_orders}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Pending Orders</span>
                    <span className="font-semibold text-orange-600">{statistics.pending_orders}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Active Products</span>
                    <span className="font-semibold text-green-600">{statistics.active_products}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Total Revenue</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(statistics.total_revenue)}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MerchantAuthGuard>
  );
};

export default MerchantDashboard;
