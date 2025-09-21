import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { MerchantSidebar } from '../../../components/ui/MerchantSidebar';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Dropdown } from '../../../components/ui/Dropdown';
import { Button } from '../../../components/ui/Button';
import { PageLoader } from '../../../components/ui/LoadingSpinner';
import { MerchantAuthGuard } from '../../../lib/auth/guards/MerchantAuthGuard';
import { useMerchantAuth } from '../../../lib/auth/hooks/useMerchantAuth';
import Notification from '../../../components/ui/Notification';
import { useNotification } from '../../../hooks/useNotification';
import { ActionButtonsGroup } from '../../../components/ui/ActionButton';
import { EnhancedPagination } from '../../../components/ui/EnhancedPagination';
import { SecureConfirmationModal } from '../../../components/ui/SecureConfirmationModal';
import api from '../../../services/api';

interface Product {
  product_id: string;
  name: string;
  price: number;
  stock: number;
  status: string;
  category?: {
    category_id: string;
    name: string;
  } | null;
  brand?: {
    brand_id: string;
    name: string;
  } | null;
  sku?: string | null;
  images?: string[] | null;
  created_at: string;
  updated_at: string;
  description?: string | null;
  weight?: number | null;
}

interface Category {
  category_id: string;
  name: string;
}

interface Brand {
  brand_id: string;
  name: string;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

const ProductsPage: React.FC = () => {
  const { user } = useMerchantAuth();
  const router = useRouter();
  const { notifications, showSuccess, showError, hideNotification } = useNotification();

  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {}
  });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  
  // Filter data
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  
  // Bulk actions
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');

  // Status options
  const statusOptions = useMemo(() => [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'draft', label: 'Draft' },
    { value: 'out_of_stock', label: 'Out of Stock' },
    { value: 'banned', label: 'Banned' },
  ], []);

  // Bulk action options
  const bulkActionOptions = useMemo(() => [
    { value: '', label: 'Select Action' },
    { value: 'activate', label: 'Activate Products' },
    { value: 'deactivate', label: 'Set to Draft' },
    { value: 'out_of_stock', label: 'Mark Out of Stock' },
    { value: 'delete', label: 'Delete Products' },
  ], []);

  // Fetch categories and brands for filters
  const fetchFilterData = useCallback(async () => {
    try {
      const [categoriesRes, brandsRes] = await Promise.all([
        api.get('/api/products/categories/'),
        api.get('/api/products/brands/')
      ]);

      setCategories(categoriesRes.data || []);
      setBrands(brandsRes.data || []);
    } catch {
      setCategories([]);
      setBrands([]);
    }
  }, []);

  // Fetch products with filters and pagination
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(brandFilter && { brand: brandFilter }),
      });

      const response = await api.get(`/api/products/shop-products/?${params}`);
      const data: ApiResponse = response.data;
      
      setProducts(data.results || []);
      setTotalCount(data.count || 0);
      setTotalPages(Math.ceil((data.count || 0) / itemsPerPage));
      
    } catch {
      setProducts([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, statusFilter, categoryFilter, brandFilter]);

  // Load data on mount and filter changes
  useEffect(() => {
    if (user) {
      fetchFilterData();
    }
  }, [user, fetchFilterData]);

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user, fetchProducts]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter, brandFilter]);

  // Check for success message in URL parameters
  useEffect(() => {
    if (router.query.success) {
      showSuccess('Success', router.query.success as string);
      // Clean up URL
      router.replace('/merchant/shop-products', undefined, { shallow: true });
    }
  }, [router.query.success, showSuccess, router]);

  // Handle individual product actions
  const handleAction = useCallback(async (action: 'edit' | 'delete' | 'duplicate' | 'view', productId: string) => {
    setActionLoading(prev => new Set([...prev, productId]));
    
    try {
      switch (action) {
        case 'edit':
          router.push(`/merchant/shop-products/edit/${productId}`);
          break;
          
        case 'view':
          router.push(`/merchant/shop-products/view/${productId}`);
          break;
          
        case 'duplicate':
          const response = await api.post(`/api/products/shop-products/${productId}/duplicate/`);
          if (response.data?.product_id) {
            router.push(`/merchant/shop-products/edit/${response.data.product_id}?duplicated=true`);
          }
          break;
          
        case 'delete':
          setConfirmModal({
            isOpen: true,
            title: 'Delete Product',
            message: 'Are you sure you want to delete this product? This action cannot be undone.',
            type: 'danger',
            onConfirm: async () => {
              try {
                await api.delete(`/products/shop-products/${productId}/`);
                fetchProducts(); // Refresh the list
                showSuccess('Product Deleted', 'Product deleted successfully!');
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
              } catch {
                showError('Delete Failed', 'Failed to delete product. Please try again.');
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
              } finally {
                setActionLoading(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(productId);
                  return newSet;
                });
              }
            }
          });
          return; // Don't clear loading state yet
      }
    } catch {
      showError('Action Failed', 'Failed to perform action. Please try again.');
    } finally {
      if (action !== 'delete') {
        setActionLoading(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      }
    }
  }, [router, fetchProducts, showSuccess, showError, setConfirmModal]);

  // Handle bulk actions
  const handleBulkAction = useCallback(async () => {
    if (!bulkAction || selectedProducts.size === 0) return;
    
    const selectedArray = Array.from(selectedProducts);
    const actionText = bulkActionOptions.find(opt => opt.value === bulkAction)?.label || bulkAction;
    
    if (!confirm(`Are you sure you want to ${actionText.toLowerCase()} ${selectedArray.length} products?`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      if (bulkAction === 'delete') {
        await Promise.all(
          selectedArray.map(id => api.delete(`/products/shop-products/${id}/`))
        );
      } else {
        const statusMap: Record<string, string> = {
          activate: 'active',
          deactivate: 'draft',
          out_of_stock: 'out_of_stock',
        };
        
        if (statusMap[bulkAction]) {
          await api.patch('/api/products/shop-products/bulk-update/', {
            product_ids: selectedArray,
            status: statusMap[bulkAction],
          });
        }
      }
      
      setSelectedProducts(new Set());
      setBulkAction('');
      fetchProducts();
      showSuccess('Bulk Action Complete', `Successfully ${actionText.toLowerCase()} ${selectedArray.length} products.`);
      
    } catch {
      showError('Bulk Action Failed', 'Failed to perform bulk action. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [bulkAction, selectedProducts, bulkActionOptions, fetchProducts, showSuccess, showError]);

  // Toggle product selection
  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);

  // Toggle select all
  const toggleSelectAll = useCallback(() => {
    if (selectedProducts.size === products.length && products.length > 0) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.product_id)));
    }
  }, [selectedProducts.size, products]);

  // Utility functions
  const formatPrice = (price: number) => `₱${price.toLocaleString()}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();
  
  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: 'bg-green-100 text-green-800 border-green-200',
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      out_of_stock: 'bg-red-100 text-red-800 border-red-200',
      banned: 'bg-orange-100 text-orange-800 border-orange-200',
    };
    
    const className = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${className}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  // Category and brand options for filters
  const categoryOptions = useMemo(() => [
    { value: '', label: 'All Categories' },
    ...(Array.isArray(categories) ? categories.map(cat => ({ value: cat.category_id, label: cat.name })) : [])
  ], [categories]);

  const brandOptions = useMemo(() => [
    { value: '', label: 'All Brands' },
    ...(Array.isArray(brands) ? brands.map(brand => ({ value: brand.brand_id, label: brand.name })) : [])
  ], [brands]);

  if (!user) {
    return <PageLoader />;
  }

  return (
    <MerchantAuthGuard>
      <div className="flex h-screen bg-gray-50">
        <MerchantSidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4">
            
            {/* Header */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">My Shop Products</h1>
                  <p className="mt-2 text-gray-600">
                    Manage your shop product catalog • {totalCount} total products
                  </p>
                </div>
                
                <div className="mt-4 sm:mt-0 flex space-x-3">
                  <Link
                    href="/merchant/shop-products/add"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Product
                  </Link>
                  
                  <Link
                    href="/merchant/shop-products/bulk"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Bulk Upload
                  </Link>
                </div>
              </div>
            </div>

            {/* Filters & Search */}
            <Card className="mb-6 border-l-4 border-l-blue-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                  <Input
                    label=""
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search products by name, SKU..."
                    variant="outlined"
                    size="md"
                    leftIcon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    }
                  />
                </div>
                
                <Dropdown
                  label=""
                  options={statusOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder="Filter by status"
                  variant="outlined"
                  size="md"
                />
                
                <Dropdown
                  label=""
                  options={categoryOptions}
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  placeholder="Filter by category"
                  variant="outlined"
                  size="md"
                />
                
                <Dropdown
                  label=""
                  options={brandOptions}
                  value={brandFilter}
                  onChange={setBrandFilter}
                  placeholder="Filter by brand"
                  variant="outlined"
                  size="md"
                />
              </div>
              
              {/* Clear Filters */}
              {(searchTerm || statusFilter || categoryFilter || brandFilter) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('');
                      setCategoryFilter('');
                      setBrandFilter('');
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </Card>

            {/* Bulk Actions */}
            {selectedProducts.size > 0 && (
              <Card className="mb-6 bg-blue-50 border-l-4 border-l-blue-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedProducts.size} products selected
                    </span>
                    
                    <Dropdown
                      label=""
                      options={bulkActionOptions}
                      value={bulkAction}
                      onChange={setBulkAction}
                      placeholder="Choose action"
                      variant="outlined"
                      size="sm"
                    />
                    
                    {bulkAction && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleBulkAction}
                        disabled={loading}
                      >
                        Apply Action
                      </Button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setSelectedProducts(new Set())}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear selection
                  </button>
                </div>
              </Card>
            )}

            {/* Products Table */}
            <Card className="overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <PageLoader />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-500 mb-6">
                    {searchTerm || statusFilter || categoryFilter || brandFilter
                      ? 'Try adjusting your filters to see more results.'
                      : 'Start by adding your first product to your catalog.'
                    }
                  </p>
                  {!searchTerm && !statusFilter && !categoryFilter && !brandFilter && (
                    <Link
                      href="/merchant/shop-products/add"
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Your First Product
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedProducts.size === products.length && products.length > 0}
                              onChange={toggleSelectAll}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            SKU
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stock
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Brand
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {products.map((product) => (
                          <tr key={product.product_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedProducts.has(product.product_id)}
                                onChange={() => toggleProductSelection(product.product_id)}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                            </td>
                            
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-12 w-12">
                                  {product.images && product.images.length > 0 && product.images[0] ? (
                                    <Image
                                      src={product.images[0]}
                                      alt={product.name}
                                      width={48}
                                      height={48}
                                      className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                                    />
                                  ) : (
                                    <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900 line-clamp-2">
                                    {product.name}
                                  </div>
                                  {product.description && (
                                    <div className="text-sm text-gray-500 line-clamp-1">
                                      {product.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {product.sku || '—'}
                            </td>
                            
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {formatPrice(product.price)}
                            </td>
                            
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <span className={`font-medium ${product.stock <= 5 ? 'text-red-600' : product.stock <= 20 ? 'text-orange-600' : 'text-green-600'}`}>
                                {product.stock}
                              </span>
                            </td>
                            
                            <td className="px-6 py-4">
                              {getStatusBadge(product.status)}
                            </td>
                            
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {product.category?.name || '—'}
                            </td>
                            
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {product.brand?.name || '—'}
                            </td>
                            
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {formatDate(product.created_at)}
                            </td>
                            
                            <td className="px-6 py-4">
                              <ActionButtonsGroup
                                productId={product.product_id}
                                onAction={handleAction}
                                isLoading={actionLoading.has(product.product_id)}
                                loadingActions={actionLoading}
                                size="md"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Enhanced Pagination */}
                  <div className="bg-white px-6 py-4 border-t border-gray-200">
                    <EnhancedPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={totalCount}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                      onItemsPerPageChange={(newItemsPerPage) => {
                        setItemsPerPage(newItemsPerPage);
                        setCurrentPage(1); // Reset to first page when changing items per page
                      }}
                      showItemsPerPage={true}
                      showJumpToPage={true}
                      className="w-full"
                    />
                  </div>
                </>
              )}
            </Card>
          </main>
        </div>
      </div>
      
      {/* Secure Confirmation Modal */}
      <SecureConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isLoading={false}
      />
      
      {/* Render notifications */}
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          duration={notification.duration}
          position={notification.position}
          isVisible={true}
          onClose={() => hideNotification(notification.id)}
        />
      ))}
    </MerchantAuthGuard>
  );
};

export default ProductsPage;