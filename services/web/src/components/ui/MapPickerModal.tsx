import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from './Button';
import Modal from './Modal';

interface MapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  initialLat?: number | null;
  initialLng?: number | null;
  title?: string;
}

// Google Maps types for better TypeScript support
declare global {
  interface Window {
    google: {
      maps: {
        Map: any;
        Marker: any;
        Geocoder: any;
        MapTypeId: any;
        Animation: any;
      };
    };
  }
}

const MapPickerModal: React.FC<MapPickerModalProps> = ({
  isOpen,
  onClose,
  onLocationSelect,
  initialLat = null,
  initialLng = null,
  title = "Select Business Location"
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );

  // Load Google Maps API only when modal opens (Cost Optimization: Load only when needed)
  const loadGoogleMapsAPI = useCallback(() => {
    if (window.google?.maps || document.querySelector('script[src*="maps.googleapis.com"]')) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      // Cost Optimization: Only load essential libraries, use minimal API calls
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDIRIKuP7sSpx3HCIv82UPPSS6PEdCAxXw&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps'));
      document.head.appendChild(script);
    });
  }, []);

  // Initialize map
  const initializeMap = useCallback(async () => {
    if (!mapRef.current || !window.google?.maps) return;

    try {
      setIsLoading(true);
      
      // Default to Cavite (as requested) if no initial coordinates
      const defaultLat = initialLat || 14.4167; // Cavite coordinates
      const defaultLng = initialLng || 120.9047; // Cavite coordinates

      // Create map
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: defaultLat, lng: defaultLng },
        zoom: initialLat && initialLng ? 16 : 12,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
      });

      mapInstanceRef.current = map;
      geocoderRef.current = new window.google.maps.Geocoder();

      // Create marker if initial location exists
      if (initialLat && initialLng) {
        const marker = new window.google.maps.Marker({
          position: { lat: initialLat, lng: initialLng },
          map: map,
          draggable: true,
          animation: window.google.maps.Animation.DROP,
        });

        markerRef.current = marker;

        // Handle marker drag
        marker.addListener('dragend', (event: any) => {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          setSelectedLocation({ lat, lng });
          reverseGeocode(lat, lng);
        });
      }

      // Handle map clicks
      map.addListener('click', (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        updateMarkerPosition(lat, lng);
        setSelectedLocation({ lat, lng });
        reverseGeocode(lat, lng);
      });

      setIsMapLoaded(true);
    } catch (error) {
      console.error('Error initializing map:', error);
    } finally {
      setIsLoading(false);
    }
  }, [initialLat, initialLng]);

  // Update marker position
  const updateMarkerPosition = useCallback((lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;

    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    } else {
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
      });

      markerRef.current = marker;

      marker.addListener('dragend', (event: any) => {
        const newLat = event.latLng.lat();
        const newLng = event.latLng.lng();
        setSelectedLocation({ lat: newLat, lng: newLng });
        reverseGeocode(newLat, newLng);
      });
    }

    // Center map on new position
    mapInstanceRef.current.panTo({ lat, lng });
  }, []);

  // Reverse geocode to get address
  const reverseGeocode = useCallback((lat: number, lng: number) => {
    if (!geocoderRef.current) {
      console.log('Geocoder not available, keeping current location');
      return;
    }

    geocoderRef.current.geocode(
      { location: { lat, lng } },
      (results: any[], status: string) => {
        if (status === 'OK' && results && results[0]) {
          const address = results[0].formatted_address;
          console.log('Reverse geocoded address:', address);
          setSelectedLocation(prev => prev ? { ...prev, address } : { lat, lng, address });
        } else {
          console.log('Reverse geocoding failed with status:', status);
          // Keep the current location even if reverse geocoding fails
          setSelectedLocation(prev => prev ? { ...prev, address: 'Current Location' } : { lat, lng, address: 'Current Location' });
        }
      }
    );
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        console.log('Current location obtained:', lat, lng);
        
        // Set the selected location immediately with a temporary address
        setSelectedLocation({ lat, lng, address: 'Current Location' });
        
        // Update map position if map is loaded
        if (mapInstanceRef.current) {
          updateMarkerPosition(lat, lng);
        }
        
        // Try to get the address via reverse geocoding
        setTimeout(() => {
          reverseGeocode(lat, lng);
        }, 100);
        
        setIsLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Unable to get your current location. Please select manually on the map.';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access was denied. Please allow location access in your browser settings and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please check your GPS settings and try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again or select manually on the map.';
            break;
        }
        
        alert(errorMessage);
        setIsLoading(false);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 60000 
      }
    );
  }, [updateMarkerPosition, reverseGeocode]);

  // Handle modal open
  useEffect(() => {
    if (isOpen && !isMapLoaded) {
      loadGoogleMapsAPI()
        .then(initializeMap)
        .catch(error => {
          console.error('Failed to load Google Maps:', error);
          setIsLoading(false);
        });
    }
  }, [isOpen, isMapLoaded, loadGoogleMapsAPI, initializeMap]);

  // Handle location selection
  const handleConfirmLocation = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation.lat, selectedLocation.lng, selectedLocation.address);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      className="max-w-2xl max-h-[85vh] overflow-hidden"
      titleClassName="text-center"
    >
      <div className="flex flex-col h-[70vh]">
        {/* Map Container - Takes most of the space */}
        <div className="relative flex-1 min-h-0">
          <div
            ref={mapRef}
            className="w-full h-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200"
          />
          
          {/* Loading overlay */}
          {(isLoading || !isMapLoaded) && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mb-2"></div>
                <p className="text-sm text-gray-600">
                  {isLoading ? 'Loading location...' : 'Loading map...'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section - Compact */}
        <div className="flex-shrink-0 mt-4 space-y-4">
          {/* Location Info - Compact */}
          {selectedLocation && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900 text-sm">Location Selected</h4>
                  <p className="text-green-600 text-xs font-mono">
                    {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons - Side by Side */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={getCurrentLocation}
              disabled={isLoading}
              isLoading={isLoading}
              leftIcon={
                !isLoading ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : null
              }
              className="flex-1"
            >
              {isLoading ? 'Getting Location...' : 'Use Current Location'}
            </Button>
            
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmLocation}
              disabled={!selectedLocation}
              className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MapPickerModal;
