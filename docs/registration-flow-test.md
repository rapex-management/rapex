# Merchant Registration Flow Test - Steps 1-3

## Test Configuration
- **Date**: August 31, 2025
- **Test Environment**: Docker containers (all services running)
- **Frontend**: Next.js 15.5.2 on http://localhost:3000
- **Backend**: Django on http://localhost:8000
- **Test Scope**: Steps 1, 2, and 3 of merchant registration

## Pre-Test Verification ✅

### Services Status
- ✅ **infra-web-1**: Running (Next.js frontend)
- ✅ **infra-backend-1**: Running (Django backend)
- ✅ **infra-db-1**: Running (PostgreSQL database)
- ✅ **infra-redis-1**: Running (Redis cache)
- ✅ **infra-realtime-1**: Running (Node.js realtime)

### Dependency Issues Fixed
- ✅ **npm conflicts resolved**: nodemailer version compatibility with next-auth
- ✅ **formidable package**: Properly installed and working
- ✅ **File upload API**: Enhanced with 2MB limit and better error handling

## Step 1: General Info Test

### Test Data
```json
{
  "merchantName": "Test Merchant Store",
  "ownerName": "John Doe",
  "username": "testmerchant123",
  "email": "test@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "phone": "+639123456789",
  "businessCategory": "5", // Restaurant/Food
  "businessType": "15", // Fast Food Restaurant
  "businessRegistration": "2" // Unregistered
}
```

### Expected Results
- ✅ **Form Validation**: All fields properly validated
- ✅ **Username Check**: Should verify uniqueness via `/api/proxy/check-username`
- ✅ **Email Check**: Should verify uniqueness via `/api/proxy/check-email`
- ✅ **Password Validation**: Strong password requirements enforced
- ✅ **Step Saving**: Data saved to Redis cache via backend API
- ✅ **Session Creation**: Session ID generated for subsequent steps

### API Calls Expected
1. `GET /api/proxy/data/business-categories` - Load categories
2. `GET /api/proxy/data/business-types?business_category_id=5` - Load types
3. `POST /api/proxy/check-username` - Verify username uniqueness
4. `POST /api/proxy/check-email` - Verify email uniqueness
5. `POST /api/proxy/merchant/registration/step` - Save Step 1 data

## Step 2: Location Test

### Test Data
```json
{
  "zipcode": "4104",
  "province": "Cavite",
  "city_municipality": "Kawit",
  "barangay": "Poblacion",
  "street_name": "Aguinaldo Highway",
  "house_number": "123",
  "latitude": 14.4167,
  "longitude": 120.9047
}
```

### Expected Results
- ✅ **Form Validation**: All address fields required and validated
- ✅ **Location Picker**: Default coordinates for Kawit, Cavite
- ✅ **Coordinate Validation**: Non-zero latitude/longitude required
- ✅ **Step Saving**: Location data saved with proper decimal handling
- ✅ **Session Continuity**: Existing session ID maintained

### API Calls Expected
1. `POST /api/proxy/merchant/registration/step` - Save Step 2 data

## Step 3: Documents Test

### Test Scenario: Unregistered Business
Since `businessRegistration: "2"` (Unregistered), no documents should be required.

### Expected Results
- ✅ **Document Requirements**: Should show "No Documents Required" message
- ✅ **Skip Upload**: Should allow proceeding without file uploads
- ✅ **Auto-progress**: Should move directly to Step 4 (Verification)

### Test Scenario: Registered Business (NON-VAT)
Change `businessRegistration: "1"` to test document upload.

### Required Documents
1. **Barangay Permit** (required)
2. **DTI/SEC Certificate** (required)
3. **BIR Certificate** (optional)
4. **Business Permit** (optional)
5. **Other Documents** (optional)

### Test Files
- **Valid PDF**: 500KB, test-permit.pdf
- **Valid Image**: 800KB, certificate.jpg
- **Invalid File**: 3MB file (should be rejected)
- **Invalid Type**: .doc file (should be rejected)

### Expected Results
- ✅ **File Upload UI**: Modern drag & drop interface functional
- ✅ **File Validation**: 2MB limit and file type restrictions enforced
- ✅ **Progress Tracking**: Visual indicators for upload status
- ✅ **Required Validation**: Only required documents must be uploaded
- ✅ **API Processing**: Files processed via `/api/proxy/merchant/registration/documents`
- ✅ **Step Completion**: OTP sent after successful document upload

### API Calls Expected
1. `POST /api/proxy/merchant/registration/documents` - Upload and process files

## Test Execution Checklist

### Manual Testing Steps
1. [ ] **Navigate to Registration**: Visit http://localhost:3000/merchant/signup
2. [ ] **Complete Step 1**: Fill all fields with test data, verify validation
3. [ ] **Verify Step 1 APIs**: Check browser network tab for API calls
4. [ ] **Complete Step 2**: Fill address fields, verify location picker
5. [ ] **Verify Step 2 APIs**: Check decimal serialization fix works
6. [ ] **Test Step 3 - Unregistered**: Verify no documents required
7. [ ] **Test Step 3 - Registered**: Upload test documents, verify validation
8. [ ] **Verify Step 3 APIs**: Check file upload and processing
9. [ ] **Check Console Logs**: Verify no JavaScript errors
10. [ ] **Check Network Tab**: Verify all API calls successful

### Expected Success Indicators
- ✅ No browser console errors
- ✅ All API calls return 200 status
- ✅ Session ID properly maintained across steps
- ✅ Form data properly validated and saved
- ✅ File uploads processed correctly
- ✅ Progress to Step 4 (Verification) successful

### Common Issues to Check
- [ ] **Session Expiry**: Ensure session doesn't expire during testing
- [ ] **CORS Errors**: Verify proxy APIs work properly
- [ ] **File Size Errors**: Test 2MB limit enforcement
- [ ] **Validation Errors**: Test required field validation
- [ ] **Network Errors**: Check backend connectivity

## Post-Test Verification

### Database Checks
1. **Redis Cache**: Verify session data stored properly
2. **PostgreSQL**: Check if any permanent data created
3. **Backend Logs**: Review for any server-side errors

### Performance Checks
1. **Load Times**: Verify page loads quickly
2. **File Upload Speed**: Check upload performance
3. **API Response Times**: Ensure reasonable response times

## Test Results Summary

### Status: [PENDING TEST EXECUTION]

After manual testing, update this section with:
- [ ] Step 1 Test Results
- [ ] Step 2 Test Results  
- [ ] Step 3 Test Results
- [ ] Overall Flow Assessment
- [ ] Issues Found (if any)
- [ ] Performance Notes

---

**Note**: This test plan covers the complete flow from Steps 1-3. The final Step 4 (Verification) will be tested separately as it requires email OTP functionality.
