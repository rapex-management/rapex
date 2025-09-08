import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { merchantAuthService } from '../services/merchantAuthService';
import { MerchantUser, AuthState, LoginCredentials } from '../types/auth.types';

export function useMerchantAuth() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState<MerchantUser>>({
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = () => {
      const user = merchantAuthService.getCurrentUser();
      const tokens = merchantAuthService.getTokens();
      const isAuthenticated = merchantAuthService.isAuthenticated();

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
      
      const newAuthState = await merchantAuthService.login(credentials);
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
    merchantAuthService.logout();
    setAuthState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
    });
    router.replace('/merchant/login');
  }, [router]);

  const refreshToken = useCallback(async () => {
    try {
      const newTokens = await merchantAuthService.refreshToken();
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

  // Redirect based on merchant status
  const requireAuth = useCallback((requireActive: boolean = true) => {
    if (authState.isLoading) return true; // Still loading
    
    if (!authState.isAuthenticated) {
      router.replace('/merchant/login');
      return false;
    }

    // Check merchant status
    if (requireActive) {
      if (merchantAuthService.isPendingApproval()) {
        router.replace('/merchant/pending-approval');
        return false;
      }
      
      if (!merchantAuthService.isActive()) {
        // For banned, frozen, or deleted accounts
        router.replace('/merchant/login');
        return false;
      }
    }
    
    return true;
  }, [authState.isAuthenticated, authState.isLoading, router]);

  // Merchant status checks
  const isActive = useCallback(() => {
    return merchantAuthService.isActive();
  }, []);

  const isPendingApproval = useCallback(() => {
    return merchantAuthService.isPendingApproval();
  }, []);

  const isBanned = useCallback(() => {
    return merchantAuthService.isBanned();
  }, []);

  const isFrozen = useCallback(() => {
    return merchantAuthService.isFrozen();
  }, []);

  const isDeleted = useCallback(() => {
    return merchantAuthService.isDeleted();
  }, []);

  const getStatusText = useCallback(() => {
    return merchantAuthService.getStatusText();
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
    
    // Status Checks
    isActive,
    isPendingApproval,
    isBanned,
    isFrozen,
    isDeleted,
    getStatusText,
  };
}
