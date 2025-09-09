import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Button } from './Button';
import Modal from './Modal';
import { GOOGLE_MAPS_CONFIG, loadGoogleMapsAPI } from '../../config/maps';

interface MapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  initialLat?: number | null;
  initialLng?: number | null;
  title?: string;
}

// Enhanced Google Maps types for better TypeScript support and type safety
declare global {
  interface Window {
    google: {
      maps: {
        Map: typeof google.maps.Map;
        Marker: typeof google.maps.Marker;
        Geocoder: typeof google.maps.Geocoder;
        MapTypeId: typeof google.maps.MapTypeId;
        Animation: typeof google.maps.Animation;
        event: typeof google.maps.event;
        ControlPosition: typeof google.maps.ControlPosition;
        Size: typeof google.maps.Size;
        Point: typeof google.maps.Point;
      };
      mapsInstance?: google.maps.Map;
    };
    googleMapsLoaded?: boolean;
    initGoogleMaps?: () => void;
  }
}

// Cost-efficient configuration constants

const MapPickerModal: React.FC<MapPickerModalProps> = ({
  isOpen,
  onClose,
  onLocationSelect,
  initialLat = null,
  initialLng = null,
  title = "Select Business Location"
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const reverseGeocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // Memoize initial location to prevent unnecessary re-renders
  const initialLocation = useMemo(() => 
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null,
    [initialLat, initialLng]
  );

  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(initialLocation);

  // SUPER COST-EFFICIENT: Load Google Maps API only when modal opens

  // Debounced reverse geocoding for cost efficiency
  const debouncedReverseGeocode = useCallback((lat: number, lng: number) => {
    if (reverseGeocodeTimeoutRef.current) {
      clearTimeout(reverseGeocodeTimeoutRef.current);
    }

    reverseGeocodeTimeoutRef.current = setTimeout(() => {
      if (!geocoderRef.current) return;

      geocoderRef.current.geocode(
        { 
          location: { lat, lng },
          region: 'PH' // Philippines region for better results
        },
        (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
          if (status === 'OK' && results && results[0]) {
            const address = results[0].formatted_address;
            setSelectedLocation(prev => prev ? { ...prev, address } : { lat, lng, address });
          } else {
            setSelectedLocation(prev => prev ? { ...prev, address: 'Selected Location' } : { lat, lng, address: 'Selected Location' });
          }
        }
      );
    }, GOOGLE_MAPS_CONFIG.REVERSE_GEOCODE_DEBOUNCE);
  }, []);

  // Update marker position with optimized performance
  const updateMarkerPosition = useCallback((lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;

    if (markerRef.current) {
      // Reuse existing marker for better performance
      markerRef.current.setPosition({ lat, lng });
    } else {
      // Create new marker with optimal settings
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
        title: 'Selected Location - Drag to adjust',
        optimized: true, // Use optimized rendering
        icon: {
          // Custom red pin icon for clear visibility (Default Google Maps style)
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#FF0000" stroke="#FFFFFF" stroke-width="1"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 32)
        }
      });

      markerRef.current = marker;

      // Handle marker drag with debounced geocoding
      marker.addListener('dragend', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          const newLat = event.latLng.lat();
          const newLng = event.latLng.lng();
          setSelectedLocation({ lat: newLat, lng: newLng });
          debouncedReverseGeocode(newLat, newLng);
        }
      });
    }

    // Smooth pan to new position
    mapInstanceRef.current.panTo({ lat, lng });
  }, [debouncedReverseGeocode]);

  // Initialize map with maximum optimization
  const initializeMap = useCallback(async () => {
    if (!mapRef.current || !window.google?.maps || isInitializedRef.current) return;

    try {
      setIsLoading(true);
      
      // Determine initial center and zoom
      const center = initialLocation || GOOGLE_MAPS_CONFIG.DEFAULT_CENTER;
      const zoom = initialLocation ? GOOGLE_MAPS_CONFIG.MARKER_ZOOM : GOOGLE_MAPS_CONFIG.DEFAULT_ZOOM;

      // Create map with optimized settings
      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        minZoom: GOOGLE_MAPS_CONFIG.MIN_ZOOM,
        maxZoom: GOOGLE_MAPS_CONFIG.MAX_ZOOM,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        ...GOOGLE_MAPS_CONFIG.MAP_OPTIONS
      });

      mapInstanceRef.current = map;
      geocoderRef.current = new window.google.maps.Geocoder();
      isInitializedRef.current = true;

      // Create marker if initial location exists
      if (initialLocation) {
        updateMarkerPosition(initialLocation.lat, initialLocation.lng);
        if (!selectedLocation?.address) {
          debouncedReverseGeocode(initialLocation.lat, initialLocation.lng);
        }
      }

      // Handle map clicks with optimized event handling
      map.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          updateMarkerPosition(lat, lng);
          setSelectedLocation({ lat, lng });
          debouncedReverseGeocode(lat, lng);
        }
      });

      // Add custom zoom instruction overlay
      if (map.controls && window.google.maps.ControlPosition.TOP_CENTER !== undefined) {
        const instructionDiv = document.createElement('div');
        instructionDiv.innerHTML = `
          <div style="
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-family: Arial, sans-serif;
            margin: 10px;
            pointer-events: none;
          ">
            Ctrl + Scroll to zoom
          </div>
        `;
        if (map.controls && window.google.maps.ControlPosition.TOP_CENTER !== undefined) {
          const topCenterControls = map.controls[window.google.maps.ControlPosition.TOP_CENTER];
          if (topCenterControls) {
            topCenterControls.push(instructionDiv);
          }
        }
      }

      setIsMapLoaded(true);
    } catch (error) {
      console.error('Error initializing map:', error);
    } finally {
      setIsLoading(false);
    }
  }, [initialLocation, selectedLocation?.address, updateMarkerPosition, debouncedReverseGeocode]);

  // High-performance current location with user-friendly error handling
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser. Please select location manually on the map.');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Immediately set location and update map
        setSelectedLocation({ lat, lng, address: 'Getting address...' });
        
        if (mapInstanceRef.current) {
          updateMarkerPosition(lat, lng);
        }
        
        // Get address with debounced geocoding
        debouncedReverseGeocode(lat, lng);
        setIsLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Unable to get your current location. Please select manually on the map.';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please allow location access and try again, or select manually on the map.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please check your GPS settings or select manually on the map.';
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
        timeout: 10000, 
        maximumAge: 300000 // 5 minutes cache for efficiency
      }
    );
  }, [updateMarkerPosition, debouncedReverseGeocode]);

  // Handle modal open with optimized loading and error handling
  useEffect(() => {
    if (isOpen && !isMapLoaded && !isInitializedRef.current) {
      setMapError(null); // Clear any previous errors
      loadGoogleMapsAPI()
        .then(initializeMap)
        .catch(error => {
          console.error('Failed to load Google Maps:', error);
          setMapError(error.message || 'Failed to load Google Maps. Please check your internet connection.');
          setIsLoading(false);
        });
    }
    
    // IMPORTANT: Reset to initial location when modal reopens
    if (isOpen && initialLocation && !selectedLocation) {
      setSelectedLocation(initialLocation);
    }
  }, [isOpen, isMapLoaded, initializeMap, initialLocation, selectedLocation]);

  // Cleanup on modal close to prevent memory leaks
  useEffect(() => {
    if (!isOpen) {
      // Clear any pending timeouts
      if (reverseGeocodeTimeoutRef.current) {
        clearTimeout(reverseGeocodeTimeoutRef.current);
      }
    }
  }, [isOpen]);

  // Handle location selection
  const handleConfirmLocation = useCallback(() => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation.lat, selectedLocation.lng, selectedLocation.address);
      onClose();
    }
  }, [selectedLocation, onLocationSelect, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      className="max-w-4xl max-h-[90vh] overflow-hidden"
      titleCentered={true}
    >
      <div className="flex flex-col h-[75vh]">
        {/* Map Container - Optimized for full viewing */}
        <div className="relative flex-1 min-h-0">
          <div
            ref={mapRef}
            className="w-full h-full bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg"
          />
          
          {/* Loading overlay with better UX and error handling */}
          {(isLoading || !isMapLoaded || mapError) && (
            <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-lg backdrop-blur-sm">
              <div className="text-center">
                {mapError ? (
                  <>
                    <div className="flex items-center justify-center rounded-full h-10 w-10 bg-red-100 mb-3 mx-auto">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-red-700 mb-2">
                      Map Loading Failed
                    </p>
                    <p className="text-sm text-red-600 max-w-sm mx-auto">
                      {mapError}
                    </p>
                    <button
                      onClick={() => {
                        setMapError(null);
                        setIsLoading(true);
                        loadGoogleMapsAPI()
                          .then(initializeMap)
                          .catch(err => {
                            setMapError(err.message || 'Failed to load Google Maps');
                            setIsLoading(false);
                          });
                      }}
                      className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </>
                ) : (
                  <>
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-orange-600 border-t-transparent mb-3"></div>
                    <p className="text-lg font-semibold text-gray-700">
                      {isLoading ? 'Getting your location...' : 'Loading map...'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Please wait a moment
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Section - Enhanced UX */}
        <div className="flex-shrink-0 mt-2 space-y-2">
          {/* Location Info - Enhanced Display */}
          {selectedLocation && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start space-x-4">
                <div className="flex-1">
                  <h4 className="font-bold text-green-900 text-base mb-1">Location Selected</h4>
                  <p className="text-green-700 text-sm mb-2">
                    {selectedLocation.address || 'Getting address...'}
                  </p>
                  <p className="text-green-600 text-xs font-mono bg-green-100 px-2 py-1 rounded">
                    {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons - Improved Layout */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={getCurrentLocation}
              disabled={isLoading}
              isLoading={isLoading}
              leftIcon={
                !isLoading ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : null
              }
              className="flex-1 py-3 text-base font-semibold hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              {isLoading ? 'Getting Location...' : 'Use Current Location'}
            </Button>
            
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmLocation}
              disabled={!selectedLocation}
              className="flex-1 py-3 text-base font-bold bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-lg transform hover:scale-[1.02] transition-all duration-200"
            >
              Save Location
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MapPickerModal;
