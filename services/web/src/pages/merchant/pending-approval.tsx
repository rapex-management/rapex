import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import StatusBadge from '../../components/common/StatusBadge';

const PendingApprovalPage: React.FC = () => {
  useEffect(() => {
    // Clear any existing tokens since user shouldn't be logged in
    localStorage.removeItem('merchant_token');
    localStorage.removeItem('merchant_refresh_token');
    localStorage.removeItem('merchant');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 text-center">
          
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-xl overflow-hidden shadow-xl flex items-center justify-center">
              <Image 
                src="/assets/rapexlogosquare.png" 
                alt="Rapex Logo" 
                width={64} 
                height={64} 
                className="w-full h-full object-cover" 
              />
            </div>
          </div>

          {/* Pending Icon */}
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          {/* Main Content */}
          <div className="space-y-4 mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Application Under Review
            </h1>
            
            <div className="space-y-3 text-gray-600">
              <p className="text-lg leading-relaxed">
                Thank you for submitting your merchant application. Your account and documents are currently being reviewed by our team.
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-amber-800">Review Timeline</p>
                    <p className="text-amber-700">
                      Our review process typically takes <strong>1-2 business days</strong>. 
                      You will receive an email notification once your account has been approved.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Steps */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Application Status</h3>
            <div className="space-y-3">
              <StatusBadge status="completed">Application Submitted</StatusBadge>
              <StatusBadge status="completed">Documents Uploaded</StatusBadge>
              <StatusBadge status="current">Under Admin Review</StatusBadge>
              <StatusBadge status="pending">Account Activation</StatusBadge>
            </div>
          </div>

          {/* What's Next */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 text-left">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Our team will verify your business documents</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>We&apos;ll review your business information for compliance</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>You&apos;ll receive an email notification upon approval</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Once approved, you can access your merchant dashboard</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <Link href="/merchant/login">
              <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl">
                Back to Sign In
              </button>
            </Link>
            
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Need help?{' '}
                <a 
                  href="mailto:support@rapex.com" 
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Contact Support
                </a>
              </p>
            </div>
          </div>

        </div>
        
        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            © 2024 Rapex. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalPage;
