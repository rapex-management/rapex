/**
 * Google Maps Configuration
 * SUPER COST-EFFICIENT & PERFORMANCE OPTIMIZED
 * 
 * COST OPTIMIZATION TIPS:
 * 1. Set API key restrictions (HTTP referrers, IP addresses)
 * 2. Enable only required APIs (Maps JavaScript API, Geocoding API)
 * 3. Use debounced reverse geocoding (implemented)
 * 4. Restrict map bounds to Philippines (implemented)
 * 5. Use optimized marker rendering (implemented)
 * 6. Cache geolocation for 5 minutes (implemented)
 * 7. Use loading=async for better performance (implemented)
 * 
 * ESTIMATED COSTS (as of 2024):
 * - Maps JavaScript API: $7 per 1,000 loads
 * - Geocoding API: $5 per 1,000 requests
 * - With restrictions and optimizations: ~$50-100/month for moderate usage
 */

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

export const GOOGLE_MAPS_CONFIG = {
  // API Configuration - Cost Optimized
  API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyDIRIKuP7sSpx3HCIv82UPPSS6PEdCAxXw',
  REGION: 'PH', // Philippines region for better results and cost efficiency
  LANGUAGE: 'en',
  
  // Map Settings - Performance Optimized
  DEFAULT_ZOOM: 15,
  MARKER_ZOOM: 17,
  MIN_ZOOM: 10,
  MAX_ZOOM: 20,
  DEFAULT_CENTER: { lat: 14.4167, lng: 120.9047 }, // Cavite, Philippines
  
  // Cost Efficiency Settings
  REVERSE_GEOCODE_DEBOUNCE: 500, // ms - Prevents excessive API calls
  GEOLOCATION_TIMEOUT: 10000, // 10 seconds
  GEOLOCATION_MAX_AGE: 300000, // 5 minutes cache
  
  // Philippines Bounds (Cost Efficiency - Restrict API calls to relevant area)
  PHILIPPINES_BOUNDS: {
    north: 21.5,
    south: 4.5,
    west: 116,
    east: 127
  },
  
  // Optimized Map Options
  MAP_OPTIONS: {
    disableDefaultUI: true, // Disable unnecessary UI
    zoomControl: true,
    zoomControlOptions: {
      position: 9, // BOTTOM_LEFT
      style: 1, // SMALL
    },
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    rotateControl: false,
    scaleControl: false,
    clickableIcons: false, // Prevent unnecessary API calls
    gestureHandling: 'cooperative', // Require Ctrl+scroll
    restriction: {
      latLngBounds: {
        north: 21.5,
        south: 4.5,
        west: 116,
        east: 127
      },
      strictBounds: false
    }
  },
  
  // Custom Red Marker Icon (Default Google Maps Style)
  MARKER_ICON: {
    path: 'M12,2C8.13,2 5,5.13 5,9c0,5.25 7,13 7,13s7,-7.75 7,-13C19,5.13 15.87,2 12,2zM12,11.5c-1.38,0 -2.5,-1.12 -2.5,-2.5s1.12,-2.5 2.5,-2.5s2.5,1.12 2.5,2.5S13.38,11.5 12,11.5z',
    fillColor: '#FF0000', // Red color as requested
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeWeight: 2,
    scale: 1.5,
    anchor: { x: 12, y: 24 } as google.maps.Point
  }
} as const;

/**
 * Load Google Maps API with cost optimization and performance best practices
 */
export const loadGoogleMapsAPI = (): Promise<void> => {
  // Check if already loaded
  if (window.googleMapsLoaded || window.google?.maps) {
    return Promise.resolve();
  }

  // Check for existing script
  const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
  if (existingScript) {
    return new Promise<void>((resolve) => {
      const checkLoaded = () => {
        if (window.google?.maps) {
          window.googleMapsLoaded = true;
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
    });
  }

  return new Promise<void>((resolve, reject) => {
    // Validate API key first
    const apiKey = GOOGLE_MAPS_CONFIG.API_KEY;
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY' || apiKey.length < 20) {
      reject(new Error('Invalid or missing Google Maps API key. Please check your environment variables.'));
      return;
    }

    const script = document.createElement('script');
    // PERFORMANCE OPTIMIZED: Use loading=async for better performance
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&region=${GOOGLE_MAPS_CONFIG.REGION}&language=${GOOGLE_MAPS_CONFIG.LANGUAGE}&loading=async&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    
    
    // Add global callback for Google Maps initialization
    window.initGoogleMaps = () => {
      window.googleMapsLoaded = true;
      resolve();
      // Clean up the global callback
      delete window.initGoogleMaps;
    };
    
    script.onerror = () => {
      delete window.initGoogleMaps;
      reject(new Error('Failed to load Google Maps API. Please check your API key and internet connection.'));
    };
    
    document.head.appendChild(script);
  });
};
