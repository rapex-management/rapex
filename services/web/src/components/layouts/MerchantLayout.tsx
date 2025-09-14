import React, { ReactNode, memo } from 'react';
import { useRouter } from 'next/router';
import { MerchantSidebar } from '../ui/MerchantSidebar';
import { MerchantAuthGuard } from '../../lib/auth/guards/MerchantAuthGuard';
import { PageLoader } from '../ui/LoadingSpinner';
import { useMerchantAuth } from '../../lib/auth/hooks/useMerchantAuth';

interface MerchantLayoutProps {
  children: ReactNode;
}

export const MerchantLayout = memo(({ children }: MerchantLayoutProps) => {
  const { user } = useMerchantAuth();
  const router = useRouter();

  // Only apply this layout to merchant pages
  const isMerchantPage = router.pathname.startsWith('/merchant');

  if (!isMerchantPage) {
    return <>{children}</>;
  }

  if (!user) {
    return <PageLoader />;
  }

  return (
    <MerchantAuthGuard requireActive={false}>
      <div className="flex h-screen bg-gray-50">
        <MerchantSidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </MerchantAuthGuard>
  );
});

MerchantLayout.displayName = 'MerchantLayout';
