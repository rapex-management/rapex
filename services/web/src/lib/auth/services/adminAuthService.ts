import { AdminUser, AuthTokens, AuthState, AuthService, LoginCredentials } from '../types/auth.types';
import { api } from '../../../services/apiClient';

class AdminAuthService implements AuthService<AdminUser> {
  private readonly STORAGE_PREFIX = 'admin_';
  private readonly TOKEN_KEY = `${this.STORAGE_PREFIX}token`;
  private readonly REFRESH_KEY = `${this.STORAGE_PREFIX}refresh`;
  private readonly USER_KEY = `${this.STORAGE_PREFIX}user`;

  async login(credentials: LoginCredentials): Promise<AuthState<AdminUser>> {
    try {
      const response = await api.post<AdminUser & AuthTokens>('/admin/login', {
        identifier: credentials.identifier,
        password: credentials.password
      });
      
      const tokens: AuthTokens = {
        access: response.access,
        refresh: response.refresh
      };

      const user: AdminUser = {
        id: response.id,
        username: response.username,
        email: response.email,
        first_name: response.first_name,
        last_name: response.last_name,
        status: response.status || 0,
        is_superuser: response.is_superuser || false
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
    // Clear all admin-related storage
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    // Clear API cache for admin
    api.invalidateCache();
  }

  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await api.post<AuthTokens>('/admin/refresh', {
        refresh: refreshToken
      });

      this.storeTokens(response);
      return response;
    } catch (error) {
      // If refresh fails, logout
      this.logout();
      throw error;
    }
  }

  getCurrentUser(): AdminUser | null {
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

  private storeUser(user: AdminUser): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  // Check if user has required status
  hasValidStatus(): boolean {
    const user = this.getCurrentUser();
    return user ? user.status === 0 : false; // 0 = Active
  }

  // Check if user is superuser
  isSuperUser(): boolean {
    const user = this.getCurrentUser();
    return user ? user.is_superuser : false;
  }
}

// Export singleton instance
export const adminAuthService = new AdminAuthService();
