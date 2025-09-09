/**
 * Google Maps API Validation Script
 * Run this to test your Google Maps API setup
 */

export const validateGoogleMapsSetup = () => {
  console.log('🗺️ Google Maps API Validation');
  console.log('================================');
  
  // Check environment variable
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('❌ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set in environment variables');
    return false;
  }
  
  if (apiKey === 'your_google_maps_api_key_here' || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
    console.error('❌ Google Maps API key is still using placeholder value');
    return false;
  }
  
  if (apiKey.length < 20) {
    console.error('❌ Google Maps API key appears to be invalid (too short)');
    return false;
  }
  
  console.log('✅ Google Maps API key found in environment');
  console.log(`📊 API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
  
  // Test API endpoint
  console.log('🧪 Testing API endpoint availability...');
  
  const testUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&region=PH&language=en&loading=async`;
  
  fetch(testUrl, { method: 'HEAD' })
    .then(response => {
      if (response.ok) {
        console.log('✅ Google Maps API endpoint is accessible');
      } else {
        console.error(`❌ Google Maps API endpoint returned: ${response.status}`);
      }
    })
    .catch(error => {
      console.error('❌ Failed to reach Google Maps API endpoint:', error.message);
    });
  
  return true;
};

// Auto-run validation in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  validateGoogleMapsSetup();
}
