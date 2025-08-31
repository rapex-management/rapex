import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Sidebar } from '../../../components/ui/Sidebar';
import { Table } from '../../../components/ui/Table';
import { Search } from '../../../components/ui/Search';
import { Filter } from '../../../components/ui/Filter';
import { Pagination } from '../../../components/ui/Pagination';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { Card } from '../../../components/ui/Card';
import { merchantService } from '../../../services/merchantService';
import { Merchant, MerchantFilters } from '../../../types/merchant';

interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface MerchantStats {
  total: number;
  active: number;
  pending: number;
  rejected: number;
  banned: number;
  frozen: number;
  deleted: number;
}

const MerchantManagement = () => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MerchantStats>({
    total: 0,
    active: 0,
    pending: 0,
    rejected: 0,
    banned: 0,
    frozen: 0,
    deleted: 0
  });
  const [selectedMerchants, setSelectedMerchants] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortKey, setSortKey] = useState('date_joined');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject' | 'ban' | 'freeze' | 'delete' | 'activate' | 'single_action';
    title: string;
    message: string;
    action?: () => void;
    merchantId?: string;
    status?: number;
  }>({
    isOpen: false,
    type: 'single_action',
    title: '',
    message: ''
  });
  
  const [filters, setFilters] = useState<MerchantFilters>({
    search: '',
    status: '',
    status_filter: '',
    business_registration: '',
    province: '',
    city_municipality: '',
    date_from: '',
    date_to: '',
    ordering: '-date_joined'
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

  const loadMerchants = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: currentPage.toString(),
        page_size: itemsPerPage.toString(),
        ordering: sortDirection === 'desc' ? `-${sortKey}` : sortKey,
        ...Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value !== '')
        )
      };

      const response = await merchantService.getMerchants(params);
      setMerchants(response.results || []);
      setStats(response.stats || {
        total: 0,
        active: 0,
        pending: 0,
        rejected: 0,
        banned: 0,
        frozen: 0,
        deleted: 0,
      });
      
      // Ensure count is a valid number
      const count = typeof response.count === 'number' ? response.count : 0;
      setTotalItems(count);
      setTotalPages(Math.max(1, Math.ceil(count / itemsPerPage)));
    } catch (error) {
      console.error('Error loading merchants:', error);
      // Reset to safe defaults on error
      setMerchants([]);
      setStats({
        total: 0,
        active: 0,
        pending: 0,
        rejected: 0,
        banned: 0,
        frozen: 0,
        deleted: 0,
      });
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, sortKey, sortDirection, filters]);

  useEffect(() => {
    if (user) {
      loadMerchants();
    }
  }, [user, loadMerchants]);

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

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const handleFilterChange = (key: keyof MerchantFilters, value: string) => {
    setFilters((prev: MerchantFilters) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
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
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
        {statusDisplay}
      </span>
    );
  };

  const getActionButtons = (merchant: Merchant) => {
    const buttons = [];

    // View/Edit button (always available)
    buttons.push(
      <button
        key="view"
        onClick={() => router.push(`/admin/merchants/${merchant.id}`)}
        className="text-blue-600 hover:text-blue-900 mr-2"
        title="View/Edit"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>
    );

    // Status-specific buttons
    if (merchant.status === 5) { // Pending
      buttons.push(
        <button
          key="approve"
          onClick={() => openConfirmModal('approve', merchant.id, 0)}
          className="text-green-600 hover:text-green-900 mr-2"
          title="Approve"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </button>,
        <button
          key="reject"
          onClick={() => openConfirmModal('reject', merchant.id, 6)}
          className="text-red-600 hover:text-red-900 mr-2"
          title="Reject"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      );
    } else if (merchant.status === 0) { // Active
      buttons.push(
        <div key="actions" className="relative inline-block text-left">
          <button
            onClick={(e) => {
              e.preventDefault();
              // Toggle dropdown menu
            }}
            className="text-gray-600 hover:text-gray-900 mr-2"
            title="Actions"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      );
    }

    // Remove/Archive button
    if (merchant.status !== 3) { // Not deleted
      buttons.push(
        <button
          key="delete"
          onClick={() => openConfirmModal('delete', merchant.id)}
          className="text-red-600 hover:text-red-900"
          title="Archive"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      );
    }

    return <div className="flex items-center">{buttons}</div>;
  };

  const openConfirmModal = (
    type: 'approve' | 'reject' | 'ban' | 'freeze' | 'delete' | 'activate',
    merchantId?: string,
    status?: number
  ) => {
    const merchantName = merchantId ? merchants.find(m => m.id === merchantId)?.merchant_name : '';
    const isPlural = selectedMerchants.length > 1;
    const count = selectedMerchants.length;

    const messages = {
      approve: isPlural 
        ? `Are you sure you want to approve ${count} selected merchants?`
        : `Are you sure you want to approve "${merchantName}"?`,
      reject: isPlural
        ? `Are you sure you want to reject ${count} selected merchants?`
        : `Are you sure you want to reject "${merchantName}"?`,
      ban: isPlural
        ? `Are you sure you want to ban ${count} selected merchants?`
        : `Are you sure you want to ban "${merchantName}"?`,
      freeze: isPlural
        ? `Are you sure you want to freeze ${count} selected merchants?`
        : `Are you sure you want to freeze "${merchantName}"?`,
      delete: isPlural
        ? `Are you sure you want to archive ${count} selected merchants?`
        : `Are you sure you want to archive "${merchantName}"?`,
      activate: isPlural
        ? `Are you sure you want to activate ${count} selected merchants?`
        : `Are you sure you want to activate "${merchantName}"?`
    };

    setConfirmModal({
      isOpen: true,
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Merchant${isPlural ? 's' : ''}`,
      message: messages[type],
      merchantId,
      status
    });
  };

  const handleConfirmAction = async () => {
    try {
      if (confirmModal.merchantId && confirmModal.status !== undefined) {
        // Single merchant status update
        await merchantService.updateMerchantStatus(confirmModal.merchantId, {
          status: confirmModal.status
        });
      } else if (selectedMerchants.length > 0) {
        // Batch action
        await merchantService.batchAction({
          merchant_ids: selectedMerchants,
          action: confirmModal.type as 'approve' | 'reject' | 'ban' | 'freeze' | 'delete' | 'activate'
        });
        setSelectedMerchants([]);
      }
      
      setConfirmModal({ ...confirmModal, isOpen: false });
      loadMerchants();
    } catch (error) {
      console.error('Error performing action:', error);
    }
  };

  const columns = [
    {
      key: 'merchant_name',
      header: 'Merchant Name',
      sortable: true,
      render: (merchant: Merchant) => (
        <div>
          <div className="font-medium text-gray-900">{merchant.merchant_name}</div>
          <div className="text-sm text-gray-500">{merchant.owner_name}</div>
        </div>
      )
    },
    {
      key: 'email',
      header: 'Contact',
      render: (merchant: Merchant) => (
        <div>
          <div className="text-gray-900">{merchant.email}</div>
          <div className="text-sm text-gray-500">{merchant.phone}</div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (merchant: Merchant) => getStatusBadge(merchant.status, merchant.status_display)
    },
    {
      key: 'location',
      header: 'Location',
      render: (merchant: Merchant) => (
        <div className="text-sm">
          <div>{merchant.city_municipality}</div>
          <div className="text-gray-500">{merchant.province}</div>
        </div>
      )
    },
    {
      key: 'date_joined',
      header: 'Date Joined',
      sortable: true,
      render: (merchant: Merchant) => new Date(merchant.date_joined).toLocaleDateString()
    },
    {
      key: 'document_count',
      header: 'Documents',
      render: (merchant: Merchant) => (
        <span className="text-sm text-gray-600">{merchant.document_count} files</span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (merchant: Merchant) => getActionButtons(merchant)
    }
  ];

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
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Merchant Management</h1>
                  <p className="text-gray-600 mt-2">Manage merchant accounts and applications</p>
                </div>
                <button
                  onClick={() => router.push('/admin/merchants/create')}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add Merchant</span>
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Merchants</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Active Merchants</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.active || 0}</p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Pending Approval</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pending || 0}</p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Rejected</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.rejected || 0}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card className="mb-6">
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <Search
                    value={filters.search}
                    onChange={(value: string) => handleFilterChange('search', value)}
                    placeholder="Search merchants..."
                  />
                  
                  <Filter
                    label="Status"
                    value={filters.status_filter}
                    onChange={(value: string) => handleFilterChange('status_filter', value)}
                    options={[
                      { label: 'Active', value: 'active' },
                      { label: 'Pending', value: 'pending' },
                      { label: 'Rejected', value: 'rejected' },
                      { label: 'Inactive', value: 'inactive' },
                    ]}
                  />
                  
                  <Filter
                    label="Business Registration"
                    value={filters.business_registration}
                    onChange={(value: string) => handleFilterChange('business_registration', value)}
                    options={[
                      { label: 'VAT Included', value: '0' },
                      { label: 'Non-VAT', value: '1' },
                      { label: 'Unregistered', value: '2' },
                    ]}
                  />
                  
                  <Filter
                    label="Province"
                    value={filters.province}
                    onChange={(value: string) => handleFilterChange('province', value)}
                    options={[
                      { label: 'Cavite', value: 'Cavite' },
                      { label: 'Metro Manila', value: 'Metro Manila' },
                      { label: 'Laguna', value: 'Laguna' },
                    ]}
                  />
                </div>
                
                {/* Batch Actions */}
                {selectedMerchants.length > 0 && (
                  <div className="flex items-center space-x-2 pt-4 border-t">
                    <span className="text-sm text-gray-600">
                      {selectedMerchants.length} selected
                    </span>
                    <button
                      onClick={() => openConfirmModal('approve')}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => openConfirmModal('reject')}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => openConfirmModal('ban')}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Ban
                    </button>
                    <button
                      onClick={() => openConfirmModal('freeze')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Freeze
                    </button>
                    <button
                      onClick={() => openConfirmModal('delete')}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Archive
                    </button>
                  </div>
                )}
              </div>
            </Card>

            {/* Merchants Table */}
            <Card>
              <Table
                data={merchants}
                columns={columns}
                loading={loading}
                emptyMessage="No merchants found"
                selectable
                selectedItems={selectedMerchants}
                onSelectionChange={setSelectedMerchants}
                getItemId={(merchant: Merchant) => merchant.id}
                onSort={handleSort}
                sortKey={sortKey}
                sortDirection={sortDirection}
              />
              
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </Card>
          </div>
        </main>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleConfirmAction}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type === 'delete' ? 'danger' : confirmModal.type === 'reject' ? 'warning' : 'info'}
      />
    </div>
  );
};

export default MerchantManagement;
