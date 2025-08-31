import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Sidebar } from '../../../components/ui/Sidebar';
import { Card } from '../../../components/ui/Card';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { merchantService } from '../../../services/merchantService';
import { Merchant } from '../../../types/merchant';

interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const MerchantDetail = () => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Merchant>>({});
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject' | 'ban' | 'freeze' | 'delete' | 'activate';
    title: string;
    message: string;
    status?: number;
  }>({
    isOpen: false,
    type: 'approve',
    title: '',
    message: ''
  });

  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    const token = localStorage.getItem('token');
    const adminData = localStorage.getItem('admin');
    
    if (!token || !adminData) {
      router.push('/admin/login');
      return;
    }
    
    setUser(JSON.parse(adminData));
  }, [router]);

  const loadMerchant = useCallback(async () => {
    try {
      setLoading(true);
      const merchantData = await merchantService.getMerchant(id as string);
      setMerchant(merchantData);
      setFormData(merchantData);
    } catch (error) {
      console.error('Error loading merchant:', error);
      router.push('/admin/merchants');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (user && id) {
      loadMerchant();
    }
  }, [user, id, loadMerchant]);

  const handleLogout = async () => {
    try {
      const refresh = localStorage.getItem('refresh');
      if (refresh) {
        await fetch('/api/proxy/logout', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({refresh})
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh');
      localStorage.removeItem('admin');
      router.push('/admin/login');
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setFormData(merchant || {});
  };

  const handleSave = async () => {
    if (!merchant) return;
    
    try {
      setSaving(true);
      const updatedMerchant = await merchantService.updateMerchant(merchant.id, formData);
      setMerchant(updatedMerchant);
      setEditing(false);
    } catch (error) {
      console.error('Error updating merchant:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: number) => {
    if (!merchant) return;
    
    try {
      await merchantService.updateMerchantStatus(merchant.id, { status });
      await loadMerchant(); // Reload to get updated data
      setConfirmModal({ ...confirmModal, isOpen: false });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const openConfirmModal = (
    type: 'approve' | 'reject' | 'ban' | 'freeze' | 'delete' | 'activate',
    status: number
  ) => {
    const messages = {
      approve: `Are you sure you want to approve "${merchant?.merchant_name}"?`,
      reject: `Are you sure you want to reject "${merchant?.merchant_name}"?`,
      ban: `Are you sure you want to ban "${merchant?.merchant_name}"?`,
      freeze: `Are you sure you want to freeze "${merchant?.merchant_name}"?`,
      delete: `Are you sure you want to archive "${merchant?.merchant_name}"?`,
      activate: `Are you sure you want to activate "${merchant?.merchant_name}"?`
    };

    setConfirmModal({
      isOpen: true,
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Merchant`,
      message: messages[type],
      status
    });
  };

  const getStatusBadge = (status: number, statusDisplay: string) => {
    const statusColors = {
      0: 'bg-green-100 text-green-800', // Active
      1: 'bg-red-100 text-red-800',     // Banned
      2: 'bg-yellow-100 text-yellow-800', // Frozen
      3: 'bg-gray-100 text-gray-800',   // Deleted
      4: 'bg-blue-100 text-blue-800',   // Unverified
      5: 'bg-orange-100 text-orange-800', // Pending
      6: 'bg-purple-100 text-purple-800'  // Rejected
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
        {statusDisplay}
      </span>
    );
  };

  const getStatusActions = () => {
    if (!merchant) return null;

    const actions = [];

    if (merchant.status === 5) { // Pending
      actions.push(
        <button
          key="approve"
          onClick={() => openConfirmModal('approve', 0)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg mr-2"
        >
          Approve
        </button>,
        <button
          key="reject"
          onClick={() => openConfirmModal('reject', 6)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mr-2"
        >
          Reject
        </button>
      );
    } else if (merchant.status === 0) { // Active
      actions.push(
        <button
          key="ban"
          onClick={() => openConfirmModal('ban', 1)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mr-2"
        >
          Ban
        </button>,
        <button
          key="freeze"
          onClick={() => openConfirmModal('freeze', 2)}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg mr-2"
        >
          Freeze
        </button>
      );
    } else if (merchant.status === 1 || merchant.status === 2) { // Banned or Frozen
      actions.push(
        <button
          key="activate"
          onClick={() => openConfirmModal('activate', 0)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg mr-2"
        >
          Activate
        </button>
      );
    }

    if (merchant.status !== 3) { // Not deleted
      actions.push(
        <button
          key="delete"
          onClick={() => openConfirmModal('delete', 3)}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
        >
          Archive
        </button>
      );
    }

    return actions;
  };

  const sidebarItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/admin',
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

  if (loading || !merchant || !user) {
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
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex justify-between items-start">
                <div>
                  <button
                    onClick={() => router.push('/admin/merchants')}
                    className="text-primary-600 hover:text-primary-500 mb-2 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Merchants
                  </button>
                  <h1 className="text-3xl font-bold text-gray-900">{merchant.merchant_name}</h1>
                  <p className="text-gray-600 mt-1">Merchant Details & Management</p>
                </div>
                <div className="flex items-center space-x-3">
                  {getStatusBadge(merchant.status, merchant.status_display)}
                  {!editing && (
                    <button
                      onClick={handleEdit}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Information */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <Card>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                    {editing && (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Name</label>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.merchant_name || ''}
                          onChange={(e) => setFormData({...formData, merchant_name: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      ) : (
                        <p className="text-gray-900">{merchant.merchant_name}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.owner_name || ''}
                          onChange={(e) => setFormData({...formData, owner_name: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      ) : (
                        <p className="text-gray-900">{merchant.owner_name}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-gray-900">{merchant.email}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.phone || ''}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      ) : (
                        <p className="text-gray-900">{merchant.phone}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                      <p className="text-gray-900">{merchant.username}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Merchant ID</label>
                      <p className="text-gray-900">{merchant.merchant_id || 'N/A'}</p>
                    </div>
                  </div>
                </Card>

                {/* Business Information */}
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Category</label>
                      <p className="text-gray-900">{merchant.business_category_name || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                      <p className="text-gray-900">{merchant.business_type_name || 'N/A'}</p>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Registration</label>
                      <p className="text-gray-900">
                        {merchant.business_registration === 0 ? 'Registered (VAT Included)' :
                         merchant.business_registration === 1 ? 'Registered (NON-VAT)' :
                         'Unregistered'}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Address Information */}
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.province || ''}
                          onChange={(e) => setFormData({...formData, province: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      ) : (
                        <p className="text-gray-900">{merchant.province}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City/Municipality</label>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.city_municipality || ''}
                          onChange={(e) => setFormData({...formData, city_municipality: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      ) : (
                        <p className="text-gray-900">{merchant.city_municipality}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Barangay</label>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.barangay || ''}
                          onChange={(e) => setFormData({...formData, barangay: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      ) : (
                        <p className="text-gray-900">{merchant.barangay}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Zipcode</label>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.zipcode || ''}
                          onChange={(e) => setFormData({...formData, zipcode: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      ) : (
                        <p className="text-gray-900">{merchant.zipcode}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street Name</label>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.street_name || ''}
                          onChange={(e) => setFormData({...formData, street_name: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      ) : (
                        <p className="text-gray-900">{merchant.street_name}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">House Number</label>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.house_number || ''}
                          onChange={(e) => setFormData({...formData, house_number: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      ) : (
                        <p className="text-gray-900">{merchant.house_number}</p>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Documents */}
                {merchant.documents && merchant.documents.length > 0 && (
                  <Card>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
                    <div className="space-y-3">
                      {merchant.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div>
                              <p className="font-medium text-gray-900">{doc.original_filename}</p>
                              <p className="text-sm text-gray-500">
                                {doc.document_type} • {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {doc.verified ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Pending
                              </span>
                            )}
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              {/* Sidebar Information */}
              <div className="space-y-6">
                {/* Status Actions */}
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Actions</h3>
                  <div className="space-y-2">
                    {getStatusActions()}
                  </div>
                </Card>

                {/* Metadata */}
                <Card>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date Joined</label>
                      <p className="text-gray-900">{new Date(merchant.date_joined).toLocaleDateString()}</p>
                    </div>
                    
                    {merchant.verified_at && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Verified At</label>
                        <p className="text-gray-900">{new Date(merchant.verified_at).toLocaleDateString()}</p>
                      </div>
                    )}
                    
                    {merchant.verified_by_name && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Verified By</label>
                        <p className="text-gray-900">{merchant.verified_by_name}</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={() => handleStatusChange(confirmModal.status!)}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type === 'delete' ? 'danger' : confirmModal.type === 'reject' ? 'warning' : 'info'}
      />
    </div>
  );
};

export default MerchantDetail;
