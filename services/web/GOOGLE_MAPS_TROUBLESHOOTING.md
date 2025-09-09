# Google Maps API Troubleshooting Guide

## Common Issues and Solutions

### 1. InvalidKeyMapError
**Error**: `Google Maps JavaScript API error: InvalidKeyMapError`
**Cause**: API key is missing, invalid, or has restrictions
**Solutions**:
- Check `.env.local` has the correct `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Verify API key in Google Cloud Console
- Check API key restrictions (HTTP referrers, IP addresses)
- Ensure Maps JavaScript API is enabled

### 2. Performance Warnings
**Warning**: `Google Maps JavaScript API has been loaded directly without loading=async`
**Solution**: ✅ **FIXED** - Now using `loading=async` parameter for optimal performance

### 3. Cost Optimization
**To minimize Google Maps API costs**:
- ✅ **IMPLEMENTED** - Debounced reverse geocoding (500ms delay)
- ✅ **IMPLEMENTED** - Philippines bounds restriction
- ✅ **IMPLEMENTED** - Optimized map options (disabled unnecessary UI)
- ✅ **IMPLEMENTED** - Geolocation caching (5 minutes)
- ✅ **IMPLEMENTED** - Async loading with callback

### 4. Environment Setup
1. Copy `.env.example` to `.env.local`
2. Get Google Maps API key from: https://console.cloud.google.com/apis/credentials
3. Enable required APIs:
   - Maps JavaScript API (required)
   - Geocoding API (required)
   - Places API (optional)
4. Set API restrictions for security and cost control

### 5. API Key Restrictions (Recommended for Production)
**HTTP referrers**:
- `yourdomain.com/*`
- `*.yourdomain.com/*`
- `localhost:3000/*` (for development)

**IP addresses** (alternative):
- Your server's IP addresses
- Development machine IPs

### 6. Monitoring Usage
- Check Google Cloud Console > APIs & Services > Quotas
- Set up billing alerts to prevent unexpected charges
- Monitor usage patterns and optimize accordingly

## Cost Estimates (2024 pricing)
- Maps JavaScript API: $7 per 1,000 loads
- Geocoding API: $5 per 1,000 requests
- **Optimized setup**: ~$50-100/month for moderate usage (with restrictions)

## Testing the Fix
1. Restart your development server
2. Open the map picker modal
3. Check browser console for errors
4. Verify map loads correctly with markers
5. Test location selection and reverse geocoding
