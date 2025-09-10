import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from './Button';
import Modal from './Modal';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageData: string) => void;
  title?: string;
}

const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = "Take Selfie with ID"
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Cleanup camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clean up video element event listeners
    if (videoRef.current) {
      const video = videoRef.current as HTMLVideoElement & { _cleanup?: () => void };
      if (video._cleanup) {
        video._cleanup();
        video._cleanup = undefined;
      }
      video.srcObject = null;
    }
    
    setIsCameraActive(false);
    setError(null);
  }, []);

  // Start camera with optimized settings
  const startCamera = useCallback(async (retryCount = 0) => {
    try {
      setIsLoading(true);
      setError(null);
      setCapturedImage(null);
      
      console.log('Requesting camera access...', retryCount > 0 ? `(retry ${retryCount})` : '');
      
      // Check if video element is available
      if (!videoRef.current) {
        if (retryCount < 3) {
          console.warn('Video element not available, retrying...');
          setTimeout(() => startCamera(retryCount + 1), 200);
          return;
        } else {
          throw new Error('Video element not available after retries');
        }
      }
      
      // Request camera with optimal settings for document capture
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user', // Front camera for selfie
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      console.log('Camera stream obtained:', stream);

      if (videoRef.current) {
        // Set up video element event handlers
        const video = videoRef.current;
        
        // Handle when video can play
        const handleCanPlay = () => {
          console.log('Video can play - camera ready');
          setIsCameraActive(true);
          setIsLoading(false);
        };
        
        // Handle video load start
        const handleLoadStart = () => {
          console.log('Video load started');
        };
        
        // Handle video error
        const handleVideoError = (e: Event) => {
          console.error('Video error:', e);
          setError('Failed to display camera feed. Please try again.');
          setIsLoading(false);
          stopCamera();
        };

        // Add event listeners
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('loadstart', handleLoadStart);
        video.addEventListener('error', handleVideoError);
        
        // Set stream and play
        video.srcObject = stream;
        streamRef.current = stream;
        
        // Try to play the video
        try {
          await video.play();
          console.log('Video play started');
        } catch (playError) {
          console.error('Video play error:', playError);
          // Sometimes autoplay fails, but that's okay - user can still see the feed
        }
        
        // Cleanup function for event listeners
        const cleanup = () => {
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('loadstart', handleLoadStart);
          video.removeEventListener('error', handleVideoError);
        };
        
        // Store cleanup function for later use
        (video as HTMLVideoElement & { _cleanup?: () => void })._cleanup = cleanup;
        
        // Fallback timeout - if video doesn't start in 5 seconds, assume it's working
        const fallbackTimeout = setTimeout(() => {
          if (!isCameraActive && stream.active) {
            console.log('Fallback: Assuming camera is working');
            setIsCameraActive(true);
            setIsLoading(false);
          }
        }, 5000);
        
        // Clear timeout when camera becomes active
        if (isCameraActive) {
          clearTimeout(fallbackTimeout);
        }
        
      }
      
      streamRef.current = stream;
    } catch (err) {
      console.error('Camera access error:', err);
      let errorMessage = 'Unable to access camera. ';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage += 'Please allow camera access and try again.';
        } else if (err.name === 'NotFoundError') {
          errorMessage += 'No camera found on this device.';
        } else if (err.name === 'NotSupportedError') {
          errorMessage += 'Camera not supported on this browser.';
        } else {
          errorMessage += 'Please check your camera settings.';
        }
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [isCameraActive, stopCamera]);

  // Capture photo with optimized quality
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 with high quality
    const imageData = canvas.toDataURL('image/jpeg', 0.85);
    
    setCapturedImage(imageData);
    stopCamera();
    
    setTimeout(() => setIsCapturing(false), 300);
  }, [stopCamera]);

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  // Save and close modal
  const handleSave = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  }, [capturedImage, onCapture, onClose]);

  // Handle modal close
  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setError(null);
    onClose();
  }, [stopCamera, onClose]);

  // Auto-start camera when modal opens
  useEffect(() => {
    if (isOpen && !isCameraActive && !capturedImage && !error) {
      // Small delay to ensure video element is rendered
      const timer = setTimeout(() => {
        startCamera();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, isCameraActive, capturedImage, error, startCamera]);

  // Cleanup on modal close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setError(null);
    }
  }, [isOpen, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="lg"
      className="max-w-3xl"
      titleCentered={true}
    >
      <div className="flex flex-col h-[70vh]">
        {/* Main Content Area */}
        <div className="flex-1 bg-gray-50 rounded-xl overflow-hidden">
          {error ? (
            // Error State
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Camera Access Failed</h3>
              <p className="text-sm text-red-600 mb-6 max-w-sm">{error}</p>
              <Button
                type="button"
                onClick={() => startCamera()}
                disabled={isLoading}
                isLoading={isLoading}
                className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
              >
                {isLoading ? 'Trying Again...' : 'Try Again'}
              </Button>
            </div>
          ) : capturedImage ? (
            // Photo Captured - Preview
            <div className="relative h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedImage}
                alt="Captured selfie with ID"
                className="w-full h-full object-cover"
              />
              
              {/* Success Badge */}
              <div className="absolute top-4 right-4">
                <div className="bg-green-500 text-white rounded-full p-3 shadow-lg">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {/* Photo Quality Indicator */}
              <div className="absolute top-4 left-4">
                <div className="bg-black/70 text-white rounded-lg px-3 py-2">
                  <p className="text-sm font-medium">📸 Photo Captured</p>
                </div>
              </div>
            </div>
          ) : (
            // Camera Loading or Active State
            <div className="relative h-full bg-black">
              {/* Video element - always present for camera access */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isCameraActive ? 'visible' : 'invisible'}`}
                onLoadedMetadata={() => {
                  console.log('Video metadata loaded');
                }}
                onPlaying={() => {
                  console.log('Video is playing');
                  if (!isCameraActive) {
                    setIsCameraActive(true);
                    setIsLoading(false);
                  }
                }}
              />
              
              {/* Loading overlay when camera is starting */}
              {isLoading && (
                <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h3 className="text-xl font-semibold text-white mb-2">Starting Camera...</h3>
                    <p className="text-gray-300 text-sm">
                      Please allow camera access when prompted
                    </p>
                  </div>
                </div>
              )}
              
              {/* Camera Active UI */}
              {isCameraActive && (
                <>
                  {/* Camera Guidelines Overlay */}
                  <div className="absolute top-4 left-4 right-4">
                    <div className="bg-black/70 text-white rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium">
                          Hold your ID next to your face • Make sure both are clearly visible and well-lit
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Capture Frame Guide */}
                  <div className="absolute inset-4 border-2 border-white/30 rounded-xl pointer-events-none">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-orange-500 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-orange-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-orange-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-orange-500 rounded-br-lg"></div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="flex-shrink-0 pt-6 space-y-4">
          {/* Requirements */}
          {!capturedImage && !error && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Photo Requirements</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-blue-800">
                        <ul className="space-y-1">
                            <li>• Hold your ID document next to your face</li>
                            <li>• Ensure good lighting and clear visibility</li>
                        </ul>
                        <ul className="space-y-1">
                            <li>• Both your face and ID text should be readable</li>
                            <li>• Keep steady and avoid blurry images</li>
                        </ul>
                    </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              onClick={capturedImage ? retakePhoto : handleClose}
              className="px-6"
            >
              {capturedImage ? 'Retake Photo' : 'Cancel'}
            </Button>

            {capturedImage ? (
              <Button
                type="button"
                onClick={handleSave}
                className="px-8 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                leftIcon={
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                }
              >
                Save Photo
              </Button>
            ) : isCameraActive ? (
              <Button
                type="button"
                onClick={capturePhoto}
                disabled={isCapturing}
                isLoading={isCapturing}
                className="px-8 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                leftIcon={
                  !isCapturing ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ) : null
                }
              >
                {isCapturing ? 'Capturing...' : 'Take Photo'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </Modal>
  );
};

export default CameraCaptureModal;
