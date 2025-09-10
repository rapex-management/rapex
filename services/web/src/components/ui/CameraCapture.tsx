import React, { useState, useCallback } from 'react';
import { Button } from './Button';
import CameraCaptureModal from './CameraCaptureModal';

interface CameraCaptureProps {
  label: string;
  value?: string | null; // Base64 image data
  onChange: (imageData: string | null) => void;
  required?: boolean;
  helperText?: string;
  className?: string;
  disabled?: boolean;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  label,
  value,
  onChange,
  required = false,
  helperText,
  className = '',
  disabled = false
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle photo capture from modal
  const handleCapture = useCallback((imageData: string) => {
    onChange(imageData);
    setIsModalOpen(false);
  }, [onChange]);

  // Handle retake/start camera
  const handleStartCamera = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  // Handle remove photo
  const handleRemovePhoto = useCallback(() => {
    onChange(null);
  }, [onChange]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-900">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {value && (
          <button
            type="button"
            onClick={handleRemovePhoto}
            disabled={disabled}
            className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
          >
            Remove Photo
          </button>
        )}
      </div>

      {/* Helper Text */}
      {helperText && (
        <p className="text-sm text-gray-600">{helperText}</p>
      )}

      {/* Main Content Area */}
      <div className="relative bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden">
        {value ? (
          // Photo Preview
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Captured selfie with ID"
              className="w-full h-64 object-cover rounded-lg"
            />
            
            {/* Success Overlay */}
            <div className="absolute top-4 right-4">
              <div className="bg-green-500 text-white rounded-full p-2 shadow-lg">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {/* Photo Actions Overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <Button
                type="button"
                variant="outline"
                onClick={handleStartCamera}
                disabled={disabled}
                className="bg-white/90 hover:bg-white border-white text-gray-700 shadow-lg"
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                }
              >
                Retake Photo
              </Button>
            </div>
          </div>
        ) : (
          // Initial State - Start Camera Button
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Take a Selfie with ID</h3>
            <p className="text-sm text-gray-600 mb-8 max-w-md leading-relaxed">
              Hold your ID next to your face and take a clear photo. Make sure both your face and ID are clearly visible and readable.
            </p>
            <Button
              type="button"
              onClick={handleStartCamera}
              disabled={disabled}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 px-8 py-3 text-base font-semibold shadow-lg transform hover:scale-[1.02] transition-all duration-200"
            >
              Start Camera
            </Button>
          </div>
        )}
      </div>

      {/* Requirements/Tips */}
      {!value && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Photo Requirements</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Hold your ID document next to your face</li>
                <li>• Ensure good lighting and clear visibility</li>
                <li>• Both your face and ID text should be readable</li>
                <li>• Use front-facing camera for best results</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCapture={handleCapture}
        title={label}
      />
    </div>
  );
};

export default CameraCapture;
