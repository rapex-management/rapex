import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from '../../components/ui/Button';

const errorMessages = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification token has expired or has already been used.',
  Default: 'An error occurred during authentication.',
  OAuthCallback: 'There was an error with the OAuth callback. Please try again.',
  OAuthSignin: 'Error occurred while signing in with OAuth provider.',
  OAuthAccountNotLinked: 'This account is linked to a different authentication method.',
  EmailCreateAccount: 'Could not create account with this email.',
  Callback: 'Error in callback handler.',
  OAuthCreateAccount: 'Could not create OAuth account.',
  EmailSignin: 'Check your email address.',
  CredentialsSignin: 'Sign in failed. Check the details you provided are correct.',
  SessionRequired: 'Please sign in to access this page.',
};

export default function AuthError() {
  const router = useRouter();
  const { error } = router.query;
  
  const errorType = error as string;
  const errorMessage = errorMessages[errorType as keyof typeof errorMessages] || errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 text-red-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {errorMessage}
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          <Button
            onClick={() => router.back()}
            variant="primary"
            fullWidth
          >
            Go Back
          </Button>
          
          <div className="text-center">
            <Link href="/" className="text-indigo-600 hover:text-indigo-500">
              Return to Home
            </Link>
          </div>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-md">
            <p className="text-xs text-gray-500">
              Error code: {errorType}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
