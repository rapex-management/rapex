import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Stepper } from '../../components/ui/Stepper';

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
  
  // Step 2: Address Info
  zipcode: string;
  province: string;
  city_municipality: string;
  barangay: string;
  street_name: string;
  house_number: string;
  latitude: number | null;
  longitude: number | null;
  
  // Step 3: Documents
  documents: File[];
}

const MerchantSignup = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [formData, setFormData] = useState<FormData>({
    merchantName: '',
    ownerName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    mccCategory: '0',
    zipcode: '',
    province: '',
    city_municipality: '',
    barangay: '',
    street_name: '',
    house_number: '',
    latitude: null,
    longitude: null,
    documents: []
  });

  const router = useRouter();
  const steps = ['General Info', 'Address & Location', 'Documents', 'Verification', 'Complete'];

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
    { value: '15', label: 'Entertainment' },
    // Add more as needed
  ];

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleOtpVerification = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/proxy/merchant/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchant_id: merchantId,
          otp_code: otpCode
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentStep(4); // Move to completion step
      } else {
        setError(data.error || 'OTP verification failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateCurrentStep = () => {
    setError('');
    
    switch (currentStep) {
      case 0:
        if (!formData.merchantName || !formData.ownerName || !formData.username || 
            !formData.email || !formData.password || !formData.phone) {
          setError('Please fill in all required fields');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters');
          return false;
        }
        break;
      case 1:
        if (!formData.zipcode || !formData.province || !formData.city_municipality || !formData.barangay || !formData.street_name || !formData.house_number) {
          setError('Please fill in all address fields');
          return false;
        }
        if (!formData.latitude || !formData.longitude) {
          setError('Please select your location on the map');
          return false;
        }
        break;
      case 2:
        if (formData.documents.length === 0) {
          setError('Please upload at least one business document');
          return false;
        }
        break;
    }
    return true;
  };

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter(file => {
        return file.size <= 2 * 1024 * 1024; // 2MB limit
      });
      
      if (validFiles.length !== fileArray.length) {
        setError('Some files exceed 2MB limit');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...validFiles]
      }));
    }
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const handleLocationSelect = () => {
    // TODO: Implement map location picker
    alert('Map location picker will be implemented. For now, setting dummy coordinates.');
    setFormData(prev => ({
      ...prev,
      latitude: 14.5995,
      longitude: 120.9842
    }));
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    
    setIsLoading(true);
    setError('');

    try {
      // Prepare form data for submission
      const submitData = new FormData();
      
      // Append all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== 'documents' && value !== null) {
          submitData.append(key, value.toString());
        }
      });
      
      // Append documents
      formData.documents.forEach((file, index) => {
        submitData.append(`document_${index}`, file);
      });

      const response = await fetch('http://localhost:8000/api/auth/merchant/signup/', {
        method: 'POST',
        body: submitData,
      });

      const data = await response.json();

      if (response.ok) {
        setMerchantId(data.merchant_id);
        setCurrentStep(3); // Move to verification step
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Business Name *"
                value={formData.merchantName}
                onChange={(e) => setFormData(prev => ({...prev, merchantName: e.target.value}))}
                placeholder="Enter your business name"
                required
              />
              
              <Input
                label="Owner Name *"
                value={formData.ownerName}
                onChange={(e) => setFormData(prev => ({...prev, ownerName: e.target.value}))}
                placeholder="Enter owner's full name"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Username *"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({...prev, username: e.target.value}))}
                placeholder="Choose a username"
                required
              />
              
              <Input
                label="Email Address *"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Password *"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
                placeholder="Create a password"
                required
              />
              
              <Input
                label="Confirm Password *"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({...prev, confirmPassword: e.target.value}))}
                placeholder="Confirm your password"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Phone Number *"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                placeholder="+63 XXX XXX XXXX"
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Category *
                </label>
                <select
                  value={formData.mccCategory}
                  onChange={(e) => setFormData(prev => ({...prev, mccCategory: e.target.value}))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  {mccCategories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Business Address</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="House Number *"
                value={formData.house_number}
                onChange={(e) => setFormData(prev => ({...prev, house_number: e.target.value}))}
                placeholder="Enter house number"
                required
              />
              
              <Input
                label="Street Name *"
                value={formData.street_name}
                onChange={(e) => setFormData(prev => ({...prev, street_name: e.target.value}))}
                placeholder="Enter street name"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Barangay *"
                value={formData.barangay}
                onChange={(e) => setFormData(prev => ({...prev, barangay: e.target.value}))}
                placeholder="Enter barangay"
                required
              />
              
              <Input
                label="City/Municipality *"
                value={formData.city_municipality}
                onChange={(e) => setFormData(prev => ({...prev, city_municipality: e.target.value}))}
                placeholder="Enter city/municipality"
                required
              />
              
              <Input
                label="Province *"
                value={formData.province}
                onChange={(e) => setFormData(prev => ({...prev, province: e.target.value}))}
                placeholder="Enter province"
                required
              />
            </div>

            <Input
              label="Postal Code *"
              value={formData.zipcode}
              onChange={(e) => setFormData(prev => ({...prev, zipcode: e.target.value}))}
              placeholder="Enter postal code"
              required
            />

            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">Select Your Location</h4>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="space-y-4">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M24 5C15.178 5 8 12.178 8 21c0 11.333 16 19 16 19s16-7.667 16-19c0-8.822-7.178-16-16-16z" />
                    <circle cx="24" cy="21" r="3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  <div>
                    <p className="text-gray-600">Click to select your business location on map</p>
                    {formData.latitude && formData.longitude && (
                      <p className="text-sm text-green-600 mt-2">
                        Location selected: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                      </p>
                    )}
                  </div>
                  <Button type="button" variant="outline" onClick={handleLocationSelect}>
                    {formData.latitude ? 'Change Location' : 'Select Location'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Business Documents</h3>
            <p className="text-gray-600">Upload documents to verify your business registration (max 2MB each)</p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <div className="text-center space-y-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M24 8v8m0 0l4-4m-4 4l-4-4m4-4V8m0 32h16V8H8v32h16z" />
                </svg>
                <div>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-primary-600 hover:text-primary-500 font-medium">
                      Click to upload
                    </span>
                    <span className="text-gray-600"> or drag and drop</span>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-500">PDF, JPG, PNG up to 2MB each</p>
                </div>
              </div>
            </div>

            {formData.documents.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Uploaded Documents</h4>
                {formData.documents.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Email Verification</h3>
            <p className="text-gray-600">
              We've sent a 6-digit verification code to <strong>{formData.email}</strong>. 
              Please enter the code below to verify your email address.
            </p>
            
            <div className="max-w-sm mx-auto">
              <Input
                label="Verification Code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleOtpVerification}
                variant="primary"
                disabled={isLoading || otpCode.length !== 6}
              >
                {isLoading ? 'Verifying...' : 'Verify Email'}
              </Button>
              
              <Button
                onClick={() => {
                  // TODO: Implement resend OTP
                  setError('Resend functionality coming soon');
                }}
                variant="outline"
                disabled={isLoading}
              >
                Resend Code
              </Button>
            </div>
            
            <p className="text-sm text-gray-500">
              Didn't receive the code? Check your spam folder or click resend.
            </p>
          </div>
        );

      case 4:
      case 4:
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Registration Complete!</h3>
            <p className="text-gray-600">
              Your email has been verified successfully! Our team will now review your application and documents. 
              You will receive an email notification once your account is approved. This process usually takes 1-2 working days.
            </p>
            <p className="text-sm text-gray-500">
              You cannot log in until your account is verified and approved by our admin team.
            </p>
            <Button onClick={() => router.push('/merchant/login')} variant="primary">
              Back to Login
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4">
            <div className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              RX
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Join Rapex</h1>
          <p className="text-orange-100">Start your journey as a Rapex merchant</p>
        </div>

        <Card className="backdrop-blur-sm bg-white/95 shadow-2xl" padding="lg">
          {/* Stepper */}
          <Stepper currentStep={currentStep} steps={steps} />

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Step Content */}
          <div className="mb-8">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          {currentStep < 3 && (
            <div className="flex justify-between">
              <Button
                type="button"
                variant="secondary"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                Previous
              </Button>

              {currentStep < 2 ? (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  isLoading={isLoading}
                >
                  Submit Application
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default MerchantSignup;
