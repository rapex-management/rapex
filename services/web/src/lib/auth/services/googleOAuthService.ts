/**
 * Google OAuth service for frontend integration with NextAuth.js
 * Provides secure, fast, and reliable Google Sign-In functionality
 */

import { signIn, signOut, getSession } from 'next-auth/react';
import type { MerchantUser, AdminUser } from '../types/auth.types';

export interface GoogleSignInOptions {
  userType: 'admin' | 'merchant';
  callbackUrl?: string;
  redirect?: boolean;
}

export interface GoogleSignInResult {
  success: boolean;
  user?: MerchantUser | AdminUser;
  tokens?: {
    access: string;
    refresh: string;
  };
  error?: string;
  requiresProfileCompletion?: boolean;
  statusCode?: string;
  message?: string;
  redirectTo?: string;
}

export class GoogleOAuthService {
  private static readonly API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  /**
   * Initiate Google Sign-In flow
   */
  static async signInWithGoogle(options: GoogleSignInOptions): Promise<GoogleSignInResult> {
    try {
      // Start NextAuth Google sign-in
      const result = await signIn('google', {
        redirect: false,
        callbackUrl: options.callbackUrl || '/'
      });

      if (result?.error) {
        return {
          success: false,
          error: `Google sign-in failed: ${result.error}`
        };
      }

      // Get the session to extract tokens
      const session = await getSession();
      
      if (!session?.accessToken) {
        return {
          success: false,
          error: 'Failed to obtain Google access token'
        };
      }

      // Authenticate with our backend
      return await GoogleOAuthService.authenticateWithBackend(
        session.accessToken,
        session.idToken,
        options.userType
      );

    } catch (error) {
      console.error('Google sign-in error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google sign-in failed'
      };
    }
  }

  /**
   * Authenticate with backend using Google tokens
   */
  private static async authenticateWithBackend(
    accessToken: string,
    idToken: string | undefined,
    userType: 'admin' | 'merchant'
  ): Promise<GoogleSignInResult> {
    try {
      const endpoint = userType === 'admin' 
        ? '/api/proxy/auth/admin/google'
        : '/api/proxy/auth/merchant/google';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          id_token: idToken
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store tokens in localStorage for the auth service
        if (data.access && data.refresh) {
          const authKey = userType === 'admin' ? 'admin_auth_tokens' : 'merchant_auth_tokens';
          const userKey = userType === 'admin' ? 'admin_user' : 'merchant_user';
          
          localStorage.setItem(authKey, JSON.stringify({
            access: data.access,
            refresh: data.refresh
          }));
          
          localStorage.setItem(userKey, JSON.stringify(data));
        }

        return {
          success: true,
          user: data,
          tokens: {
            access: data.access,
            refresh: data.refresh
          },
          requiresProfileCompletion: data.requires_profile_completion,
          statusCode: data.status_code,
          message: data.message,
          redirectTo: data.redirect_to
        };
      } else {
        return {
          success: false,
          error: data.detail || 'Authentication failed',
          statusCode: data.status_code,
          message: data.message
        };
      }
    } catch (error) {
      console.error('Backend authentication error:', error);
      return {
        success: false,
        error: 'Backend authentication failed'
      };
    }
  }

  /**
   * Sign out from Google and clear session
   */
  static async signOut(): Promise<void> {
    try {
      // Sign out from NextAuth (clears Google session)
      await signOut({ redirect: false });
      
      // Clear localStorage
      localStorage.removeItem('admin_auth_tokens');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('merchant_auth_tokens');
      localStorage.removeItem('merchant_user');
      
    } catch (error) {
      console.error('Sign out error:', error);
      // Still clear local storage even if sign out fails
      localStorage.removeItem('admin_auth_tokens');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('merchant_auth_tokens');
      localStorage.removeItem('merchant_user');
    }
  }

  /**
   * Check if user is signed in with Google
   */
  static async isSignedIn(): Promise<boolean> {
    try {
      const session = await getSession();
      return !!session?.user;
    } catch {
      return false;
    }
  }

  /**
   * Get current Google session
   */
  static async getCurrentSession() {
    try {
      return await getSession();
    } catch {
      return null;
    }
  }
}
