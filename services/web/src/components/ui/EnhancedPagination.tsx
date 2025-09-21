import React, { memo, useCallback, useMemo, useState } from 'react';
import { Button } from './Button';

interface EnhancedPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  className?: string;
  showItemsPerPage?: boolean;
  showJumpToPage?: boolean;
  showFirstLast?: boolean;
  itemsPerPageOptions?: number[];
  isLoading?: boolean;
}

export const EnhancedPagination: React.FC<EnhancedPaginationProps> = memo(({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className = "",
  showItemsPerPage = true,
  showJumpToPage = true,
  showFirstLast = true,
  itemsPerPageOptions = [10, 25, 50, 100],
  isLoading = false
}) => {
  const [jumpToPageValue, setJumpToPageValue] = useState('');
  const [showJumpInput, setShowJumpInput] = useState(false);

  // Defensive programming: ensure all values are valid numbers
  const safeCurrentPage = Math.max(1, Math.min(Number(currentPage) || 1, totalPages));
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const safeTotalItems = Math.max(0, Number(totalItems) || 0);
  const safeItemsPerPage = Math.max(1, Number(itemsPerPage) || 25);
  
  const startItem = safeTotalItems === 0 ? 0 : (safeCurrentPage - 1) * safeItemsPerPage + 1;
  const endItem = Math.min(safeCurrentPage * safeItemsPerPage, safeTotalItems);

  // Memoized page numbers calculation for performance
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 7;
    
    if (safeTotalPages <= maxVisible) {
      for (let i = 1; i <= safeTotalPages; i++) {
        pages.push(i);
      }
    } else {
      const sidePages = Math.floor((maxVisible - 1) / 2);
      let start = Math.max(1, safeCurrentPage - sidePages);
      let end = Math.min(safeTotalPages, safeCurrentPage + sidePages);
      
      // Adjust if we're near the beginning or end
      if (end - start + 1 < maxVisible) {
        if (start === 1) {
          end = Math.min(safeTotalPages, start + maxVisible - 1);
        } else {
          start = Math.max(1, end - maxVisible + 1);
        }
      }
      
      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < safeTotalPages) {
        if (end < safeTotalPages - 1) pages.push('...');
        pages.push(safeTotalPages);
      }
    }
    
    return pages;
  }, [safeCurrentPage, safeTotalPages]);

  const handleJumpToPage = useCallback(() => {
    const page = parseInt(jumpToPageValue);
    if (page >= 1 && page <= safeTotalPages) {
      onPageChange(page);
      setJumpToPageValue('');
      setShowJumpInput(false);
    }
  }, [jumpToPageValue, safeTotalPages, onPageChange]);

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    if (onItemsPerPageChange) {
      onItemsPerPageChange(newItemsPerPage);
      // Reset to first page when changing items per page
      onPageChange(1);
    }
  }, [onItemsPerPageChange, onPageChange]);

  // Show pagination even with 0 items to display the controls
  if (safeTotalItems === 0) {
    return (
      <div className={`flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 bg-white px-4 py-4 sm:px-6 ${className}`}>
        <div className="text-sm text-gray-700">
          No items found
        </div>
        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Show:</span>
            <select
              value={safeItemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              disabled={isLoading}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              {itemsPerPageOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 bg-white px-4 py-4 sm:px-6 ${className}`}>
      {/* Items info and controls */}
      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6 mb-4 sm:mb-0">
        <div className="text-sm text-gray-700">
          Showing <span className="font-semibold">{startItem.toLocaleString()}</span> to{' '}
          <span className="font-semibold">{endItem.toLocaleString()}</span> of{' '}
          <span className="font-semibold">{safeTotalItems.toLocaleString()}</span> results
        </div>
        
        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Show:</span>
            <select
              value={safeItemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              disabled={isLoading}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              {itemsPerPageOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        )}

        {showJumpToPage && (
          <div className="flex items-center space-x-2">
            {!showJumpInput ? (
              <button
                onClick={() => setShowJumpInput(true)}
                disabled={isLoading}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                Jump to page
              </button>
            ) : (
              <div className="flex items-center space-x-1">
                <span className="text-sm text-gray-700">Go to:</span>
                <input
                  type="number"
                  min="1"
                  max={safeTotalPages}
                  value={jumpToPageValue}
                  onChange={(e) => setJumpToPageValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleJumpToPage()}
                  disabled={isLoading}
                  className="w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  placeholder="1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleJumpToPage}
                  disabled={isLoading || !jumpToPageValue}
                >
                  Go
                </Button>
                <button
                  onClick={() => {
                    setShowJumpInput(false);
                    setJumpToPageValue('');
                  }}
                  disabled={isLoading}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation controls */}
      <div className="flex items-center space-x-1">
        {/* First page */}
        {showFirstLast && safeCurrentPage > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={isLoading}
            title="First page"
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            }
          >
            First
          </Button>
        )}

        {/* Previous page */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1 || isLoading}
          title="Previous page"
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          }
        >
          Previous
        </Button>

        {/* Page numbers */}
        <div className="flex items-center space-x-1">
          {pageNumbers.map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-3 py-2 text-sm text-gray-500">...</span>
              ) : (
                <button
                  onClick={() => onPageChange(page as number)}
                  disabled={isLoading}
                  className={`
                    px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                    ${safeCurrentPage === page
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}
                  `}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Next page */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === safeTotalPages || isLoading}
          title="Next page"
          rightIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          }
        >
          Next
        </Button>

        {/* Last page */}
        {showFirstLast && safeCurrentPage < safeTotalPages && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(safeTotalPages)}
            disabled={isLoading}
            title="Last page"
            rightIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            }
          >
            Last
          </Button>
        )}
      </div>
    </div>
  );
});

EnhancedPagination.displayName = 'EnhancedPagination';