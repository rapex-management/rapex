import React, { useEffect } from 'react';
import { useMerchantAuth } from '../hooks/useMerchantAuth';
import { AuthGuardProps } from '../types/auth.types';

export function MerchantAuthGuard({ 
  children, 
  fallback,
  requireActive = true 
}: AuthGuardProps) {
  const { 
    isAuthenticated, 
    isLoading, 
    requireAuth,
    isActive,
    isPendingApproval,
    getStatusText 
  } = useMerchantAuth();

  useEffect(() => {
    // Only redirect if we're done loading
    if (!isLoading) {
      requireAuth(requireActive);
    }
  }, [isLoading, requireAuth, requireActive]);

  // Show loading state
  if (isLoading) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check authentication
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Check merchant status if required
  if (requireActive) {
    if (isPendingApproval()) {
      return null; // Will redirect to pending approval page
    }
    
    if (!isActive()) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Account Unavailable</h2>
            <p className="text-sm text-gray-600 mb-4">
              Your merchant account status: <span className="font-medium">{getStatusText()}</span>
            </p>
            <p className="text-xs text-gray-500">
              Please contact support if you believe this is an error.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
