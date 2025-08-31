# Step 2 Location Registration Test Guide

## Quick Test Instructions

To verify that the Step 2 location issue is fixed:

### 1. Access the Registration Form
- Go to `http://localhost:3000/merchant/signup`
- Fill out Step 1 (General Info) with valid data
- Click "Next" to proceed to Step 2

### 2. Test Location Selection

#### Option A: With Google Maps (if API key is configured)
- Click "Pick Location" button
- A real Google Maps interface will open
- Click anywhere on the map or drag the marker
- The address will be automatically populated
- Click "Confirm Location"

#### Option B: Without Google Maps (fallback mode)
- Click "Pick Location" button  
- You'll see a placeholder with manual coordinate input
- Enter latitude and longitude manually (e.g., 14.5995, 120.9842)
- Or click "Use Current Location" if your browser supports geolocation
- Click "Confirm Location"

### 3. Complete Step 2
- Fill in all address fields:
  - ZIP Code
  - Province
  - City/Municipality
  - Barangay
  - Street Name
  - House Number
- Ensure location coordinates are set (from step 2)
- Click "Next"

### 4. Expected Results

#### ✅ Success Indicators:
- Step 2 saves successfully without errors
- Progress moves to Step 3 (Documents)
- No 400/500 errors in browser console
- Success notification appears

#### ❌ Failure Indicators:
- Error notifications about validation
- Browser console shows 400/500 errors
- Step doesn't advance to Step 3

## Debug Information

### Check Browser Console
Open Developer Tools (F12) and check for:
- Network tab: Look for `/api/proxy/merchant/registration/step` requests
- Console tab: Look for any JavaScript errors
- Response data: Check if coordinates are being sent properly

### Check Backend Logs
```bash
cd infra
docker-compose logs backend --tail=20
```

Look for:
- "Registration step request received" messages
- Any validation errors
- Step data being processed

## Common Issues and Solutions

### Issue: "Please select your location on the map"
**Solution**: Ensure latitude and longitude are not 0 or null

### Issue: Google Maps not loading
**Solution**: 
1. Set up Google Maps API key (see `docs/google-maps-setup.md`)
2. Or use fallback mode with manual coordinates

### Issue: 400 Validation Error
**Solution**: Check that all address fields are filled and coordinates are valid numbers

### Issue: Location picker shows error
**Solution**: 
1. Check API key configuration
2. Verify internet connection
3. Use manual coordinate entry as backup

## Sample Test Data

### Valid Location Data:
- **Manila, Philippines**: 14.5995, 120.9842
- **Cebu City**: 10.3157, 123.8854
- **Davao City**: 7.0731, 125.6128

### Complete Address Example:
- ZIP Code: 1000
- Province: Metro Manila
- City/Municipality: Manila
- Barangay: Ermita
- Street Name: Roxas Boulevard
- House Number: 123
- Coordinates: 14.5995, 120.9842

## API Key Setup (Optional but Recommended)

If you want to test with real Google Maps:

1. Get API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable: Maps JavaScript API, Places API, Geocoding API
3. Add to environment:
   ```bash
   # For local development
   echo "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here" >> services/web/.env.local
   
   # For Docker
   echo "GOOGLE_MAPS_API_KEY=your_key_here" >> infra/.env
   ```
4. Restart services:
   ```bash
   cd infra
   docker-compose restart web
   ```

See `docs/google-maps-setup.md` for detailed instructions.
