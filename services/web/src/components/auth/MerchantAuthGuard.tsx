import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

interface MerchantAuthGuardProps {
  children: React.ReactNode;
  requireActive?: boolean; // Whether to require status = 0 (Active)
}

interface MerchantData {
  id: string;
  status: number;
  email: string;
  merchant_name: string;
  owner_name: string;
}

const MerchantAuthGuard: React.FC<MerchantAuthGuardProps> = ({ 
  children, 
  requireActive = true 
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('merchant_token');
        const merchantData = localStorage.getItem('merchant');

        if (!token || !merchantData) {
          router.replace('/merchant/login');
          return;
        }

        // Parse merchant data to check status
        const merchant: MerchantData = JSON.parse(merchantData);
        
        // If we require active status and merchant is not active
        if (requireActive && merchant.status !== 0) {
          // Redirect based on status
          if (merchant.status === 4 || merchant.status === 5) {
            router.replace('/merchant/pending-approval');
            return;
          } else {
            // For other statuses (banned, frozen, deleted), redirect to login
            localStorage.removeItem('merchant_token');
            localStorage.removeItem('merchant_refresh_token');
            localStorage.removeItem('merchant');
            router.replace('/merchant/login');
            return;
          }
        }

        // Validate token with backend
        const response = await fetch('/api/proxy/merchant/verify-token', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          // Token is invalid
          localStorage.removeItem('merchant_token');
          localStorage.removeItem('merchant_refresh_token');
          localStorage.removeItem('merchant');
          router.replace('/merchant/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/merchant/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, requireActive]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
};

export default MerchantAuthGuard;
