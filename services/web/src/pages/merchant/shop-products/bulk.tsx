import React, { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { MerchantSidebar } from '../../../components/ui/MerchantSidebar';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { MerchantAuthGuard } from '../../../lib/auth/guards/MerchantAuthGuard';
import { useMerchantAuth } from '../../../lib/auth/hooks/useMerchantAuth';
import { merchantAuthService } from '../../../lib/auth/services/merchantAuthService';
import Notification from '../../../components/ui/Notification';
import { useNotification } from '../../../hooks/useNotification';

interface UploadResults {
  successful: number;
  failed: number;
  total: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
}

const BulkUploadPage = () => {
  const { user, refreshToken } = useMerchantAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { notifications, showSuccess, showError, hideNotification } = useNotification();

  // State management
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadResults | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Download template function
  const downloadTemplate = useCallback(async () => {
    try {
      setDownloadingTemplate(true);
      const timestamp = Date.now();
      const apiUrl = `/api/proxy/shop-products/csv-template?_t=${timestamp}`;
      let token = merchantAuthService.getAccessToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      let response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // If we get a 401, try to refresh the token and retry
      if (response.status === 401) {
        const refreshResult = await refreshToken();
        
        if (refreshResult.success) {
          // Get the new token and retry the request
          token = merchantAuthService.getAccessToken();
          
          response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
        } else {
          throw new Error('Session expired. Please log in again.');
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to download template: ${response.status} ${errorText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bulk_upload_template.csv';
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      showSuccess('Template Downloaded', 'Template downloaded successfully!');
    } catch (error) {
      showError('Download Failed', error instanceof Error ? error.message : 'Failed to download template. Please try again.');
    } finally {
      setDownloadingTemplate(false);
    }
  }, [refreshToken, showSuccess, showError]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (file && (file.type === 'text/csv' || 
          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.type === 'application/vnd.ms-excel')) {
        setSelectedFile(file);
        setUploadResults(null);
      } else {
        showError('Invalid File Type', 'Please select a valid CSV or Excel file.');
      }
    }
  }, [showError]);

  // File selection handler
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file) {
        setSelectedFile(file);
        setUploadResults(null);
      }
    }
  }, []);

  // Upload handler with token refresh support
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    const performUpload = async (token: string): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
          }
        });

        // Handle response
        xhr.addEventListener('load', () => {
          if (xhr.status === 200 || xhr.status === 400) {
            const response = JSON.parse(xhr.responseText);
            // Transform backend response format to frontend format
            const transformedResponse = {
              successful: response.success_count || 0,
              failed: response.error_count || 0,
              total: response.total_rows || 0,
              errors: (response.errors || []).map((error: Record<string, unknown>) => ({
                row: error.row || 'unknown',
                message: error.error || error.message || 'Unknown error'
              }))
            };
            setUploadResults(transformedResponse);
            
            if (transformedResponse.successful > 0) {
              showSuccess('Upload Complete', `Upload completed! ${transformedResponse.successful} products imported successfully.`);
            } else {
              showError('Upload Failed', `Upload failed. ${transformedResponse.failed} errors occurred. Please check the file and try again.`);
            }
            
            setSelectedFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            resolve(true);
          } else if (xhr.status === 401) {
            // Token expired, need to refresh
            resolve(false);
          } else {
            const errorResponse = JSON.parse(xhr.responseText);
            showError('Upload Failed', errorResponse.message || 'Upload failed. Please try again.');
            resolve(true); // Don't retry for other errors
          }
          setUploadProgress(100);
        });

        xhr.addEventListener('error', () => {
          showError('Network Error', 'Network error occurred. Please check your connection and try again.');
          reject(new Error('Network error'));
        });

        // Send request
        xhr.open('POST', '/api/proxy/shop-products/bulk-upload');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });
    };

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const token = merchantAuthService.getAccessToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      // Try upload with current token
      const uploadSuccess = await performUpload(token);
      
      // If failed due to 401, try refreshing token and retry
      if (!uploadSuccess) {
        const refreshResult = await refreshToken();
        
        if (refreshResult.success) {
          // Get the new token and retry the upload
          const newToken = merchantAuthService.getAccessToken();
          
          if (!newToken) {
            throw new Error('Failed to get new token after refresh. Please log in again.');
          }
          
          await performUpload(newToken);
        } else {
          throw new Error('Session expired. Please log in again.');
        }
      }

    } catch (error) {
      showError('Upload Error', error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, refreshToken, showSuccess, showError]);

  if (!user) {
    return null;
  }

  return (
    <MerchantAuthGuard requireActive={false}>
      <div className="flex h-screen bg-gray-50">
        <MerchantSidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              
              {/* Header */}
              <div className="mb-8 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <Link 
                    href="/merchant/shop-products" 
                    className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Link>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Bulk Upload Shop Products</h1>
                    <p className="mt-1 text-sm text-gray-500">Import multiple products efficiently using CSV or Excel files</p>
                  </div>
                </div>
                <Link
                  href="/merchant/shop-products/add"
                  className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Individual Product</span>
                </Link>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Column - Instructions */}
                <div className="space-y-6">
                  
                  {/* Import Instructions */}
                  <Card variant="elevated" className="border-l-4 border-l-blue-500">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900">Import Instructions</h2>
                    </div>
                    <p className="text-gray-600 mb-6">Follow these steps for successful bulk upload</p>

                    {/* Supported File Formats */}
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Supported File Formats</h3>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">CSV (.csv)</span>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Excel (.xlsx)</span>
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">Excel (.xls)</span>
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                          1
                        </div>
                        <div>
                          <p className="text-gray-700 font-medium">Download the template file to see the required column format</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                          2
                        </div>
                        <div>
                          <p className="text-gray-700 font-medium">Fill in your product data following the column headers exactly</p>
                          <p className="text-gray-500 text-sm mt-1">Make sure all required fields are filled and data formats are correct</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                          3
                        </div>
                        <div>
                          <p className="text-gray-700 font-medium">Upload your completed file (max 20MB)</p>
                          <p className="text-gray-500 text-sm mt-1">File will be processed and validated before import</p>
                        </div>
                      </div>
                    </div>

                    {/* Download Template Button */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <Button
                        onClick={downloadTemplate}
                        isLoading={downloadingTemplate}
                        variant="outline"
                        size="md"
                        className="w-full"
                        leftIcon={
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                          </svg>
                        }
                      >
                        {downloadingTemplate ? 'Downloading...' : 'Download CSV Template'}
                      </Button>
                    </div>
                  </Card>

                  {/* File Requirements */}
                  <Card variant="elevated" className="border-l-4 border-l-yellow-500">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Important Notes</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start space-x-2">
                        <span className="text-yellow-500 mt-1">•</span>
                        <span>Maximum file size: 20MB</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-yellow-500 mt-1">•</span>
                        <span>Required fields: Product Name, Price, Stock</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-yellow-500 mt-1">•</span>
                        <span>Use proper number formats for prices and quantities</span>
                      </li>
                    </ul>
                  </Card>
                  
                </div>

                {/* Right Column - Upload Section */}
                <div className="space-y-6">
                  
                  {/* Upload Products File */}
                  <Card variant="elevated" className="border-l-4 border-l-orange-500">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900">Upload Products File</h2>
                    </div>
                    <p className="text-gray-600 mb-6">Select your CSV or Excel file to import</p>

                    {/* File Drop Zone */}
                    <div 
                      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                        isDragOver 
                          ? 'border-orange-400 bg-orange-50' 
                          : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l3 3m0 0l3-3m-3 3V9" />
                          </svg>
                        </div>
                        
                        {selectedFile ? (
                          <div className="space-y-2">
                            <p className="text-lg font-medium text-gray-900">
                              {selectedFile.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <Button
                              onClick={() => setSelectedFile(null)}
                              variant="outline"
                              size="sm"
                              className="mt-2"
                            >
                              Remove File
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-lg font-medium text-gray-700">
                              Drag and drop your file here
                            </p>
                            <p className="text-sm text-gray-500">
                              or click to browse for files
                            </p>
                            <p className="text-xs text-gray-400">
                              Supports CSV, XLSX, XLS files up to 20MB
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Upload Button */}
                    {selectedFile && (
                      <div className="mt-6">
                        <Button
                          onClick={handleUpload}
                          isLoading={isUploading}
                          size="lg"
                          className="w-full"
                          leftIcon={
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          }
                        >
                          {isUploading ? 'Uploading and Processing...' : 'Upload and Process File'}
                        </Button>
                      </div>
                    )}

                    {/* Upload Progress */}
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Upload Progress</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-orange-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Upload Results */}
                  {uploadResults && (
                    <Card variant="elevated" className="border-l-4 border-l-green-500">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Upload Results</h3>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{uploadResults.successful}</div>
                          <div className="text-sm text-green-700">Successful</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">{uploadResults.failed}</div>
                          <div className="text-sm text-red-700">Failed</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{uploadResults.total}</div>
                          <div className="text-sm text-blue-700">Total</div>
                        </div>
                      </div>

                      {uploadResults.errors.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Errors:</h4>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {uploadResults.errors.map((error, index) => (
                              <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                Row {error.row}: {error.message}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  )}
                  
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      
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

export default BulkUploadPage;