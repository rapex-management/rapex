import React from 'react';
import { MerchantSidebar } from '../../../components/ui/MerchantSidebar';
import { PageLoader } from '../../../components/ui/LoadingSpinner';
import { MerchantAuthGuard } from '../../../lib/auth/guards/MerchantAuthGuard';
import { useMerchantAuth } from '../../../lib/auth/hooks/useMerchantAuth';

const ProductsPage: React.FC = () => {
  const { user } = useMerchantAuth();

  if (!user) {
    return <PageLoader />;
  }

  return (
    <MerchantAuthGuard>
      <div className="min-h-screen bg-gray-50">
        <MerchantSidebar />
        
        <div className="lg:pl-72">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900">Test - Shop Products</h1>
            <p>This is a test page to see if basic structure works.</p>
          </div>
        </div>
      </div>
    </MerchantAuthGuard>
  );
};

export default ProductsPage;