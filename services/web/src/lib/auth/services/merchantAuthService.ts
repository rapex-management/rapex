import { MerchantUser, AuthTokens, AuthState, AuthService, LoginCredentials } from '../types/auth.types';

class MerchantAuthService implements AuthService<MerchantUser> {
  private readonly STORAGE_PREFIX = 'merchant_';
  private readonly TOKEN_KEY = `${this.STORAGE_PREFIX}token`;
  private readonly REFRESH_KEY = `${this.STORAGE_PREFIX}refresh_token`;
  private readonly USER_KEY = `${this.STORAGE_PREFIX}user`;

  async login(credentials: LoginCredentials): Promise<AuthState<MerchantUser>> {
    try {
      const response = await fetch('/api/proxy/merchant/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: credentials.identifier,
          password: credentials.password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      
      const tokens: AuthTokens = {
        access: data.access,
        refresh: data.refresh
      };

      const user: MerchantUser = {
        id: data.id,
        email: data.email,
        username: data.username,
        merchant_name: data.merchant_name,
        owner_name: data.owner_name,
        phone: data.phone,
        status: data.status,
        business_category: data.business_category,
        business_type: data.business_type
      };

      // Store in localStorage
      this.storeTokens(tokens);
      this.storeUser(user);

      return {
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false
      };
    } catch (error) {
      throw error;
    }
  }

  logout(): void {
    // Clear all merchant-related storage
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/proxy/merchant/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: refreshToken
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokens = await response.json();
      this.storeTokens(tokens);
      return tokens;
    } catch (error) {
      // If refresh fails, logout
      this.logout();
      throw error;
    }
  }

  getCurrentUser(): MerchantUser | null {
    try {
      const userData = localStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  getTokens(): AuthTokens | null {
    try {
      const access = localStorage.getItem(this.TOKEN_KEY);
      const refresh = localStorage.getItem(this.REFRESH_KEY);
      
      if (!access || !refresh) return null;
      
      return { access, refresh };
    } catch {
      return null;
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  isAuthenticated(): boolean {
    const tokens = this.getTokens();
    const user = this.getCurrentUser();
    return !!(tokens?.access && user);
  }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem(this.TOKEN_KEY, tokens.access);
    localStorage.setItem(this.REFRESH_KEY, tokens.refresh);
  }

  private storeUser(user: MerchantUser): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  // Merchant-specific status checks
  isActive(): boolean {
    const user = this.getCurrentUser();
    return user ? user.status === 0 : false; // 0 = Active
  }

  isPendingApproval(): boolean {
    const user = this.getCurrentUser();
    return user ? (user.status === 4 || user.status === 5) : false;
  }

  isBanned(): boolean {
    const user = this.getCurrentUser();
    return user ? user.status === 1 : false; // 1 = Banned
  }

  isFrozen(): boolean {
    const user = this.getCurrentUser();
    return user ? user.status === 2 : false; // 2 = Frozen
  }

  isDeleted(): boolean {
    const user = this.getCurrentUser();
    return user ? user.status === 3 : false; // 3 = Deleted
  }

  // Get user-friendly status text
  getStatusText(): string {
    const user = this.getCurrentUser();
    if (!user) return 'Unknown';
    
    switch (user.status) {
      case 0: return 'Active';
      case 1: return 'Banned';
      case 2: return 'Frozen';
      case 3: return 'Deleted';
      case 4: return 'Pending Approval';
      case 5: return 'Under Review';
      default: return 'Unknown';
    }
  }
}

// Export singleton instance
export const merchantAuthService = new MerchantAuthService();
