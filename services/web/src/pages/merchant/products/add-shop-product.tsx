import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { MerchantSidebar } from '../../../components/ui/MerchantSidebar';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Dropdown } from '../../../components/ui/Dropdown';
import { Button } from '../../../components/ui/Button';
import { PageLoader } from '../../../components/ui/LoadingSpinner';
import { MerchantAuthGuard } from '../../../lib/auth/guards/MerchantAuthGuard';
import { useMerchantAuth } from '../../../lib/auth/hooks/useMerchantAuth';
import api from '../../../services/api';

interface Category {
  category_id: string;
  name: string;
  description?: string;
}

interface Brand {
  brand_id: string;
  name: string;
  description?: string;
}

interface FormData {
  name: string;
  description: string;
  price: string;
  stock: string;
  category: string;
  brand: string;
  status: string;
  sku: string;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  images: string[];
}

interface FormErrors {
  [key: string]: string;
}

interface SubmissionData {
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  status: string;
  sku?: string | null;
  weight?: number | null;
  category?: string | null;
  brand?: string | null;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  images?: string[];
}

const AddShopProductPage = () => {
  const { user } = useMerchantAuth();
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    price: '',
    stock: '0',
    category: '',
    brand: '',
    status: 'draft',
    sku: '',
    weight: '',
    dimensions: {
      length: '',
      width: '',
      height: ''
    },
    images: ['']
  });

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Status options
  const statusOptions = useMemo(() => [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'out_of_stock', label: 'Out of Stock' }
  ], []);

  // Fetch categories and brands
  const fetchSupportingData = useCallback(async () => {
    try {
      setLoadingData(true);
      
      const [categoriesRes, brandsRes] = await Promise.all([
        api.get('/products/shop-products/categories/'),
        api.get('/products/shop-products/brands/')
      ]);

      setCategories(categoriesRes.data.categories || []);
      setBrands(brandsRes.data.brands || []);
    } catch (error) {
      console.error('Error fetching supporting data:', error);
      setErrors({ general: 'Failed to load form data. Please refresh the page.' });
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchSupportingData();
  }, [fetchSupportingData]);

  // Handle input changes
  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // Handle dimension changes
  const handleDimensionChange = useCallback((dimension: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      dimensions: { ...prev.dimensions, [dimension]: value }
    }));
    if (errors[`dimensions.${dimension}`]) {
      setErrors(prev => ({ ...prev, [`dimensions.${dimension}`]: '' }));
    }
  }, [errors]);

  // Handle image URL changes
  const handleImageChange = useCallback((index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => i === index ? value : img)
    }));
  }, []);

  // Add new image field
  const addImageField = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, '']
    }));
  }, []);

  // Remove image field
  const removeImageField = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  }, []);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.price.trim()) {
      newErrors.price = 'Price is required';
    } else {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        newErrors.price = 'Price must be a positive number';
      }
    }

    // Optional but validated fields
    if (formData.stock.trim()) {
      const stock = parseInt(formData.stock);
      if (isNaN(stock) || stock < 0) {
        newErrors.stock = 'Stock must be a non-negative number';
      }
    }

    if (formData.weight.trim()) {
      const weight = parseFloat(formData.weight);
      if (isNaN(weight) || weight <= 0) {
        newErrors.weight = 'Weight must be a positive number';
      }
    }

    // Validate dimensions if any are provided
    const { length, width, height } = formData.dimensions;
    const hasDimensions = length || width || height;
    
    if (hasDimensions) {
      if (!length || !width || !height) {
        newErrors.dimensions = 'All dimensions (length, width, height) are required if providing dimensions';
      } else {
        const l = parseFloat(length);
        const w = parseFloat(width);
        const h = parseFloat(height);
        
        if (isNaN(l) || l <= 0) {
          newErrors['dimensions.length'] = 'Length must be a positive number';
        }
        if (isNaN(w) || w <= 0) {
          newErrors['dimensions.width'] = 'Width must be a positive number';
        }
        if (isNaN(h) || h <= 0) {
          newErrors['dimensions.height'] = 'Height must be a positive number';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Submit form
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setErrors({});

      // Prepare submission data
      const submissionData: SubmissionData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock) || 0,
        status: formData.status,
        sku: formData.sku.trim() || null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        category: formData.category || null,
        brand: formData.brand || null
      };

      // Add dimensions if provided
      const { length, width, height } = formData.dimensions;
      if (length && width && height) {
        submissionData.dimensions = {
          length: parseFloat(length),
          width: parseFloat(width),
          height: parseFloat(height)
        };
      }

      // Add images (filter out empty strings)
      const validImages = formData.images.filter(img => img.trim());
      if (validImages.length > 0) {
        submissionData.images = validImages;
      }

      await api.post('/products/shop-products/', submissionData);
      
      // Redirect to products list with success message
      router.push('/merchant/products?success=Product created successfully');
      
    } catch (error: unknown) {
      console.error('Error creating product:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown } };
        if (axiosError.response?.data) {
          const apiErrors = axiosError.response.data;
          if (typeof apiErrors === 'object' && apiErrors !== null) {
            setErrors(apiErrors as FormErrors);
          } else {
            setErrors({ general: 'Failed to create product. Please check your input and try again.' });
          }
        } else {
          setErrors({ general: 'Network error. Please check your connection and try again.' });
        }
      } else {
        setErrors({ general: 'An unexpected error occurred. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm, router]);

  // Dropdown options
  const categoryOptions = useMemo(() => 
    categories.map(cat => ({
      value: cat.category_id,
      label: cat.name
    })), [categories]
  );

  const brandOptions = useMemo(() => 
    brands.map(brand => ({
      value: brand.brand_id,
      label: brand.name
    })), [brands]
  );

  if (!user || loadingData) {
    return <PageLoader />;
  }

  return (
    <MerchantAuthGuard requireActive={false}>
      <div className="flex h-screen bg-gray-50">
        <MerchantSidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              
              {/* Header */}
              <div className="mb-8 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <Link 
                    href="/merchant/products" 
                    className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Link>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
                    <p className="mt-1 text-sm text-gray-500">Create a new product for your shop</p>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {errors.general && (
                <Card variant="outlined" className="mb-6 border-red-200 bg-red-50">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-800">{errors.general}</span>
                  </div>
                </Card>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Basic Information */}
                <Card variant="elevated" className="border-l-4 border-l-orange-500">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <Input
                        label="Product Name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter product name"
                        required
                        error={errors.name}
                        variant="outlined"
                        size="md"
                        leftIcon={
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        }
                      />
                    </div>

                    <Input
                      label="Price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      placeholder="0.00"
                      required
                      error={errors.price}
                      variant="outlined"
                      size="md"
                      leftIcon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      }
                    />

                    <Input
                      label="Stock Quantity"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => handleInputChange('stock', e.target.value)}
                      placeholder="0"
                      error={errors.stock}
                      variant="outlined"
                      size="md"
                      leftIcon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      }
                    />

                    <Dropdown
                      label="Category"
                      options={categoryOptions}
                      value={formData.category}
                      onChange={(value) => handleInputChange('category', value)}
                      placeholder="Select category (optional)"
                      variant="outlined"
                      size="md"
                      leftIcon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      }
                    />

                    <Dropdown
                      label="Brand"
                      options={brandOptions}
                      value={formData.brand}
                      onChange={(value) => handleInputChange('brand', value)}
                      placeholder="Select brand (optional)"
                      variant="outlined"
                      size="md"
                      leftIcon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      }
                    />

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Describe your product (optional)"
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-300"
                      />
                    </div>
                  </div>
                </Card>

                {/* Additional Details */}
                <Card variant="elevated" className="border-l-4 border-l-purple-500">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Additional Details</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="SKU"
                      type="text"
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      placeholder="Product SKU (optional)"
                      variant="outlined"
                      size="md"
                      leftIcon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      }
                    />

                    <Input
                      label="Weight (kg)"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.weight}
                      onChange={(e) => handleInputChange('weight', e.target.value)}
                      placeholder="Product weight (optional)"
                      error={errors.weight}
                      variant="outlined"
                      size="md"
                      leftIcon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l3-3m-3 3l-3-3" />
                        </svg>
                      }
                    />

                    <Dropdown
                      label="Status"
                      options={statusOptions}
                      value={formData.status}
                      onChange={(value) => handleInputChange('status', value)}
                      placeholder="Select status"
                      variant="outlined"
                      size="md"
                      leftIcon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      }
                    />
                  </div>

                  {/* Dimensions */}
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">
                      Dimensions (cm) - Optional
                    </h3>
                    {errors.dimensions && (
                      <p className="text-red-500 text-sm mb-3">{errors.dimensions}</p>
                    )}
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        label="Length"
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={formData.dimensions.length}
                        onChange={(e) => handleDimensionChange('length', e.target.value)}
                        placeholder="Length"
                        error={errors['dimensions.length']}
                        variant="outlined"
                        size="md"
                      />
                      <Input
                        label="Width"
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={formData.dimensions.width}
                        onChange={(e) => handleDimensionChange('width', e.target.value)}
                        placeholder="Width"
                        error={errors['dimensions.width']}
                        variant="outlined"
                        size="md"
                      />
                      <Input
                        label="Height"
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={formData.dimensions.height}
                        onChange={(e) => handleDimensionChange('height', e.target.value)}
                        placeholder="Height"
                        error={errors['dimensions.height']}
                        variant="outlined"
                        size="md"
                      />
                    </div>
                  </div>
                </Card>

                {/* Images */}
                <Card variant="elevated" className="border-l-4 border-l-green-500">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Product Images</h2>
                  </div>

                  <div className="space-y-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <Input
                          label={`Image URL ${index + 1}`}
                          type="url"
                          value={image}
                          onChange={(e) => handleImageChange(index, e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          variant="outlined"
                          size="md"
                          className="flex-1"
                          leftIcon={
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          }
                        />
                        {formData.images.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeImageField(index)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={addImageField}
                      className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Add Another Image</span>
                    </button>
                  </div>
                </Card>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4">
                  <Link
                    href="/merchant/products"
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium"
                  >
                    Cancel
                  </Link>
                  
                  <Button
                    type="submit"
                    isLoading={loading}
                    size="lg"
                    className="px-8"
                    leftIcon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    }
                  >
                    {loading ? 'Creating Product...' : 'Create Product'}
                  </Button>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </MerchantAuthGuard>
  );
};

export default AddShopProductPage;