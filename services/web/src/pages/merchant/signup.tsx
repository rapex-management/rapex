import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dropdown } from '../../components/ui/Dropdown';
import Notification from '../../components/ui/Notification';
import LocationPicker from '../../components/ui/LocationPicker';

interface FormData {
  // Step 1: General Info
  merchantName: string;
  ownerName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  mccCategory: string;
  businessRegistration: string;
  
  // Step 2: Location
  zipcode: string;
  province: string;
  city_municipality: string;
  barangay: string;
  street_name: string;
  house_number: string;
  latitude: number | null;
  longitude: number | null;
  
  // Step 3: Documents
  documents: { [key: string]: File | null };
}

const MerchantSignup = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [notification, setNotification] = useState<{
    isVisible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isVisible: false,
    type: 'info',
    title: '',
    message: ''
  });

  const [formData, setFormData] = useState<FormData>({
    merchantName: '',
    ownerName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '+63',
    mccCategory: '0',
    businessRegistration: '2',
    zipcode: '',
    province: '',
    city_municipality: '',
    barangay: '',
    street_name: '',
    house_number: '',
    latitude: null,
    longitude: null,
    documents: {}
  });

  const router = useRouter();
  const steps = ['General Info', 'Location', 'Documents', 'Verification'];

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setNotification({
      isVisible: true,
      type,
      title,
      message
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };

  // Validation helper functions
  const checkUsernameUnique = async (username: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/proxy/check-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();
      return response.ok && data.available;
    } catch {
      return false;
    }
  };

  const checkEmailUnique = async (email: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/proxy/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      return response.ok && data.available;
    } catch {
      return false;
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove +63 prefix and check if remaining is exactly 10 digits
    const phoneWithoutPrefix = phone.replace(/^\+63/, '');
    return /^\d{10}$/.test(phoneWithoutPrefix);
  };

  const validateStrongPassword = (password: string): { isValid: boolean; message: string } => {
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long.' };
    }
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one uppercase letter.' };
    }
    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one lowercase letter.' };
    }
    if (!/\d/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number.' };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one special character.' };
    }
    return { isValid: true, message: '' };
  };

  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    
    // If the value starts with 63, remove it (user might paste full number)
    const cleanDigits = digitsOnly.startsWith('63') ? digitsOnly.substring(2) : digitsOnly;
    
    // Limit to 10 digits after +63
    const limitedDigits = cleanDigits.substring(0, 10);
    
    // Always return with +63 prefix
    return limitedDigits ? `+63${limitedDigits}` : '+63';
  };

  const mccCategories = [
    { value: '0', label: 'General Retail' },
    { value: '1', label: 'Food & Beverage' },
    { value: '2', label: 'Grocery & Supermarket' },
    { value: '3', label: 'Gas Station' },
    { value: '4', label: 'Clothing & Accessories' },
    { value: '5', label: 'Electronics' },
    { value: '6', label: 'Books & Media' },
    { value: '7', label: 'Health & Beauty' },
    { value: '8', label: 'Home & Garden' },
    { value: '9', label: 'Sports & Recreation' },
    { value: '10', label: 'Automotive' },
    { value: '11', label: 'Services - Professional' },
    { value: '12', label: 'Services - Personal' },
    { value: '13', label: 'Hotel & Lodging' },
    { value: '14', label: 'Transportation' },
    { value: '15', label: 'Entertainment' }
  ];

  const businessRegistrationOptions = [
    { value: '0', label: 'Registered (VAT Included)' },
    { value: '1', label: 'Registered (NON-VAT)' },
    { value: '2', label: 'Unregistered' }
  ];

  const getRequiredDocuments = () => {
    const registration = parseInt(formData.businessRegistration);
    
    switch (registration) {
      case 0: // Registered (VAT)
        return [
          { key: 'bir_certificate', label: 'BIR Certificate of Registration (Form 2303)', required: true },
          { key: 'dti_sec_certificate', label: 'DTI Certificate (sole proprietors) or SEC Certificate (corporations/partnerships)', required: true },
          { key: 'business_permit', label: 'Mayor\'s / Business Permit', required: true },
          { key: 'other_documents', label: 'Other documents', required: false }
        ];
      case 1: // Registered (NON-VAT)
        return [
          { key: 'barangay_permit', label: 'Barangay Permit', required: true },
          { key: 'dti_sec_certificate', label: 'DTI Certificate (sole proprietors) or SEC Certificate (corporations/partnerships)', required: true },
          { key: 'bir_certificate', label: 'BIR Certificate of Registration (Form 2303)', required: false },
          { key: 'business_permit', label: 'Mayor\'s / Business Permit', required: false },
          { key: 'other_documents', label: 'Other documents', required: false }
        ];
      case 2: // Unregistered
      default:
        return [];
    }
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    switch (currentStep) {
      case 0: // General Info
        if (!formData.merchantName || !formData.ownerName || !formData.username || 
            !formData.email || !formData.password || !formData.confirmPassword || 
            !formData.phone) {
          showNotification('error', 'Validation Error', 'Please fill in all required fields.');
          return false;
        }

        // Username uniqueness check
        const isUsernameUnique = await checkUsernameUnique(formData.username);
        if (!isUsernameUnique) {
          showNotification('error', 'Username Error', 'This username is already taken. Please choose a different one.');
          return false;
        }

        // Email uniqueness check
        const isEmailUnique = await checkEmailUnique(formData.email);
        if (!isEmailUnique) {
          showNotification('error', 'Email Error', 'This email is already registered. Please use a different email address.');
          return false;
        }

        // Phone number validation
        if (!validatePhoneNumber(formData.phone)) {
          showNotification('error', 'Phone Error', 'Phone number must be exactly 10 digits after +63 prefix.');
          return false;
        }

        // Strong password validation
        const passwordValidation = validateStrongPassword(formData.password);
        if (!passwordValidation.isValid) {
          showNotification('error', 'Password Error', passwordValidation.message);
          return false;
        }

        // Password confirmation
        if (formData.password !== formData.confirmPassword) {
          showNotification('error', 'Password Error', 'Passwords do not match.');
          return false;
        }

        return true;

      case 1: // Location
        if (!formData.zipcode || !formData.province || !formData.city_municipality || 
            !formData.barangay || !formData.street_name || !formData.house_number) {
          showNotification('error', 'Validation Error', 'Please fill in all address fields.');
          return false;
        }
        if (!formData.latitude || !formData.longitude) {
          showNotification('error', 'Validation Error', 'Please select your location on the map.');
          return false;
        }
        return true;

      case 2: // Documents
        const requiredDocs = getRequiredDocuments().filter(doc => doc.required);
        for (const doc of requiredDocs) {
          if (!formData.documents[doc.key]) {
            showNotification('error', 'Validation Error', `Please upload: ${doc.label}`);
            return false;
          }
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = async () => {
    setIsLoading(true);
    const isValid = await validateCurrentStep();
    setIsLoading(false);
    
    if (isValid) {
      if (currentStep === 0) {
        // Submit general info and get merchant ID
        handleGeneralInfoSubmit();
      } else {
        setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
      }
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: // General Info
        return formData.merchantName && formData.ownerName && formData.username && 
               formData.email && formData.password && formData.confirmPassword && 
               formData.phone && formData.phone.length >= 13; // +63 + 10 digits
      case 1: // Location
        return formData.zipcode && formData.province && formData.city_municipality && 
               formData.barangay && formData.street_name && formData.house_number &&
               formData.latitude && formData.longitude;
      case 2: // Documents
        const requiredDocs = getRequiredDocuments().filter(doc => doc.required);
        return requiredDocs.every(doc => formData.documents[doc.key]);
      default:
        return true;
    }
  };

  const handleGeneralInfoSubmit = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/proxy/merchant/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchant_name: formData.merchantName,
          owner_name: formData.ownerName,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          mcc: parseInt(formData.mccCategory),
          business_registration: parseInt(formData.businessRegistration)
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMerchantId(data.merchant_id);
        showNotification('success', 'Account Created', 'Please complete the remaining steps.');
        setCurrentStep(1);
      } else {
        showNotification('error', 'Signup Failed', data.detail || 'Failed to create account. Please try again.');
      }
    } catch {
      showNotification('error', 'Connection Error', 'Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSubmit = async () => {
    if (!merchantId) {
      showNotification('error', 'Error', 'Please complete the previous step first.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/proxy/merchant/${merchantId}/location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zipcode: formData.zipcode,
          province: formData.province,
          city_municipality: formData.city_municipality,
          barangay: formData.barangay,
          street_name: formData.street_name,
          house_number: formData.house_number,
          latitude: formData.latitude,
          longitude: formData.longitude
        }),
      });

      if (response.ok) {
        showNotification('success', 'Location Updated', 'Location information saved successfully.');
        setCurrentStep(2);
      } else {
        showNotification('error', 'Update Failed', 'Failed to update location. Please try again.');
      }
    } catch {
      showNotification('error', 'Connection Error', 'Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!merchantId) {
      showNotification('error', 'Error', 'Please complete the previous steps first.');
      return;
    }

    setIsLoading(true);

    try {
      const formDataObj = new FormData();
      
      // Add uploaded files
      Object.entries(formData.documents).forEach(([key, file]) => {
        if (file) {
          formDataObj.append(key, file);
        }
      });

      const response = await fetch(`/api/proxy/merchant/${merchantId}/documents`, {
        method: 'POST',
        body: formDataObj,
      });

      if (response.ok) {
        showNotification('success', 'Documents Uploaded', 'Documents uploaded successfully.');
        setCurrentStep(3);
        // Send OTP for verification
        await sendOTP();
      } else {
        showNotification('error', 'Upload Failed', 'Failed to upload documents. Please try again.');
      }
    } catch {
      showNotification('error', 'Connection Error', 'Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendOTP = async () => {
    try {
      const response = await fetch('/api/proxy/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          purpose: 'merchant_signup'
        }),
      });

      if (response.ok) {
        showNotification('success', 'OTP Sent', 'Verification code sent to your email.');
      } else {
        showNotification('error', 'OTP Failed', 'Failed to send verification code. Please try again.');
      }
    } catch {
      showNotification('error', 'Connection Error', 'Unable to send verification code.');
    }
  };

  const handleOtpVerification = async () => {
    if (!otpCode || otpCode.length !== 6) {
      showNotification('error', 'Invalid OTP', 'Please enter a valid 6-digit OTP code.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/proxy/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          otp_code: otpCode,
          purpose: 'merchant_signup'
        }),
      });

      if (response.ok) {
        setIsCompleted(true);
        showNotification('success', 'Verification Complete', 'Your account has been created successfully!');
      } else {
        showNotification('error', 'Verification Failed', 'Invalid or expired OTP code. Please try again.');
      }
    } catch {
      showNotification('error', 'Connection Error', 'Unable to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickLocation = () => {
    setIsMapModalOpen(true);
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
    showNotification('success', 'Location Selected', `Location set to ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  };

  if (isCompleted) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-orange-400 via-purple-500 to-pink-600 flex items-center justify-center p-4 overflow-hidden">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
              <p className="text-gray-600 mb-4">
                Your merchant application has been submitted successfully. Our team will review your application and documents.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Please expect 1-2 business days for the review process. You will receive an email notification once your account is approved.
              </p>
              
              <Link 
                href="/merchant/login"
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] inline-block"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
        
        <Notification
          isVisible={notification.isVisible}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={hideNotification}
          duration={5000}
          position="top-right"
        />
      </>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // General Info
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Business Name"
                type="text"
                value={formData.merchantName}
                onChange={(e) => setFormData(prev => ({...prev, merchantName: e.target.value}))}
                placeholder="Enter business name"
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
                variant="outlined"
                size="md"
              />
              
              <Input
                label="Owner Name"
                type="text"
                value={formData.ownerName}
                onChange={(e) => setFormData(prev => ({...prev, ownerName: e.target.value}))}
                placeholder="Enter owner full name"
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
                variant="outlined"
                size="md"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({...prev, username: e.target.value}))}
                placeholder="Choose a username"
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
                variant="outlined"
                size="md"
              />
              
              <Input
                label="Phone Number"
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  const formattedPhone = formatPhoneNumber(e.target.value);
                  setFormData(prev => ({...prev, phone: formattedPhone}));
                }}
                placeholder="+63 9123456789"
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                }
                variant="outlined"
                size="md"
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
              placeholder="Enter email address"
              required
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
              variant="outlined"
              size="md"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
                placeholder="Create password"
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                variant="outlined"
                size="md"
              />
              
              <Input
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({...prev, confirmPassword: e.target.value}))}
                placeholder="Confirm password"
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                variant="outlined"
                size="md"
              />
            </div>

            <Dropdown
              label="Business Type"
              options={mccCategories}
              value={formData.mccCategory}
              onChange={(value) => setFormData(prev => ({...prev, mccCategory: value}))}
              required
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
              variant="outlined"
              size="md"
            />

            <Dropdown
              label="Business Registration"
              options={businessRegistrationOptions}
              value={formData.businessRegistration}
              onChange={(value) => setFormData(prev => ({...prev, businessRegistration: value}))}
              required
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              variant="outlined"
              size="md"
            />
          </div>
        );

      case 1: // Location
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="ZIP Code"
                type="text"
                value={formData.zipcode}
                onChange={(e) => setFormData(prev => ({...prev, zipcode: e.target.value}))}
                placeholder="Enter ZIP code"
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
                variant="outlined"
                size="md"
              />
              
              <Input
                label="Province"
                type="text"
                value={formData.province}
                onChange={(e) => setFormData(prev => ({...prev, province: e.target.value}))}
                placeholder="Enter province"
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                variant="outlined"
                size="md"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="City/Municipality"
                type="text"
                value={formData.city_municipality}
                onChange={(e) => setFormData(prev => ({...prev, city_municipality: e.target.value}))}
                placeholder="Enter city/municipality"
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
                variant="outlined"
                size="md"
              />
              
              <Input
                label="Barangay"
                type="text"
                value={formData.barangay}
                onChange={(e) => setFormData(prev => ({...prev, barangay: e.target.value}))}
                placeholder="Enter barangay"
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                variant="outlined"
                size="md"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Street Name"
                type="text"
                value={formData.street_name}
                onChange={(e) => setFormData(prev => ({...prev, street_name: e.target.value}))}
                placeholder="Enter street name"
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                }
                variant="outlined"
                size="md"
              />
              
              <Input
                label="House Number"
                type="text"
                value={formData.house_number}
                onChange={(e) => setFormData(prev => ({...prev, house_number: e.target.value}))}
                placeholder="Enter house number"
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                }
                variant="outlined"
                size="md"
              />
            </div>

            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6">
              <div className="text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Pin Your Location</h3>
                <p className="text-gray-600 mb-4">
                  Click the button below to select your exact business location on the map.
                </p>
                {formData.latitude && formData.longitude ? (
                  <div className="mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      ✓ Location Selected
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      {formData.latitude}, {formData.longitude}
                    </p>
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePickLocation}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                >
                  {formData.latitude && formData.longitude ? 'Change Location' : 'Pick Location'}
                </Button>
              </div>
            </div>
          </div>
        );

      case 2: // Documents
        const requiredDocs = getRequiredDocuments();
        
        if (requiredDocs.length === 0) {
          return (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Documents Required</h3>
              <p className="text-gray-600">
                No documents are required for unregistered businesses. You can proceed to the next step.
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Document Requirements</h3>
              <p className="text-blue-700 text-sm">
                Based on your business registration type (<strong>{businessRegistrationOptions.find(opt => opt.value === formData.businessRegistration)?.label}</strong>), 
                please upload the following documents:
              </p>
            </div>

            {requiredDocs.map((doc) => (
              <div key={doc.key} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {doc.label} {doc.required && <span className="text-red-500">*</span>}
                  </label>
                  {formData.documents[doc.key] && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Uploaded
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setFormData(prev => ({
                      ...prev,
                      documents: {
                        ...prev.documents,
                        [doc.key]: file
                      }
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-gray-50"
                />
                {formData.documents[doc.key] && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {formData.documents[doc.key]?.name}
                  </p>
                )}
              </div>
            ))}

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Upload Guidelines:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Accepted formats: PDF, JPG, JPEG, PNG</li>
                <li>• Maximum file size: 10MB per document</li>
                <li>• Ensure documents are clear and readable</li>
                <li>• All required documents must be uploaded to proceed</li>
              </ul>
            </div>
          </div>
        );

      case 3: // Verification
        return (
          <div className="text-center py-12">
            <div className="mb-8">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Email Verification</h3>
              <p className="text-gray-600 mb-6">
                We&apos;ve sent a 6-digit verification code to <strong>{formData.email}</strong>. 
                Please enter the code below to complete your registration.
              </p>
            </div>

            <div className="max-w-xs mx-auto mb-6">
              <Input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                variant="outlined"
                size="md"
                className="text-center text-lg font-mono tracking-widest"
              />
            </div>

            <Button
              onClick={handleOtpVerification}
              disabled={isLoading || otpCode.length !== 6}
              isLoading={isLoading}
              fullWidth
              className="max-w-xs mx-auto"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            >
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={sendOTP}
              className="mt-4"
            >
              Resend verification code
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Main Container - Non-scrollable */}
      <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-orange-400 via-purple-500 to-pink-600 relative">
        {/* Abstract Edge Geometry (squares & rectangles) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          {/* Corners */}
          <div className="absolute -top-10 -left-10 w-56 h-56 bg-gradient-to-br from-orange-300/50 to-purple-600/40 border border-white/20 rotate-6 shadow-xl animate-drift"></div>
          <div className="absolute -top-16 -right-20 w-64 h-40 bg-gradient-to-tr from-pink-500/50 to-purple-700/40 border border-white/20 -rotate-3 shadow-lg animate-drift-slow"></div>
          <div className="absolute -bottom-20 -left-14 w-72 h-48 bg-gradient-to-bl from-purple-600/50 to-orange-500/40 border border-white/20 rotate-12 shadow-2xl animate-drift"></div>
          <div className="absolute -bottom-24 -right-10 w-60 h-60 bg-gradient-to-br from-pink-400/50 to-orange-400/40 border border-white/20 rotate-45 shadow-xl animate-drift-fast"></div>
          {/* Edge accents */}
          <div className="absolute top-1/3 -left-12 w-40 h-72 bg-gradient-to-b from-purple-500/40 to-pink-500/40 border border-white/10 rotate-12 shadow-lg animate-drift"></div>
          <div className="absolute bottom-1/4 -right-16 w-52 h-32 bg-gradient-to-r from-orange-400/50 to-pink-500/40 border border-white/10 -rotate-6 shadow-lg animate-drift-slow"></div>
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-80 h-8 bg-gradient-to-r from-white/20 to-transparent opacity-60 rotate-2 animate-drift-fast"></div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 h-full flex items-center justify-center p-4">
          <div className="w-full max-w-4xl h-full max-h-[550px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 flex flex-col">
            
            {/* Single Panel - Signup Form */}
            <div className="w-full flex-1 flex items-start justify-center p-8 lg:p-12 py-2 lg:py-4 overflow-y-auto">
              <div className="w-full max-w-2xl space-y-6 min-h-full flex flex-col justify-start py-4">
                  
                  {/* Header */}
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden p-0 shadow-xl flex items-center justify-center">
                        <img src="/assets/rapexlogosquare.png" alt="Rapex logo" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Create Merchant Account</h2>
                    <p className="text-gray-600 text-sm">Join thousands of merchants using Rapex</p>
                  </div>

                  {/* Progress Steps */}
                  <div className="flex justify-between items-center mb-8">
                    {steps.map((step, index) => (
                      <div key={index} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                          index <= currentStep 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-gray-200 text-gray-500'
                        }`}>
                          {index < currentStep ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            index + 1
                          )}
                        </div>
                        {index < steps.length - 1 && (
                          <div className={`w-16 h-1 mx-2 transition-all duration-200 ${
                            index < currentStep ? 'bg-orange-500' : 'bg-gray-200'
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1">
                    {renderStepContent()}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={currentStep === 0}
                      leftIcon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      }
                    >
                      Back
                    </Button>

                    {currentStep < steps.length - 1 ? (
                      <Button
                        type="button"
                        onClick={handleNext}
                        isLoading={isLoading}
                        disabled={!canProceedToNext()}
                        rightIcon={
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        }
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={currentStep === 2 ? handleDocumentUpload : (currentStep === 1 ? handleLocationSubmit : handleOtpVerification)}
                        isLoading={isLoading}
                        disabled={currentStep === 3 ? otpCode.length !== 6 : false}
                      >
                        {currentStep === 2 ? 'Upload Documents' : (currentStep === 1 ? 'Save Location' : 'Verify Account')}
                      </Button>
                    )}
                  </div>

                  {/* Back to Login */}
                  <div className="text-center pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500">
                      Already have an account?{' '}
                      <Link href="/merchant/login" className="text-orange-600 font-medium hover:text-orange-700">
                        Sign in here
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          <p className="text-white/80 text-sm text-center">
            © 2025 Rapex. All rights reserved.
          </p>
        </div>
      
      <Notification
        isVisible={notification.isVisible}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={hideNotification}
        duration={5000}
        position="top-right"
      />
      
      <LocationPicker
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onLocationSelect={handleLocationSelect}
        initialLat={formData.latitude || 14.5995}
        initialLng={formData.longitude || 120.9842}
      />

      <style jsx>{`
        @keyframes drift { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        .animate-drift { animation: drift 9s ease-in-out infinite; }
        .animate-drift-slow { animation: drift 14s ease-in-out infinite; }
        .animate-drift-fast { animation: drift 6s ease-in-out infinite; }
      `}</style>
    </>
  );
};

export default MerchantSignup;
