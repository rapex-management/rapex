import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';

interface ImageUploadProps {
  label: string;
  images: File[];
  onChange: (images: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  required?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  images,
  onChange,
  maxFiles = 15,
  maxSize = 2, // 2MB default
  required = false,
  error,
  helperText,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      return `Image size must be less than ${maxSize}MB`;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'File must be an image';
    }
    
    const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!acceptedTypes.includes(file.type.toLowerCase())) {
      return 'Only JPG, PNG, and WebP images are supported';
    }
    
    return null;
  }, [maxSize]);

  // Note: Upload happens during form submission, not here
  // const uploadImageToServer = async (file: File): Promise<string> => { ... }

  const handleFileSelection = useCallback(async (newFiles: File[]) => {
    // Validate each file
    for (const file of newFiles) {
      const validationError = validateFile(file);
      if (validationError) {
        setUploadError(validationError);
        return;
      }
    }

    // Check total count
    if (images.length + newFiles.length > maxFiles) {
      setUploadError(`Maximum ${maxFiles} images allowed`);
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      // Upload files to server and update state
      const updatedImages = [...images, ...newFiles];
      onChange(updatedImages);
      
      // Upload to server in background (optional - for immediate preview)
      // The actual upload will happen when the form is submitted
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [images, maxFiles, onChange, validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files);
    }
  }, [handleFileSelection]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      handleFileSelection(files);
    }
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    onChange(updatedImages);
    setUploadError(null);
  };

  // Drag and Drop reordering for images
  const handleImageDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleImageDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (dragIndex !== dropIndex && dragIndex >= 0 && dragIndex < images.length) {
      const updatedImages = [...images];
      const draggedItem = updatedImages[dragIndex];
      if (draggedItem) {
        updatedImages.splice(dragIndex, 1);
        updatedImages.splice(dropIndex, 0, draggedItem);
        onChange(updatedImages);
      }
    }
  };

  const handleClickUpload = () => {
    if (images.length < maxFiles) {
      fileInputRef.current?.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getImagePreviewUrl = (file: File): string => {
    return URL.createObjectURL(file);
  };

  const displayError = error || uploadError;
  const canAddMore = images.length < maxFiles;

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      <div className="mb-3">
        <label className="block text-sm font-semibold text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {helperText && (
          <p className="text-sm text-gray-500 mt-1">{helperText}</p>
        )}
      </div>

      {/* Upload Area */}
      {canAddMore && (
        <div
          className={`
            relative border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer mb-4
            ${isDragOver 
              ? 'border-green-400 bg-green-50/50 scale-[1.02]' 
              : displayError
                ? 'border-red-300 bg-red-50/30'
                : 'border-gray-300 bg-gray-50/30 hover:border-gray-400 hover:bg-gray-50/50'
            }
            hover:scale-[1.01]
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClickUpload}
        >
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* Upload Content */}
          <div className="flex flex-col items-center justify-center py-8 px-6">
            <div className={`
              p-3 rounded-full mb-4 transition-colors
              ${isDragOver 
                ? 'bg-green-100 text-green-600' 
                : 'bg-green-100 text-green-600'
              }
            `}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            <div className="text-center">
              <p className="text-lg font-semibold text-gray-700 mb-2">
                {isDragOver ? 'Drop images here' : 'Upload Product Images'}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Drag & drop your images here, or{' '}
                <span className="text-green-600 font-medium">click to browse</span>
              </p>
              <div className="text-xs text-gray-400">
                <p>Supports JPG, PNG, WebP • Max {maxSize}MB each • Up to {maxFiles} images</p>
                <p>{images.length}/{maxFiles} images uploaded</p>
              </div>
            </div>

            {uploading && (
              <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                  <span className="text-green-600 font-medium">Uploading...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">
              Uploaded Images ({images.length}/{maxFiles})
            </h4>
            {images.length > 1 && (
              <p className="text-xs text-gray-500 flex items-center space-x-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
                <span>Drag to reorder</span>
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div 
                key={index} 
                className="relative group cursor-move"
                draggable
                onDragStart={(e) => handleImageDragStart(e, index)}
                onDragOver={handleImageDragOver}
                onDrop={(e) => handleImageDrop(e, index)}
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 hover:border-green-300 transition-colors">
                  <Image
                    src={getImagePreviewUrl(image)}
                    alt={`Product image ${index + 1}`}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Drag Handle Indicator */}
                <div className="absolute top-1 left-1 p-1 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>

                {/* Image Position Number */}
                <div className="absolute top-1 right-8 px-2 py-1 bg-green-600 text-white text-xs rounded-full font-medium">
                  {index + 1}
                </div>
                
                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                  title="Remove image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Image Info */}
                <div className="mt-1 text-xs text-gray-500 truncate">
                  <p className="font-medium truncate">{image.name}</p>
                  <p>{formatFileSize(image.size)}</p>
                </div>
              </div>
            ))}
          </div>

          {canAddMore && (
            <button
              type="button"
              onClick={handleClickUpload}
              className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add More Images</span>
            </button>
          )}
        </div>
      )}

      {/* Error Message */}
      {displayError && (
        <div className="mt-3 flex items-center space-x-2 text-sm text-red-600">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;