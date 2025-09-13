import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import Notification from '../../components/ui/Notification';
import GoogleSignInButton from '../../components/ui/GoogleSignInButton';
import { useAdminAuth } from '../../lib/auth/hooks/useAdminAuth';

export default function AdminLogin() {
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({
    isVisible: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: ''
  });

  const router = useRouter();
  const { login, isAuthenticated } = useAdminAuth();

  // Check if user is already authenticated and redirect
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/admin/dashboard');
    }
  }, [isAuthenticated, router]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login({
        identifier: formData.identifier,
        password: formData.password
      });

      if (result.success) {
        showNotification('success', 'Welcome Back!', 'Login successful. Redirecting to dashboard...');
        router.replace('/admin/dashboard');
      } else {
        showNotification('error', 'Login Failed', result.error || 'Invalid credentials. Please try again.');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      showNotification('error', 'Login Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Main Container - Non-scrollable */}
      <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-orange-400 via-purple-500 to-pink-600 relative">
        {/* Abstract Edge Geometry (squares & rectangles) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div className="absolute -top-12 -left-12 w-60 h-48 bg-gradient-to-br from-orange-300/50 to-purple-600/40 border border-white/20 rotate-3 shadow-xl animate-drift"></div>
          <div className="absolute -top-20 -right-16 w-72 h-56 bg-gradient-to-tr from-pink-500/50 to-purple-700/40 border border-white/20 -rotate-6 shadow-xl animate-drift-slow"></div>
          <div className="absolute -bottom-24 -left-10 w-64 h-72 bg-gradient-to-bl from-purple-600/50 to-orange-500/40 border border-white/20 rotate-12 shadow-2xl animate-drift"></div>
          <div className="absolute -bottom-16 -right-12 w-72 h-40 bg-gradient-to-br from-pink-400/50 to-orange-400/40 border border-white/20 -rotate-12 shadow-lg animate-drift-fast"></div>
          <div className="absolute top-1/3 -left-10 w-36 h-64 bg-gradient-to-b from-purple-500/40 to-pink-500/40 border border-white/10 rotate-6 shadow-md animate-drift"></div>
          <div className="absolute bottom-1/4 -right-14 w-44 h-28 bg-gradient-to-r from-orange-400/50 to-pink-500/40 border border-white/10 -rotate-3 shadow animate-drift-slow"></div>
          <div className="absolute top-8 left-1/2 -translate-x-1/2 w-72 h-10 bg-gradient-to-r from-white/25 to-transparent opacity-60 rotate-1 animate-drift-fast"></div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 h-full flex items-center justify-center p-4">
          <div className="w-full max-w-5xl h-full max-h-[550px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
            
            <div className="h-full flex">
              
              {/* Left Panel - Branding */}
              <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 via-purple-600 to-pink-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/30"></div>
                {/* Branding Abstract Grid (softened) */}
                <div className="absolute inset-0 opacity-50 mix-blend-overlay pointer-events-none">
                  <div className="absolute top-6 left-8 w-24 h-24 bg-gradient-to-br from-orange-300/50 to-purple-600/40 border border-white/20 rotate-6 shadow-sm"></div>
                  <div className="absolute top-1/3 left-1/4 w-20 h-44 bg-gradient-to-b from-pink-400/50 to-orange-400/30 border border-white/10 -rotate-3 shadow-sm"></div>
                  <div className="absolute top-14 right-12 w-40 h-32 bg-gradient-to-tr from-purple-500/50 to-pink-500/40 border border-white/20 rotate-3 shadow-sm"></div>
                  <div className="absolute bottom-10 left-12 w-36 h-36 bg-gradient-to-br from-pink-400/50 to-purple-600/40 border border-white/10 -rotate-12 shadow-sm"></div>
                  <div className="absolute bottom-16 right-10 w-24 h-60 bg-gradient-to-b from-orange-400/50 to-pink-500/40 border border-white/10 rotate-6 shadow-sm"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-20 bg-gradient-to-r from-white/25 to-transparent border border-white/5 rotate-45 shadow-sm"></div>
                  <div className="absolute top-1/4 right-1/3 w-14 h-28 bg-gradient-to-b from-orange-300/50 to-purple-500/40 border border-white/10 rotate-12 shadow-sm"></div>
                  <div className="absolute bottom-1/3 right-1/2 w-10 h-20 bg-gradient-to-b from-pink-300/50 to-purple-500/40 border border-white/5 -rotate-6 shadow-sm"></div>
                </div>
                <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
                  
                  {/* Logo */}
                  <div className="mb-8">
                    <div className="w-24 h-24 bg-white/20 backdrop-blur-lg rounded-2xl p-4 mb-6 shadow-xl flex items-center justify-center">
                      <div className="w-16 h-16 rounded-xl overflow-hidden shadow-lg">
                        <Image 
                          src="/assets/rapexlogosquare.png" 
                          alt="Rapex logo" 
                          width={64} 
                          height={64} 
                          className="w-full h-full object-cover"
                          priority
                        />
                      </div>
                    </div>
                  </div>

                  {/* Welcome Text */}
                  <div className="text-center space-y-6">
                    <h1 className="text-4xl font-bold leading-tight">
                      Welcome to the
                      <span className="block bg-gradient-to-r from-yellow-200 to-orange-200 bg-clip-text text-transparent">
                        Admin Portal
                      </span>
                    </h1>
                    <p className="text-xl text-white/90 leading-relaxed max-w-md">
                      Manage your platform with powerful tools and comprehensive analytics.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Panel - Login Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-16 lg:p-20 py-2 lg:py-4">
                <div className="w-full max-w-md space-y-5 h-full flex flex-col justify-center">
                  
                  {/* Header */}
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center lg:hidden mb-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden p-0 shadow-xl flex items-center justify-center">
                        <Image 
                          src="/assets/rapexlogosquare.png" 
                          alt="Rapex logo" 
                          width={56} 
                          height={56} 
                          className="w-full h-full object-cover"
                          priority
                        />
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Admin Login</h2>
                    <p className="text-gray-600 text-sm">Access your administration dashboard</p>
                  </div>

                  {/* Login Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                  
                  <Input
                    label="Username or Email"
                    type="text"
                    value={formData.identifier}
                    onChange={(e) => setFormData(prev => ({...prev, identifier: e.target.value}))}
                    placeholder="Enter your username or email"
                    required
                    autoComplete="username"
                    leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    }
                    variant="outlined"
                    size="md"
                  />

                  <Input
                    label="Password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    }
                    variant="outlined"
                    size="md"
                  />

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center">
                    <input type="checkbox" className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500" />
                    <span className="ml-2 text-sm text-gray-600">Remember me</span>
                    </label>
                    <Link 
                    href="/admin/forgot-password" 
                    className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
                    >
                    Forgot password?
                    </Link>
                  </div>

                  {/* Login Button */}
                  <Button
                    type="submit"
                    isLoading={isLoading}
                    fullWidth
                    size="md"
                    leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    }
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>

                  {/* Divider */}
                  {/* <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-4 00"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                    <span className="bg-white/95 px-4 text-gray-500 font-medium">Or continue with</span>
                    </div>
                  </div> */}

                  {/* Google Login */}
                  {/* <GoogleSignInButton
                    userType="admin"
                    fullWidth
                    size="md"
                    onSignInStart={() => setIsLoading(true)}
                    onSignInSuccess={(result) => {
                      setIsLoading(false);
                      showNotification('success', 'Welcome Back!', result.message || 'Successfully signed in with Google.');
                    }}
                    onSignInError={(error) => {
                      setIsLoading(false);
                      showNotification('error', 'Sign In Failed', error);
                    }}
                    disabled={isLoading}
                  /> */}

                  
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-20">
          <p className="text-white/80 text-sm text-center">
            © 2025 Rapex. All rights reserved.
          </p>
        </div>
      </div>

      <Notification
        isVisible={notification.isVisible}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={hideNotification}
        duration={5000}
        position="top-right"
      />

      <style jsx>{`
  @keyframes drift { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
  .animate-drift { animation: drift 9s ease-in-out infinite; }
  .animate-drift-slow { animation: drift 14s ease-in-out infinite; }
  .animate-drift-fast { animation: drift 6s ease-in-out infinite; }
      `}</style>
    </>
  );
}
