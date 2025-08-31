import React, { useState, useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    google: {
      maps: {
        Map: new (element: HTMLElement, options: unknown) => GoogleMap;
        Marker: new (options: unknown) => GoogleMarker;
        Geocoder: new () => GoogleGeocoder;
        MapTypeId: {
          ROADMAP: string;
        };
      };
    };
    initMap: () => void;
  }
}

interface GoogleMap {
  addListener: (event: string, callback: (event: GoogleMapEvent) => void) => void;
  setCenter: (location: { lat: number; lng: number }) => void;
}

interface GoogleMarker {
  setPosition: (location: { lat: number; lng: number }) => void;
  addListener: (event: string, callback: (event: GoogleMapEvent) => void) => void;
}

interface GoogleGeocoder {
  geocode: (
    request: { location: { lat: number; lng: number } },
    callback: (results: GoogleGeocoderResult[], status: string) => void
  ) => void;
}

interface GoogleMapEvent {
  latLng: {
    lat: () => number;
    lng: () => number;
  };
}

interface GoogleGeocoderResult {
  formatted_address: string;
}

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
  isOpen: boolean;
  onClose: () => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  initialLat = 14.4167, // Kawit, Cavite coordinates
  initialLng = 120.9047,
  isOpen,
  onClose
}) => {
  const [selectedLat, setSelectedLat] = useState(initialLat);
  const [selectedLng, setSelectedLng] = useState(initialLng);
  const [address, setAddress] = useState('Kawit, Cavite, Philippines'); // Default realistic address
  const [isLoading, setIsLoading] = useState(false);
  const [mapError, setMapError] = useState('');
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<GoogleMap | null>(null);
  const markerRef = useRef<GoogleMarker | null>(null);
  const geocoderRef = useRef<GoogleGeocoder | null>(null);

  // Google Maps API Key - In production, this should be in environment variables
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

  const loadGoogleMaps = useCallback(() => {
    if (window.google) {
      setIsGoogleMapsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsGoogleMapsLoaded(true);
    };
    script.onerror = () => {
      setMapError('Failed to load Google Maps. Please check your API key and internet connection.');
    };
    document.head.appendChild(script);
  }, [GOOGLE_MAPS_API_KEY]);

  const updateLocation = useCallback((lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    
    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    }
    
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({ lat, lng });
    }
    
    reverseGeocode(lat, lng);
  }, []);

  const initializeMap = useCallback(() => {
    if (!window.google || !mapRef.current) return;

    try {
      const mapOptions = {
        center: { lat: selectedLat, lng: selectedLng },
        zoom: 15,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        streetViewControl: false,
        mapTypeControl: true,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'poi.business',
            stylers: [{ visibility: 'on' }]
          }
        ]
      };

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
      geocoderRef.current = new window.google.maps.Geocoder();

      // Create marker
      markerRef.current = new window.google.maps.Marker({
        position: { lat: selectedLat, lng: selectedLng },
        map: mapInstanceRef.current,
        draggable: true,
        title: 'Business Location'
      });

      // Add click listener to map
      mapInstanceRef.current.addListener('click', (event: GoogleMapEvent) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        updateLocation(lat, lng);
      });

      // Add drag listener to marker
      markerRef.current.addListener('dragend', (event: GoogleMapEvent) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        updateLocation(lat, lng);
      });

      // Initial reverse geocoding
      reverseGeocode(selectedLat, selectedLng);

    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError('Failed to initialize map. Please try again.');
    }
  }, [selectedLat, selectedLng, updateLocation]);

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!geocoderRef.current) {
      // Fallback with realistic address for Kawit, Cavite area
      if (lat >= 14.40 && lat <= 14.43 && lng >= 120.90 && lng <= 120.92) {
        setAddress('Kawit, Cavite, Philippines');
      } else if (lat >= 14.50 && lat <= 14.70 && lng >= 120.90 && lng <= 121.10) {
        setAddress('Metro Manila, Philippines');
      } else if (lat >= 14.30 && lat <= 14.50 && lng >= 120.80 && lng <= 121.00) {
        setAddress('Cavite Province, Philippines');
      } else {
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)} - Philippines`);
      }
      return;
    }

    setIsLoading(true);
    try {
      const response = await new Promise<GoogleGeocoderResult[]>((resolve, reject) => {
        geocoderRef.current!.geocode(
          { location: { lat, lng } },
          (results: GoogleGeocoderResult[], status: string) => {
            if (status === 'OK') {
              resolve(results);
            } else {
              reject(new Error(status));
            }
          }
        );
      });

      if (response && response.length > 0) {
        setAddress(response[0].formatted_address);
      } else {
        // Fallback for failed geocoding
        setAddress('Kawit, Cavite, Philippines');
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      // Enhanced fallback with realistic address
      setAddress('Kawit, Cavite, Philippines');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedLat(initialLat);
      setSelectedLng(initialLng);
      setMapError('');
      
      // Set realistic default address for Kawit, Cavite
      setAddress('Kawit, Cavite, Philippines');
      
      if (GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
        setMapError('Google Maps API key not configured. Using fallback mode with Kawit, Cavite as default location.');
        return;
      }
      
      loadGoogleMaps();
    }
  }, [isOpen, initialLat, initialLng, loadGoogleMaps, GOOGLE_MAPS_API_KEY]);

  useEffect(() => {
    if (isGoogleMapsLoaded && isOpen) {
      // Small delay to ensure DOM is ready
      setTimeout(initializeMap, 100);
    }
  }, [isGoogleMapsLoaded, isOpen, initializeMap]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          updateLocation(lat, lng);
          setIsLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setMapError('Unable to get current location. Please select manually.');
          setIsLoading(false);
        }
      );
    } else {
      setMapError('Geolocation is not supported by this browser.');
    }
  };

  const handleConfirm = () => {
    onLocationSelect(selectedLat, selectedLng);
    onClose();
  };

  const handleManualCoordinateChange = (lat: number, lng: number) => {
    if (isNaN(lat) || isNaN(lng)) return;
    updateLocation(lat, lng);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Select Your Business Location</h2>
            <p className="text-sm text-gray-600 mt-1">Click on the map or drag the marker to set your exact location</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Map Area */}
        <div className="flex-1 flex">
          
          {/* Map Container */}
          <div className="flex-1 relative">
            {mapError ? (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <div className="text-center p-8 max-w-md">
                  <svg className="w-16 h-16 text-orange-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Location: Kawit, Cavite</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Default location set to Kawit, Cavite, Philippines. You can adjust coordinates manually on the right panel.
                  </p>
                  
                  {/* Enhanced fallback with realistic map representation */}
                  <div className="mt-6 p-6 bg-gradient-to-br from-green-100 via-blue-100 to-green-200 border-2 border-dashed border-gray-300 rounded-lg relative overflow-hidden">
                    {/* Simulated map elements */}
                    <div className="absolute inset-0 opacity-30">
                      <div className="absolute top-2 left-2 w-8 h-1 bg-blue-400 rounded"></div>
                      <div className="absolute top-4 left-4 w-12 h-1 bg-blue-400 rounded"></div>
                      <div className="absolute bottom-8 right-4 w-6 h-6 bg-green-400 rounded-full"></div>
                      <div className="absolute top-8 right-8 w-4 h-8 bg-gray-400 rounded"></div>
                    </div>
                    
                    <div className="relative flex items-center justify-center mb-2">
                      <div 
                        className="w-6 h-6 bg-red-500 rounded-full shadow-lg animate-pulse"
                        style={{
                          boxShadow: '0 0 0 6px rgba(239, 68, 68, 0.2)'
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 font-medium">Kawit, Cavite</p>
                    <p className="text-xs text-gray-500 font-mono mt-1">
                      {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
                    </p>
                    <p className="text-xs text-green-600 mt-2">📍 Default Business Location</p>
                  </div>
                  
                  <div className="mt-4 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
                    <strong>Note:</strong> This is a fallback location. Set up Google Maps API for interactive map selection.
                  </div>
                </div>
              </div>
            ) : !isGoogleMapsLoaded ? (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 text-lg font-medium">Loading Google Maps...</p>
                </div>
              </div>
            ) : (
              <div ref={mapRef} className="w-full h-full" />
            )}
          </div>

          {/* Location Info Panel */}
          <div className="w-80 border-l border-gray-200 p-6 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  value={selectedLat}
                  onChange={(e) => {
                    const newLat = parseFloat(e.target.value) || 0;
                    setSelectedLat(newLat);
                    if (!isNaN(newLat)) {
                      handleManualCoordinateChange(newLat, selectedLng);
                    }
                  }}
                  step="0.000001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="14.416700 (Kawit, Cavite)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  value={selectedLng}
                  onChange={(e) => {
                    const newLng = parseFloat(e.target.value) || 0;
                    setSelectedLng(newLng);
                    if (!isNaN(newLng)) {
                      handleManualCoordinateChange(selectedLat, newLng);
                    }
                  }}
                  step="0.000001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="120.904700 (Kawit, Cavite)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <div className="min-h-[80px] p-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-600">
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading address...</span>
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium text-gray-800">{address}</div>
                      {address === 'Kawit, Cavite, Philippines' && (
                        <div className="text-xs text-gray-500 mt-1">
                          ℹ️ Default fallback location - adjust coordinates as needed
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={getCurrentLocation}
                disabled={isLoading || !isGoogleMapsLoaded}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  {isLoading ? 'Getting location...' : 'Use Current Location'}
                </span>
              </button>

              {mapError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-red-700 text-sm">{mapError}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Selected: <span className="font-mono">{selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedLat || !selectedLng}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;
