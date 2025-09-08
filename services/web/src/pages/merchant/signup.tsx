import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dropdown } from '../../components/ui/Dropdown';
import Notification from '../../components/ui/Notification';
import FileUpload from '../../components/ui/FileUpload';
import MapPickerModal from '../../components/ui/MapPickerModal';

interface FormData {
  // Step 1: General Info
  merchantName: string;
  ownerName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  businessCategory: string;
  businessType: string;
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
  const [sessionId, setSessionId] = useState(''); // Changed from merchantId to sessionId
  const [isCompleted, setIsCompleted] = useState(false);
  const [businessCategories, setBusinessCategories] = useState<Array<{id: number, category_name: string, description: string}>>([]);
  const [businessTypes, setBusinessTypes] = useState<Array<{id: number, business_type: string, business_category: number}>>([]);
  const [isLoadingBusinessCategories, setIsLoadingBusinessCategories] = useState(false);
  const [isLoadingBusinessTypes, setIsLoadingBusinessTypes] = useState(false);
  const [isSavingStep, setIsSavingStep] = useState(false);
  
  // Location picker states (simplified for modal approach)
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
    businessCategory: '',
    businessType: '',
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

  const steps = ['General Info', 'Location', 'Documents', 'Verification'];

  const showNotification = useCallback((type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setNotification({
      isVisible: true,
      type,
      title,
      message
    });
  }, []);

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };

  // Google Maps functions
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      showNotification('error', 'Geolocation Error', 'Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
        
        showNotification('success', 'Location Updated', 'Your current location has been set successfully.');
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location services and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        showNotification('error', 'Location Error', errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, [showNotification]);

  // Data fetching functions
  const fetchBusinessCategories = useCallback(async () => {
    setIsLoadingBusinessCategories(true);
    try {
      const response = await fetch('/api/proxy/data/business-categories/');
      const data = await response.json();
      if (data.success) {
        setBusinessCategories(data.data);
      } else {
        showNotification('error', 'Data Error', 'Failed to load business categories.');
      }
    } catch {
      showNotification('error', 'Connection Error', 'Unable to load business categories.');
    } finally {
      setIsLoadingBusinessCategories(false);
    }
  }, [showNotification]);

  const fetchBusinessTypes = useCallback(async (businessCategoryId?: string) => {
    setIsLoadingBusinessTypes(true);
    try {
      const url = businessCategoryId ? `/api/proxy/data/business-types?business_category_id=${businessCategoryId}` : '/api/proxy/data/business-types';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setBusinessTypes(data.data);
      } else {
        showNotification('error', 'Data Error', 'Failed to load business types.');
      }
    } catch {
      showNotification('error', 'Connection Error', 'Unable to load business types.');
    } finally {
      setIsLoadingBusinessTypes(false);
    }
  }, [showNotification]);

  // Handle location selection from modal
  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
    
    showNotification('success', 'Location Set', 'Business location has been successfully updated.');
  }, [showNotification]);

  // Load initial data
  useEffect(() => {
    fetchBusinessCategories();
    fetchBusinessTypes();
  }, [fetchBusinessCategories, fetchBusinessTypes]);

  // Handle business category change
  const handleBusinessCategoryChange = useCallback((value: string) => {
    setFormData(prev => ({
      ...prev, 
      businessCategory: value,
      businessType: '' // Reset business type when category changes
    }));
    
    // Fetch business types for the selected category
    if (value) {
      fetchBusinessTypes(value);
    } else {
      fetchBusinessTypes();
    }
  }, [fetchBusinessTypes]);

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

  const getPasswordRequirements = (password: string) => {
    return [
      {
        text: 'At least 8 characters',
        met: password.length >= 8
      },
      {
        text: 'One uppercase letter (A-Z)',
        met: /[A-Z]/.test(password)
      },
      {
        text: 'One lowercase letter (a-z)',
        met: /[a-z]/.test(password)
      },
      {
        text: 'One number (0-9)',
        met: /\d/.test(password)
      },
      {
        text: 'One special character (!@#$%^&*)',
        met: /[!@#$%^&*(),.?":{}|<>]/.test(password)
      }
    ];
  };

  const PasswordRequirements = ({ password }: { password: string }) => {
    const requirements = getPasswordRequirements(password);
    
    return (
      <div className="mt-2 space-y-1">
        <p className="text-sm font-medium text-gray-700 mb-2">Password requirements:</p>
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
              req.met ? 'bg-green-500' : 'bg-gray-300'
            }`}>
              {req.met && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className={`text-sm ${req.met ? 'text-green-600' : 'text-gray-500'}`}>
              {req.text}
            </span>
          </div>
        ))}
      </div>
    );
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
            !formData.phone || !formData.businessCategory || !formData.businessType) {
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
        if (!formData.latitude || !formData.longitude || 
            formData.latitude === 0 || formData.longitude === 0) {
          showNotification('error', 'Location Required', 'Please select your exact location on the map.');
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
    
    if (isValid) {
      await saveCurrentStepData();
    }
    
    setIsLoading(false);
  };

  const saveCurrentStepData = async () => {
    setIsSavingStep(true);
    
    try {
      let stepData: Record<string, unknown> = {};
      const step = currentStep + 1; // API expects 1-based step numbers
      
      // Prepare data based on current step
      if (currentStep === 0) {
        // Step 1: General Info
        stepData = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          confirm_password: formData.confirmPassword,
          merchant_name: formData.merchantName,
          owner_name: formData.ownerName,
          phone: formData.phone,
          business_category: parseInt(formData.businessCategory),
          business_type: parseInt(formData.businessType),
          business_registration: parseInt(formData.businessRegistration)
        };
      } else if (currentStep === 1) {
        // Step 2: Location
        stepData = {
          zipcode: formData.zipcode,
          province: formData.province,
          city_municipality: formData.city_municipality,
          barangay: formData.barangay,
          street_name: formData.street_name,
          house_number: formData.house_number,
          latitude: formData.latitude ? parseFloat(formData.latitude.toString()) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude.toString()) : null
        };
        
        console.log('Location step data being sent:', stepData);
        
      } else if (currentStep === 2) {
        // Step 3: Documents - Handle file uploads differently
        await handleDocumentUpload();
        return; // Exit early as document upload handles the flow
      }

      const response = await fetch('/api/proxy/merchant/registration/step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: step,
          session_id: sessionId || undefined,
          data: stepData
        }),
      });

      console.log('Registration step response:', response.status, response.statusText);

      const responseData = await response.json();
      console.log('Registration step data:', responseData);

      if (response.ok) {
        // Update session ID if this is the first step
        if (!sessionId && responseData.session_id) {
          setSessionId(responseData.session_id);
        }
        
        // Show success message
        if (step === 3) {
          showNotification('success', 'Documents Saved', 'OTP sent to your email for verification.');
          setCurrentStep(3); // Move to verification step
        } else {
          showNotification('success', 'Step Saved', `Step ${step} saved successfully.`);
          setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
        }
      } else {
        // Enhanced error handling
        let errorMessage = responseData.detail || 'Failed to save step data.';
        
        // Handle validation errors
        if (responseData.errors || responseData.error) {
          const errors = responseData.errors || responseData.error;
          if (typeof errors === 'object') {
            const errorMessages = Object.entries(errors).map(([field, messages]) => {
              if (Array.isArray(messages)) {
                return `${field}: ${messages.join(', ')}`;
              }
              return `${field}: ${messages}`;
            });
            errorMessage = errorMessages.join('\n');
          } else {
            errorMessage = errors.toString();
          }
        }
        
        console.error('Step validation errors:', responseData);
        showNotification('error', 'Validation Error', errorMessage);
      }
    } catch (error) {
      console.error('Step save error:', error);
      showNotification('error', 'Connection Error', 'Unable to connect to server. Please try again.');
    } finally {
      setIsSavingStep(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!sessionId) {
      showNotification('error', 'Session Error', 'Registration session not found. Please start over.');
      return;
    }

    console.log('Starting document upload with session ID:', sessionId);
    console.log('Documents to upload:', Object.keys(formData.documents));

    try {
      const formDataObj = new FormData();
      formDataObj.append('session_id', sessionId);
      
      // Add uploaded files
      let fileCount = 0;
      Object.entries(formData.documents).forEach(([key, file]) => {
        if (file) {
          console.log(`Adding file: ${key}, size: ${file.size}, type: ${file.type}`);
          formDataObj.append(key, file);
          fileCount++;
        }
      });

      if (fileCount === 0) {
        showNotification('error', 'No Files', 'Please upload at least one document before proceeding.');
        return;
      }

      console.log(`Uploading ${fileCount} files...`);

      const response = await fetch('/api/proxy/merchant/registration/documents', {
        method: 'POST',
        body: formDataObj,
      });

      console.log('Document upload response status:', response.status);

      const responseData = await response.json();
      console.log('Document upload response data:', responseData);

      if (response.ok) {
        showNotification('success', 'Documents Uploaded', 'Documents uploaded successfully. OTP sent to your email.');
        setCurrentStep(3); // Move to verification step
      } else {
        // Enhanced error handling based on error type
        let errorMessage = responseData.detail || 'Failed to upload documents.';
        
        if (responseData.error === 'FILE_TOO_LARGE') {
          errorMessage = 'One or more files exceed the 2MB size limit.';
        } else if (responseData.error === 'INVALID_FILE_TYPE') {
          errorMessage = 'Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.';
        } else if (responseData.errors) {
          // Handle validation errors from backend
          const errors = responseData.errors;
          if (typeof errors === 'object') {
            const errorMessages = Object.entries(errors).map(([field, messages]) => {
              if (Array.isArray(messages)) {
                return `${field}: ${messages.join(', ')}`;
              }
              return `${field}: ${messages}`;
            });
            errorMessage = errorMessages.join('\n');
          }
        }
        
        showNotification('error', 'Upload Failed', errorMessage);
      }
    } catch (error) {
      console.error('Document upload error:', error);
      showNotification('error', 'Connection Error', 'Unable to connect to server. Please try again.');
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
               formData.phone && formData.phone.length >= 13 && formData.businessCategory && formData.businessType; // +63 + 10 digits
      case 1: // Location
        return formData.zipcode && formData.province && formData.city_municipality && 
               formData.barangay && formData.street_name && formData.house_number &&
               formData.latitude && formData.longitude && 
               formData.latitude !== 0 && formData.longitude !== 0;
      case 2: // Documents
        const requiredDocs = getRequiredDocuments().filter(doc => doc.required);
        return requiredDocs.every(doc => formData.documents[doc.key]);
      default:
        return true;
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

    if (!sessionId) {
      showNotification('error', 'Session Error', 'Registration session not found. Please start over.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/proxy/merchant/registration/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          otp_code: otpCode
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsCompleted(true);
        showNotification('success', 'Registration Complete', 'Your merchant account has been created successfully!');
        
        // Optional: Redirect to login or dashboard
        setTimeout(() => {
          window.location.href = '/merchant/login';
        }, 3000);
      } else {
        showNotification('error', 'Verification Failed', data.detail || 'Invalid or expired OTP code. Please try again.');
      }
    } catch {
      showNotification('error', 'Connection Error', 'Unable to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
              <div>
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
                {formData.password && <PasswordRequirements password={formData.password} />}
              </div>
              
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Dropdown
                label="Business Category"
                options={businessCategories.map(category => ({ value: category.id.toString(), label: category.category_name }))}
                value={formData.businessCategory}
                onChange={handleBusinessCategoryChange}
                required
                disabled={isLoadingBusinessCategories}
                placeholder={isLoadingBusinessCategories ? "Loading categories..." : "Select business category"}
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
                variant="outlined"
                size="md"
              />
              
              <Dropdown
                label="Business Type"
                options={businessTypes.map(type => ({ value: type.id.toString(), label: type.business_type }))}
                value={formData.businessType}
                onChange={(value) => setFormData(prev => ({...prev, businessType: value}))}
                required
                disabled={!formData.businessCategory || isLoadingBusinessTypes}
                placeholder={!formData.businessCategory ? "Select category first" : isLoadingBusinessTypes ? "Loading types..." : "Select business type"}
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6.14M16 6H8m0 0v-.5a.5.5 0 01.5-.5h7a.5.5 0 01.5.5V6M8 6v10a2 2 0 002 2h4a2 2 0 002-2V6" />
                  </svg>
                }
                variant="outlined"
                size="md"
              />
            </div>

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
                placeholder="e.g., 4104 (Kawit, Cavite)"
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
                placeholder="e.g., Cavite"
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
                placeholder="e.g., Kawit"
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
                placeholder="e.g., Poblacion"
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
                placeholder="e.g., Aguinaldo Highway"
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
                placeholder="e.g., 123 or Block 5 Lot 10"
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

            {/* Latitude and Longitude Fields - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Latitude"
                type="text"
                value={formData.latitude?.toString() || ''}
                placeholder="Latitude will be auto-populated"
                disabled
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                variant="outlined"
                size="md"
                className="bg-gray-50"
              />
              
              <Input
                label="Longitude"
                type="text"
                value={formData.longitude?.toString() || ''}
                placeholder="Longitude will be auto-populated"
                disabled
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                variant="outlined"
                size="md"
                className="bg-gray-50"
              />
            </div>

            {/* Location Action Buttons - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMapModalOpen(true)}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                }
                className="w-full"
              >
                Choose Location
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={getCurrentLocation}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                className="w-full"
              >
                Use Current Location
              </Button>
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
          <div className="space-y-8">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">Document Requirements</h3>
                  <p className="text-orange-700 text-sm leading-relaxed">
                    Based on your business registration type (<strong>{businessRegistrationOptions.find(opt => opt.value === formData.businessRegistration)?.label}</strong>), 
                    please upload the following documents. All files must be clear, readable, and under 2MB in size.
                  </p>
                </div>
              </div>
            </div>

            {/* Document Upload Forms */}
            <div className="space-y-6">
              {requiredDocs.map((doc) => (
                <FileUpload
                  key={doc.key}
                  label={doc.label}
                  value={formData.documents[doc.key]}
                  onChange={(file) => {
                    setFormData(prev => ({
                      ...prev,
                      documents: {
                        ...prev.documents,
                        [doc.key]: file
                      }
                    }));
                  }}
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSize={2}
                  required={doc.required}
                  optional={!doc.required}
                  helperText={doc.required ? "This document is required for your business type" : "This document is optional but may help speed up verification"}
                />
              ))}
            </div>

            {/* Guidelines Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Upload Guidelines</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-xs font-medium text-gray-700 mb-2">Accepted Formats</h5>
                      <div className="flex flex-wrap gap-2">
                        {['.PDF', '.JPG', '.JPEG', '.PNG'].map((format) => (
                          <span key={format} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono">
                            {format}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xs font-medium text-gray-700 mb-2">Requirements</h5>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• Maximum 2MB per file</li>
                        <li>• Clear and readable quality</li>
                        <li>• Complete document visible</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Summary */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Upload Progress</p>
                    <p className="text-xs text-gray-500">
                      {Object.values(formData.documents).filter(Boolean).length} of {requiredDocs.length} documents uploaded
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {requiredDocs.map((doc) => (
                    <div
                      key={doc.key}
                      className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                        formData.documents[doc.key] 
                          ? 'bg-green-500' 
                          : doc.required 
                            ? 'bg-red-200' 
                            : 'bg-gray-200'
                      }`}
                      title={`${doc.label} - ${formData.documents[doc.key] ? 'Uploaded' : doc.required ? 'Required' : 'Optional'}`}
                    />
                  ))}
                </div>
              </div>
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
                  <div className="flex items-center justify-center space-x-6 mb-8">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden p-0 shadow-xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-pink-600">
                        <Image src="/assets/rapexlogosquare.png" alt="Rapex logo" width={200} height={200} className="w-full h-full object-cover" />
                      </div>
                    </div>
                    
                    {/* Title and Subtitle */}
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-gray-900 leading-tight">Create Merchant Account</h2>
                      <p className="text-gray-600 text-sm mt-1">Join thousands of merchants using Rapex</p>
                    </div>
                  </div>

                  {/* Progress Steps */}
                  <div className="mb-10">
                    <div className="flex items-center justify-between">
                      {steps.map((step, index) => (
                        <React.Fragment key={index}>
                          {/* Step Circle with Icon and Label */}
                          <div className="flex flex-col items-center space-y-3">
                            {/* Step Circle with Icon */}
                            <div className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                              index <= currentStep 
                                ? 'bg-gradient-to-br from-orange-500 to-pink-600 text-white transform scale-110' 
                                : 'bg-white text-gray-400 border-2 border-gray-200'
                            }`}>
                              {index < currentStep ? (
                                // Completed - Check Icon
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : index === 0 ? (
                                // General Info - User Icon
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              ) : index === 1 ? (
                                // Location - Map Pin Icon
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              ) : index === 2 ? (
                                // Documents - Document Icon
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              ) : (
                                // Verification - Shield Check Icon
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                              )}
                            </div>
                            
                            {/* Step Label */}
                            <div className="text-center">
                              <span className={`text-xs font-medium transition-colors duration-300 ${
                                index <= currentStep 
                                  ? 'text-orange-600' 
                                  : 'text-gray-500'
                              }`}>
                                {step}
                              </span>
                            </div>
                          </div>
                          
                          {/* Progress Line between steps */}
                          {index < steps.length - 1 && (
                            <div className="flex-1 mx-4 mt-[-40px]">
                              <div className={`h-1 rounded-full transition-all duration-500 ease-in-out ${
                                index < currentStep 
                                  ? 'bg-gradient-to-r from-orange-500 to-pink-600' 
                                  : 'bg-gray-200'
                              }`} />
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
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
                        onClick={currentStep === 3 ? handleOtpVerification : handleNext}
                        isLoading={isLoading || isSavingStep}
                        disabled={currentStep === 3 ? otpCode.length !== 6 : false}
                      >
                        {currentStep === 3 ? 'Verify Account' : 'Next'}
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

      {/* Map Picker Modal */}
      <MapPickerModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onLocationSelect={handleLocationSelect}
        initialLat={formData.latitude}
        initialLng={formData.longitude}
        title="Select Your Business Location"
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
