import React, { useState, useRef, useCallback, memo } from 'react';
import Link from 'next/link';
import { Card } from '../../../components/ui/Card';
import { MerchantAuthGuard } from '../../../lib/auth/guards/MerchantAuthGuard';
import api from '../../../services/api';

interface UploadError {
  row: number;
  field?: string;
  error: string;
}

interface UploadResult {
  success_count: number;
  error_count: number;
  total_rows: number;
  errors: UploadError[];
  message: string;
  processed_data?: Record<string, unknown>[];
}

interface UploadProgress {
  current: number;
  total: number;
  percentage: number;
  stage: 'parsing' | 'validating' | 'uploading' | 'completed';
}

const BulkUploadPage = memo(() => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [previewData, setPreviewData] = useState<string[][] | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const downloadTemplate = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products/csv-template/', {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'product_upload_template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
      setErrors({ template: 'Failed to download template' });
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const parseCSVPreview = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setErrors({ file: 'CSV file must contain at least a header row and one data row' });
        return;
      }
      
      // Parse first few rows for preview
      const previewLines = lines.slice(0, 6); // Header + 5 rows
      const parsedData = previewLines.map(line => {
        // Simple CSV parsing - for production, consider using a proper CSV parser
        return line.split(',').map(cell => cell.trim().replace(/^"(.*)"$/, '$1'));
      });
      
      setPreviewData(parsedData);
      setShowPreview(true);
    };
    reader.readAsText(file);
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    setErrors({});
    setUploadResult(null);
    setPreviewData(null);
    setShowPreview(false);
    
    if (!file.name.endsWith('.csv')) {
      setErrors({ file: 'Please select a CSV file' });
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setErrors({ file: 'File size must be less than 10MB' });
      return;
    }
    
    setSelectedFile(file);
    
    // Parse and preview the file
    parseCSVPreview(file);
  }, [parseCSVPreview]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);



  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const simulateProgress = (stage: UploadProgress['stage'], total: number) => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 10;
      if (current >= total) {
        current = total;
        clearInterval(interval);
      }
      
      setUploadProgress({
        current: Math.min(current, total),
        total,
        percentage: Math.min((current / total) * 100, 100),
        stage
      });
    }, 100);
    
    return new Promise(resolve => {
      setTimeout(() => {
        clearInterval(interval);
        setUploadProgress({
          current: total,
          total,
          percentage: 100,
          stage
        });
        resolve(void 0);
      }, 1000 + Math.random() * 2000);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrors({ file: 'Please select a file to upload' });
      return;
    }

    setLoading(true);
    setUploadResult(null);
    setErrors({});

    try {
      // Simulate parsing progress
      setUploadProgress({ current: 0, total: 100, percentage: 0, stage: 'parsing' });
      await simulateProgress('parsing', 100);
      
      // Simulate validation progress
      setUploadProgress({ current: 0, total: 100, percentage: 0, stage: 'validating' });
      await simulateProgress('validating', 100);
      
      // Simulate upload progress
      setUploadProgress({ current: 0, total: 100, percentage: 0, stage: 'uploading' });
      await simulateProgress('uploading', 100);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await api.post('/products/bulk-upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress({
              current: progressEvent.loaded,
              total: progressEvent.total,
              percentage: percentCompleted,
              stage: 'uploading'
            });
          }
        },
      });

      setUploadProgress({ current: 100, total: 100, percentage: 100, stage: 'completed' });
      setUploadResult(response.data);
      
      // Clear file selection if successful
      if (response.data.error_count === 0) {
        setSelectedFile(null);
        setPreviewData(null);
        setShowPreview(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
      
    } catch (error: unknown) {
      console.error('Error uploading file:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response?: { data?: { message?: string; errors?: UploadError[] } } };
        if (apiError.response?.data) {
          if (apiError.response.data.message) {
            setErrors({ upload: apiError.response.data.message });
          }
          if (apiError.response.data.errors) {
            setUploadResult({
              success_count: 0,
              error_count: apiError.response.data.errors.length,
              total_rows: apiError.response.data.errors.length,
              errors: apiError.response.data.errors,
              message: 'Upload failed with validation errors'
            });
          }
        }
      } else {
        setErrors({ upload: 'Failed to upload file. Please try again.' });
      }
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(null), 3000);
    }
  };

  const getStageLabel = (stage: UploadProgress['stage']) => {
    switch (stage) {
      case 'parsing': return 'Parsing CSV file...';
      case 'validating': return 'Validating product data...';
      case 'uploading': return 'Uploading products...';
      case 'completed': return 'Upload completed!';
      default: return 'Processing...';
    }
  };

  const requiredFields = [
    'name', 'description', 'price', 'stock', 'type', 'category'
  ];

  const optionalFields = [
    'sku', 'brand', 'weight', 'length', 'width', 'height', 'status', 'tags'
  ];

  return (
    <MerchantAuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      {/* Enhanced Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link
                href="/merchant/products"
                className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-purple-600 bg-clip-text text-transparent">
                  Bulk Product Upload
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Upload multiple products at once using a CSV file
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={downloadTemplate}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Template
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Upload Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Card */}
            <Card variant="elevated" className="border-l-4 border-l-purple-500">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg className="h-6 w-6 text-purple-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload CSV File
              </h3>

              {/* File Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                  dragActive
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="mx-auto">
                  <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  
                  {selectedFile ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center space-x-2 text-green-600">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{selectedFile.name}</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xl font-medium text-gray-700">Drop your CSV file here</p>
                      <p className="text-sm text-gray-500 mt-2">or click to browse and select a file</p>
                      <p className="text-xs text-gray-400 mt-1">Maximum file size: 10MB</p>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="mt-6 flex justify-center space-x-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Choose File
                  </button>
                  
                  {selectedFile && (
                    <button
                      onClick={handleUpload}
                      disabled={loading}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Upload Products
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {errors.file && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{errors.file}</p>
                </div>
              )}

              {errors.upload && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{errors.upload}</p>
                </div>
              )}
            </Card>

            {/* Upload Progress */}
            {uploadProgress && (
              <Card variant="glass">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {getStageLabel(uploadProgress.stage)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {uploadProgress.percentage.toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress.percentage}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{uploadProgress.current.toLocaleString()} / {uploadProgress.total.toLocaleString()}</span>
                    <span>{uploadProgress.stage === 'completed' ? 'Complete!' : 'Processing...'}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* CSV Preview */}
            {showPreview && previewData && (
              <Card variant="outlined">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  File Preview (First 5 Rows)
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    {previewData.map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-50' : 'hover:bg-gray-50'}>
                        {row.map((cell: string, cellIndex: number) => (
                          <td
                            key={cellIndex}
                            className={`px-3 py-2 text-sm whitespace-nowrap ${
                              rowIndex === 0 
                                ? 'font-semibold text-gray-900 border-b-2 border-gray-200' 
                                : 'text-gray-700'
                            }`}
                          >
                            {cell || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </table>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  Total rows in file: {previewData.length - 1} products (excluding header)
                </div>
              </Card>
            )}

            {/* Upload Results */}
            {uploadResult && (
              <Card variant="elevated">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    {uploadResult.error_count === 0 ? (
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Upload Results</h4>
                      <p className="text-sm text-gray-600">{uploadResult.message}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{uploadResult.total_rows || uploadResult.success_count + uploadResult.error_count}</p>
                      <p className="text-sm text-blue-600 font-medium">Total Rows</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{uploadResult.success_count}</p>
                      <p className="text-sm text-green-600 font-medium">Successful</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{uploadResult.error_count}</p>
                      <p className="text-sm text-red-600 font-medium">Failed</p>
                    </div>
                  </div>

                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="mt-6">
                      <h5 className="text-md font-semibold text-gray-900 mb-3">Error Details</h5>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {uploadResult.errors.map((error, index) => (
                          <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Row {error.row}
                              </span>
                              {error.field && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                  {error.field}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-red-600 mt-1">{error.error}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {uploadResult.success_count > 0 && (
                    <div className="mt-4 flex space-x-3">
                      <Link
                        href="/merchant/products"
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4-8-4m16 0v10l-8 4-8-4V7m16 0L12 11 4 7" />
                        </svg>
                        View Products
                      </Link>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar - Instructions */}
          <div className="space-y-6">
            <Card variant="gradient">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How it Works
              </h4>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <p className="text-sm text-gray-600">Download the CSV template with the required format</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <p className="text-sm text-gray-600">Fill in your product data following the template structure</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <p className="text-sm text-gray-600">Upload your completed CSV file and review the preview</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                  <p className="text-sm text-gray-600">Click upload and monitor the progress in real-time</p>
                </div>
              </div>
            </Card>

            <Card variant="outlined">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Required Fields</h4>
              <div className="space-y-2">
                {requiredFields.map(field => (
                  <div key={field} className="flex items-center space-x-2">
                    <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 capitalize">{field}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card variant="outlined">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Optional Fields</h4>
              <div className="space-y-2">
                {optionalFields.map(field => (
                  <div key={field} className="flex items-center space-x-2">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-600 capitalize">{field}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card variant="glass">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Tips for Success</h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <svg className="h-5 w-5 text-green-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-gray-600">Use the exact column headers from the template</p>
                </div>
                <div className="flex items-start space-x-3">
                  <svg className="h-5 w-5 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-gray-600">Ensure product names are unique within your shop</p>
                </div>
                <div className="flex items-start space-x-3">
                  <svg className="h-5 w-5 text-purple-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <p className="text-sm text-gray-600">Use decimal format for prices (e.g., 99.99)</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </MerchantAuthGuard>
  );
});

BulkUploadPage.displayName = 'BulkUploadPage';
export default BulkUploadPage;
