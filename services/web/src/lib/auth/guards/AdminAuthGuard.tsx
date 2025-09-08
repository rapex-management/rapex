import React, { useEffect } from 'react';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { AuthGuardProps } from '../types/auth.types';

export function AdminAuthGuard({ 
  children, 
  fallback,
  requireActive = true 
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, hasValidStatus, requireAuth } = useAdminAuth();

  useEffect(() => {
    // Only redirect if we're done loading and not authenticated
    if (!isLoading) {
      requireAuth();
    }
  }, [isLoading, requireAuth]);

  // Show loading state
  if (isLoading) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check authentication
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Check admin status if required
  if (requireActive && !hasValidStatus()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Account Inactive</h2>
          <p className="text-sm text-gray-600">Your admin account is not active. Please contact system administrator.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
