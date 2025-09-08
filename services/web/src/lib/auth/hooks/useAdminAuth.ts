import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { adminAuthService } from '../services/adminAuthService';
import { AdminUser, AuthState, LoginCredentials } from '../types/auth.types';

export function useAdminAuth() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState<AdminUser>>({
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = () => {
      const user = adminAuthService.getCurrentUser();
      const tokens = adminAuthService.getTokens();
      const isAuthenticated = adminAuthService.isAuthenticated();

      setAuthState({
        user,
        tokens,
        isAuthenticated,
        isLoading: false,
      });
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const newAuthState = await adminAuthService.login(credentials);
      setAuthState(newAuthState);
      
      return { success: true };
    } catch (error: unknown) {
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false,
        isAuthenticated: false,
        user: null,
        tokens: null 
      }));
      
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }, []);

  const logout = useCallback(() => {
    adminAuthService.logout();
    setAuthState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
    });
    router.replace('/admin/login');
  }, [router]);

  const refreshToken = useCallback(async () => {
    try {
      const newTokens = await adminAuthService.refreshToken();
      setAuthState(prev => ({
        ...prev,
        tokens: newTokens
      }));
      return { success: true };
    } catch (error: unknown) {
      logout();
      const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
      return { success: false, error: errorMessage };
    }
  }, [logout]);

  // Redirect to login if not authenticated
  const requireAuth = useCallback((redirectTo: string = '/admin/login') => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      router.replace(redirectTo);
      return false;
    }
    return true;
  }, [authState.isAuthenticated, authState.isLoading, router]);

  // Check if user has superuser privileges
  const isSuperUser = useCallback(() => {
    return adminAuthService.isSuperUser();
  }, []);

  // Check if user has valid status
  const hasValidStatus = useCallback(() => {
    return adminAuthService.hasValidStatus();
  }, []);

  return {
    // State
    user: authState.user,
    tokens: authState.tokens,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    
    // Actions
    login,
    logout,
    refreshToken,
    requireAuth,
    
    // Checks
    isSuperUser,
    hasValidStatus,
  };
}
