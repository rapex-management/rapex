import Link from 'next/link';
import { useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function Home() {
  // Prefetch critical routes for instant navigation
  useEffect(() => {
    const prefetchRoutes = async () => {
      try {
        // Prefetch admin and merchant login pages for instant loading
        await Promise.all([
          fetch('/_next/static/chunks/pages/admin/login.js').catch(() => {}),
          fetch('/_next/static/chunks/pages/merchant/login.js').catch(() => {}),
          fetch('/_next/static/chunks/pages/merchant/signup.js').catch(() => {}),
        ]);
      } catch (error) {
        // Ignore prefetch errors
        console.warn('Route prefetch failed:', error);
      }
    };

    prefetchRoutes();
  }, []);
  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        {/* Header Section - Manual Refresh Mode Test */}
        <div className="text-center mb-12">
          <div className="mx-auto h-24 w-24 bg-white rounded-full flex items-center justify-center shadow-2xl mb-6">
            <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              RX
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            RAPEX
          </h1>
          <p className="text-xl text-orange-100 mb-2">
            Your One-Stop E-Commerce Platform
          </p>
          <p className="text-lg text-orange-200">
            Ride Hailing • Food Delivery • Product Delivery
          </p>
        </div>

        {/* Authentication Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Admin Login Card */}
          <Card className="backdrop-blur-sm bg-white/95 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Admin Portal</h3>
                <p className="text-gray-600 mb-6">
                  Manage the entire platform, merchants, and operations
                </p>
              </div>
              <Link href="/admin/login">
                <Button variant="primary" size="lg" className="w-full">
                  Admin Login
                </Button>
              </Link>
            </div>
          </Card>

          {/* Merchant Login Card */}
          <Card className="backdrop-blur-sm bg-white/95 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Merchant Portal</h3>
                <p className="text-gray-600 mb-6">
                  Manage your business, products, and orders
                </p>
              </div>
              <div className="space-y-3">
                <Link href="/merchant/login">
                  <Button variant="primary" size="lg" className="w-full">
                    Merchant Login
                  </Button>
                </Link>
                <Link href="/merchant/signup">
                  <Button variant="outline" size="lg" className="w-full">
                    Sign Up as Merchant
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="backdrop-blur-sm bg-white/90 text-center">
            <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Fast Delivery</h4>
            <p className="text-sm text-gray-600">Lightning-fast delivery for all your needs</p>
          </Card>

          <Card className="backdrop-blur-sm bg-white/90 text-center">
            <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Secure Platform</h4>
            <p className="text-sm text-gray-600">Advanced security for all transactions</p>
          </Card>

          <Card className="backdrop-blur-sm bg-white/90 text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Analytics</h4>
            <p className="text-sm text-gray-600">Comprehensive business insights</p>
          </Card>
        </div>

        {/* Test Credentials */}
        <Card className="backdrop-blur-sm bg-white/80 text-center">
          <h4 className="font-semibold text-gray-900 mb-4">Test Credentials</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">Admin:</p>
              <p className="text-gray-600">Username: admin</p>
              <p className="text-gray-600">Password: adminpass</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Merchant:</p>
              <p className="text-gray-600">Username: merchant</p>
              <p className="text-gray-600">Password: merchantpass</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
