import dynamic from 'next/dynamic';
import React from 'react';

// Dynamic imports for heavy components to improve initial load performance
export const DynamicPagination = dynamic(
  () => import('../components/ui/Pagination').then(mod => ({ default: mod.Pagination })),
  {
    loading: () => React.createElement('div', { className: 'animate-pulse h-8 bg-gray-200 rounded' }),
    ssr: false
  }
);

export const DynamicTable = dynamic(
  () => import('../components/ui/Table').then(mod => ({ default: mod.Table })),
  {
    loading: () => React.createElement('div', { className: 'animate-pulse h-32 bg-gray-200 rounded' }),
    ssr: true
  }
);

export const DynamicSidebar = dynamic(
  () => import('../components/ui/Sidebar').then(mod => ({ default: mod.Sidebar })),
  {
    loading: () => React.createElement('div', { className: 'animate-pulse w-64 h-screen bg-gray-200' }),
    ssr: false
  }
);

export const DynamicConfirmationModal = dynamic(
  () => import('../components/ui/ConfirmationModal').then(mod => ({ default: mod.ConfirmationModal })),
  {
    loading: () => null,
    ssr: false
  }
);

export const DynamicNotification = dynamic(
  () => import('../components/ui/Notification'),
  {
    loading: () => null,
    ssr: false
  }
);

export default {
  DynamicPagination,
  DynamicTable,
  DynamicSidebar,
  DynamicConfirmationModal,
  DynamicNotification
};
