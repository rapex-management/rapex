import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAdminAuth } from '../../lib/auth/hooks/useAdminAuth';

export default function AdminIndex() {
  const router = useRouter();
  const { user, isLoading } = useAdminAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // User is authenticated, redirect to dashboard
        router.replace('/admin/dashboard');
      } else {
        // User is not authenticated, redirect to login
        router.replace('/admin/login');
      }
    }
  }, [user, isLoading, router]);

  // Show loading while determining where to redirect
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
