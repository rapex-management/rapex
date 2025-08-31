# Google Maps Integration Setup Guide

This guide will help you set up Google Maps API for the Rapex merchant registration location picker.

## Prerequisites

1. A Google Cloud Platform account
2. A valid billing account (Google Maps requires billing to be enabled)

## Step-by-Step Setup

### Step 1: Create/Select a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. In the top navigation bar, click on the project dropdown
4. Either:
   - Click "New Project" if you don't have one
   - Select an existing project if you have one
5. If creating new: Give it a name like "Rapex Maps" and click "Create"

### Step 2: Enable Billing

**Important**: Google Maps APIs require billing to be enabled, even for free usage.

1. In the left sidebar, go to "Billing"
2. If no billing account is linked, click "Link a billing account"
3. Follow the prompts to set up billing
4. Note: You get $200 monthly free credit for Google Maps, which is sufficient for most applications

### Step 3: Enable Required APIs

1. In the left sidebar, click "APIs & Services" → "Library"
2. Search for and enable these APIs (click on each, then click "Enable"):
   - **Maps JavaScript API** (for the map display)
   - **Places API** (for location search/autocomplete)
   - **Geocoding API** (for address to coordinates conversion)

### Step 4: Create API Key

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the API key that appears (you'll need this later)

### Step 5: Secure Your API Key (Recommended)

1. Click "Restrict Key" for the API key you just created
2. Under "Application restrictions":
   - Select "HTTP referrers (web sites)"
   - Add these referrers:
     - `http://localhost:3000/*` (for development)
     - `https://your-domain.com/*` (replace with your actual domain)
3. Under "API restrictions":
   - Select "Restrict key"
   - Choose the 3 APIs you enabled above:
     - Maps JavaScript API
     - Places API
     - Geocoding API
4. Click "Save"

### Step 6: Configure Your Application

1. In your Rapex project, go to `services/web/`
2. Create a `.env.local` file (copy from `.env.example` if it exists)
3. Add your API key:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

4. Restart your development server:

```bash
cd services/web
npm run dev
```

## Verification

1. Go to the merchant registration page
2. Fill out Step 1 (General Info)
3. Proceed to Step 2 (Location)
4. Click "Pick Location"
5. You should see a real Google Map instead of the placeholder

## Troubleshooting

### "Failed to load Google Maps" Error

- **Check API Key**: Ensure your API key is correct and properly set in `.env.local`
- **Check APIs**: Verify all three APIs are enabled in Google Cloud Console
- **Check Billing**: Ensure billing is enabled for your project
- **Check Restrictions**: If you set API restrictions, make sure your domain is allowed

### "This page can't load Google Maps correctly" Error

- Usually indicates billing is not enabled
- Go to Google Cloud Console → Billing and set up billing

### Map Shows but Location Picker Doesn't Work

- Check if Geocoding API is enabled
- Check browser console for JavaScript errors
- Verify the API key has the right permissions

## API Usage and Costs

- **Free Tier**: $200 monthly credit (covers ~28,000 map loads or ~40,000 geocoding requests)
- **Development**: Usually stays within free limits
- **Production**: Monitor usage in Google Cloud Console

## Security Best Practices

1. **Always restrict your API key** to specific domains/IPs
2. **Never commit API keys** to version control
3. **Use environment variables** for API key storage
4. **Monitor usage** regularly in Google Cloud Console
5. **Set up budget alerts** to avoid unexpected charges

## Alternative: Development Mode

If you can't set up Google Maps immediately, the LocationPicker component will fall back to manual coordinate entry. Users can still:

1. Enter latitude/longitude manually
2. Use "Get Current Location" (if browser supports it)
3. Proceed with registration

However, for production, Google Maps integration is highly recommended for better user experience.
