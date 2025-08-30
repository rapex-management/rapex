import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import Notification from '../../components/ui/Notification';

const MerchantForgotPassword = () => {
  const [currentStep, setCurrentStep] = useState(0); // 0: email, 1: otp, 2: new password
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{
    isVisible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isVisible: false,
    type: 'info',
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/proxy/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          purpose: 'password_reset',
          user_type: 'merchant'
        }),
      });

      if (response.ok) {
        showNotification('success', 'OTP Sent', 'Password reset code sent to your email. Check your inbox.');
        setCurrentStep(1);
      } else {
        const data = await response.json();
        showNotification('error', 'Failed to Send OTP', data.detail || 'Email not found or invalid.');
      }
    } catch {
      showNotification('error', 'Connection Error', 'Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otpCode.length !== 6) {
      showNotification('error', 'Invalid OTP', 'Please enter a valid 6-digit OTP code.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/proxy/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          otp_code: otpCode,
          purpose: 'password_reset'
        }),
      });

      if (response.ok) {
        showNotification('success', 'OTP Verified', 'Please enter your new password.');
        setCurrentStep(2);
      } else {
        showNotification('error', 'Verification Failed', 'Invalid or expired OTP code. Please try again.');
      }
    } catch {
      showNotification('error', 'Connection Error', 'Unable to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      showNotification('error', 'Password Mismatch', 'Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      showNotification('error', 'Weak Password', 'Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/proxy/merchant/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          otp_code: otpCode,
          new_password: newPassword
        }),
      });

      if (response.ok) {
        showNotification('success', 'Password Reset Successful', 'Your password has been reset successfully. Redirecting to login...');
        
        setTimeout(() => {
          router.push('/merchant/login');
        }, 2000);
      } else {
        const data = await response.json();
        showNotification('error', 'Reset Failed', data.detail || 'Failed to reset password. Please try again.');
      }
    } catch {
      showNotification('error', 'Connection Error', 'Unable to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/proxy/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          purpose: 'password_reset'
        }),
      });

      if (response.ok) {
        showNotification('success', 'OTP Resent', 'New verification code sent to your email.');
      } else {
        showNotification('error', 'Failed to Resend', 'Unable to resend OTP. Please try again.');
      }
    } catch {
      showNotification('error', 'Connection Error', 'Unable to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (currentStep) {
      case 0: // Email step
        return (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Forgot Password?</h3>
              <p className="text-gray-600 text-sm">
                Enter your email address and we'll send you a verification code.
              </p>
            </div>

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              }
              variant="outlined"
              size="md"
            />

            <Button
              type="submit"
              isLoading={isLoading}
              fullWidth
              size="md"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              }
            >
              {isLoading ? 'Sending...' : 'Send Reset Code'}
            </Button>
          </form>
        );

      case 1: // OTP verification step
        return (
          <form onSubmit={handleOtpVerification} className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Check Your Email</h3>
              <p className="text-gray-600 text-sm">
                We&apos;ve sent a 6-digit code to <strong>{email}</strong>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                The code will expire in 30 minutes.
              </p>
            </div>

            <Input
              label="Verification Code"
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              required
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              variant="outlined"
              size="md"
              className="text-center font-mono tracking-widest"
            />

            <Button
              type="submit"
              isLoading={isLoading}
              disabled={otpCode.length !== 6}
              fullWidth
              size="md"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={resendOTP}
                disabled={isLoading}
                className="text-sm text-orange-600 hover:text-orange-500 font-medium disabled:opacity-50"
              >
                Didn&apos;t receive the code? Resend
              </button>
            </div>
          </form>
        );

      case 2: // New password step
        return (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m2-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2m6 0H9" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Set New Password</h3>
              <p className="text-gray-600 text-sm">
                Create a strong password for your merchant account.
              </p>
            </div>

            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
              variant="outlined"
              size="md"
            />

            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              variant="outlined"
              size="md"
            />

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h4 className="text-xs font-medium text-gray-900 mb-2">Password Requirements:</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className={`flex items-center ${newPassword.length >= 8 ? 'text-green-600' : ''}`}>
                  <span className="mr-2">{newPassword.length >= 8 ? '✓' : '•'}</span>
                  At least 8 characters long
                </li>
                <li className={`flex items-center ${/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}`}>
                  <span className="mr-2">{/[A-Z]/.test(newPassword) ? '✓' : '•'}</span>
                  Contains uppercase letter
                </li>
                <li className={`flex items-center ${/[a-z]/.test(newPassword) ? 'text-green-600' : ''}`}>
                  <span className="mr-2">{/[a-z]/.test(newPassword) ? '✓' : '•'}</span>
                  Contains lowercase letter
                </li>
                <li className={`flex items-center ${/\d/.test(newPassword) ? 'text-green-600' : ''}`}>
                  <span className="mr-2">{/\d/.test(newPassword) ? '✓' : '•'}</span>
                  Contains number
                </li>
              </ul>
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              fullWidth
              size="md"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Main Container - Non-scrollable */}
      <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-orange-400 via-purple-500 to-pink-600 relative">
        {/* Abstract Edge Geometry (squares & rectangles) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          {/* Corners */}
          <div className="absolute -top-10 -left-10 w-56 h-56 bg-gradient-to-br from-orange-300/50 to-purple-600/40 border border-white/20 rotate-6 shadow-xl animate-drift"></div>
          <div className="absolute -top-16 -right-20 w-64 h-40 bg-gradient-to-tr from-pink-500/50 to-purple-700/40 border border-white/20 -rotate-3 shadow-lg animate-drift-slow"></div>
          <div className="absolute -bottom-20 -left-14 w-72 h-48 bg-gradient-to-bl from-purple-600/50 to-orange-500/40 border border-white/20 rotate-12 shadow-2xl animate-drift"></div>
          <div className="absolute -bottom-24 -right-10 w-60 h-60 bg-gradient-to-br from-pink-400/50 to-orange-400/40 border border-white/20 rotate-45 shadow-xl animate-drift-fast"></div>
          {/* Edge accents */}
          <div className="absolute top-1/3 -left-12 w-40 h-72 bg-gradient-to-b from-purple-500/40 to-pink-500/40 border border-white/10 rotate-12 shadow-lg animate-drift"></div>
          <div className="absolute bottom-1/4 -right-16 w-52 h-32 bg-gradient-to-r from-orange-400/50 to-pink-500/40 border border-white/10 -rotate-6 shadow-lg animate-drift-slow"></div>
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-80 h-8 bg-gradient-to-r from-white/20 to-transparent opacity-60 rotate-2 animate-drift-fast"></div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 h-full flex items-center justify-center p-4">
          <div className="w-full max-w-5xl h-full max-h-[550px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
            
            <div className="h-full flex">
              
              {/* Left Panel - Form Content */}
              <div className="w-full lg:w-1/2 flex items-center justify-center p-16 lg:p-20 py-2 lg:py-4">
                <div className="w-full max-w-md space-y-5 h-full flex flex-col justify-center">
                  
                  {/* Header */}
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center lg:hidden mb-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden p-0 shadow-xl flex items-center justify-center">
                        <img src="/assets/rapexlogosquare.png" alt="Rapex logo" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
                    <p className="text-gray-600 text-sm">Recover access to your merchant account</p>
                  </div>

                  {/* Content */}
                  {renderContent()}

                  {/* Footer */}
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-center text-sm text-gray-500">
                      <Link href="/merchant/login" className="text-orange-600 font-medium hover:text-orange-700">
                        ← Back to Login
                      </Link>
                    </p>
                  </div>

                </div>
              </div>

              {/* Right Panel - Branding */}
              <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-500 via-orange-500 to-pink-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/30"></div>
                {/* Branding Abstract Grid (softened) */}
                <div className="absolute inset-0 opacity-50 mix-blend-overlay pointer-events-none">
                  {/* Distributed squares/rectangles */}
                  <div className="absolute top-4 left-6 w-24 h-24 bg-gradient-to-br from-orange-300/50 to-purple-600/40 border border-white/20 rotate-12 shadow-sm"></div>
                  <div className="absolute top-1/3 left-1/4 w-16 h-40 bg-gradient-to-b from-pink-400/50 to-orange-400/30 border border-white/10 -rotate-3 shadow-sm"></div>
                  <div className="absolute top-16 right-10 w-40 h-28 bg-gradient-to-tr from-purple-500/50 to-pink-500/40 border border-white/20 rotate-6 shadow-sm"></div>
                  <div className="absolute bottom-8 left-10 w-32 h-32 bg-gradient-to-br from-pink-400/50 to-purple-600/40 border border-white/10 -rotate-12 shadow-sm"></div>
                  <div className="absolute bottom-14 right-8 w-20 h-52 bg-gradient-to-b from-orange-400/50 to-pink-500/40 border border-white/10 rotate-3 shadow-sm"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-16 bg-gradient-to-r from-white/25 to-transparent border border-white/5 rotate-45 shadow-sm"></div>
                  <div className="absolute top-1/4 right-1/3 w-10 h-24 bg-gradient-to-b from-orange-300/50 to-purple-500/40 border border-white/10 rotate-12 shadow-sm"></div>
                </div>
                <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
                  
                  {/* Logo */}
                  <div className="mb-6">
                    <div className="w-24 h-24 bg-white/20 backdrop-blur-lg rounded-2xl p-4 mb-6 shadow-xl flex items-center justify-center">
                      <div className="w-16 h-16 rounded-xl overflow-hidden shadow-lg">
                        <img src="/assets/rapexlogosquare.png" alt="Rapex logo" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>

                  {/* Welcome Text */}
                  <div className="text-center">
                    <h1 className="text-4xl font-bold leading-tight">
                      Secure <span className="inline bg-gradient-to-r from-yellow-200 to-orange-200 bg-clip-text text-transparent">Merchant Account</span> Recovery
                    </h1>
                    <p className="text-xl text-white/90 leading-relaxed max-w-md mt-4">
                      Reset your password securely and regain access to your merchant dashboard.
                    </p>
                  </div>

                  {/* Security Features */}
                  <div className="mt-8 space-y-4 w-full max-w-sm">
                    <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <div className="w-8 h-8 bg-white/20 rounded-md flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm">Secure Process</h3>
                        <p className="text-white/80 text-xs">Email verification required</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <div className="w-8 h-8 bg-white/20 rounded-md flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm">Quick Recovery</h3>
                        <p className="text-white/80 text-xs">Back to business in minutes</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
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
};

export default MerchantForgotPassword;
