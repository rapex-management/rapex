import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Sidebar } from '../../../components/ui/Sidebar';
import { Card } from '../../../components/ui/Card';
import { merchantService } from '../../../services/merchantService';

interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface FormData {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  merchant_name: string;
  owner_name: string;
  phone: string;
  zipcode: string;
  province: string;
  city_municipality: string;
  barangay: string;
  street_name: string;
  house_number: string;
  business_registration: number;
}

const CreateMerchant = () => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    merchant_name: '',
    owner_name: '',
    phone: '',
    zipcode: '',
    province: '',
    city_municipality: '',
    barangay: '',
    street_name: '',
    house_number: '',
    business_registration: 2 // Default to Unregistered
  });

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const adminData = localStorage.getItem('admin');
    
    if (!token || !adminData) {
      router.push('/admin/login');
      return;
    }
    
    setUser(JSON.parse(adminData));
  }, [router]);

  const handleLogout = async () => {
    // Use localStorage clear for now to avoid API errors
    localStorage.removeItem('token');
    localStorage.removeItem('refresh');
    localStorage.removeItem('admin');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh');
    router.push('/admin/login');
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.confirm_password) newErrors.confirm_password = 'Confirm password is required';
    if (!formData.merchant_name.trim()) newErrors.merchant_name = 'Merchant name is required';
    if (!formData.owner_name.trim()) newErrors.owner_name = 'Owner name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.province.trim()) newErrors.province = 'Province is required';
    if (!formData.city_municipality.trim()) newErrors.city_municipality = 'City/Municipality is required';
    if (!formData.barangay.trim()) newErrors.barangay = 'Barangay is required';

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    // Password confirmation
    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    // Phone validation
    if (formData.phone && !/^[+]?[\d\s\-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      await merchantService.createMerchant(formData);
      router.push('/admin/merchants');
    } catch (error: unknown) {
      console.error('Error creating merchant:', error);
      if (error instanceof Error && error.message) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'An error occurred while creating the merchant' });
      }
    } finally {
      setSaving(false);
    }
  };

  const sidebarItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/admin/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7z" />
        </svg>
      ),
    },
    {
      id: 'merchants',
      label: 'Merchant Management',
      href: '/admin/merchants',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        items={sidebarItems}
        userInfo={{
          name: user.first_name + ' ' + user.last_name,
          email: user.email,
          role: 'Admin'
        }}
        onLogout={handleLogout}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => router.push('/admin/merchants')}
                className="text-primary-600 hover:text-primary-500 mb-2 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Merchants
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Create New Merchant</h1>
              <p className="text-gray-600 mt-1">Add a new merchant to the system</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* General Error */}
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{errors.general}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Information */}
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 ${
                        errors.username ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'
                      }`}
                    />
                    {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 ${
                        errors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'
                      }`}
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 ${
                        errors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'
                      }`}
                    />
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.confirm_password}
                      onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 ${
                        errors.confirm_password ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'
                      }`}
                    />
                    {errors.confirm_password && <p className="text-red-500 text-sm mt-1">{errors.confirm_password}</p>}
                  </div>
                </div>
              </Card>

              {/* Business Information */}
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Merchant Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.merchant_name}
                      onChange={(e) => handleInputChange('merchant_name', e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 ${
                        errors.merchant_name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'
                      }`}
                    />
                    {errors.merchant_name && <p className="text-red-500 text-sm mt-1">{errors.merchant_name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Owner Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.owner_name}
                      onChange={(e) => handleInputChange('owner_name', e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 ${
                        errors.owner_name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'
                      }`}
                    />
                    {errors.owner_name && <p className="text-red-500 text-sm mt-1">{errors.owner_name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 ${
                        errors.phone ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'
                      }`}
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Registration</label>
                    <select
                      value={formData.business_registration}
                      onChange={(e) => handleInputChange('business_registration', parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value={0}>Registered (VAT Included)</option>
                      <option value={1}>Registered (NON-VAT)</option>
                      <option value={2}>Unregistered</option>
                    </select>
                  </div>
                </div>
              </Card>

              {/* Address Information */}
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Province <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.province}
                      onChange={(e) => handleInputChange('province', e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 ${
                        errors.province ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'
                      }`}
                    />
                    {errors.province && <p className="text-red-500 text-sm mt-1">{errors.province}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City/Municipality <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.city_municipality}
                      onChange={(e) => handleInputChange('city_municipality', e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 ${
                        errors.city_municipality ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'
                      }`}
                    />
                    {errors.city_municipality && <p className="text-red-500 text-sm mt-1">{errors.city_municipality}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Barangay <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.barangay}
                      onChange={(e) => handleInputChange('barangay', e.target.value)}
                      className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 ${
                        errors.barangay ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'
                      }`}
                    />
                    {errors.barangay && <p className="text-red-500 text-sm mt-1">{errors.barangay}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zipcode</label>
                    <input
                      type="text"
                      value={formData.zipcode}
                      onChange={(e) => handleInputChange('zipcode', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Name</label>
                    <input
                      type="text"
                      value={formData.street_name}
                      onChange={(e) => handleInputChange('street_name', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">House Number</label>
                    <input
                      type="text"
                      value={formData.house_number}
                      onChange={(e) => handleInputChange('house_number', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </Card>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => router.push('/admin/merchants')}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Creating...' : 'Create Merchant'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CreateMerchant;
