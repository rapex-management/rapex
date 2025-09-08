// Unified auth types for all user roles
export interface BaseUser {
  id: string;
  email: string;
  username?: string;
  status: number;
  last_login?: string;
}

export interface AdminUser extends BaseUser {
  first_name: string;
  last_name: string;
  is_superuser: boolean;
}

export interface MerchantUser extends BaseUser {
  merchant_name: string;
  owner_name: string;
  phone: string;
  business_category?: string;
  business_type?: string;
}

export interface UserCustomer extends BaseUser {
  first_name: string;
  last_name: string;
  phone?: string;
  // Future customer-specific fields
}

export interface RiderUser extends BaseUser {
  first_name: string;
  last_name: string;
  phone: string;
  vehicle_type?: string;
  // Future rider-specific fields
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthState<T = BaseUser> {
  user: T | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type UserRole = 'admin' | 'merchant' | 'user' | 'rider';

// Auth service interface for consistency across all roles
export interface AuthService<T = BaseUser> {
  login(credentials: LoginCredentials): Promise<AuthState<T>>;
  logout(): void;
  refreshToken(): Promise<AuthTokens>;
  getCurrentUser(): T | null;
  getTokens(): AuthTokens | null;
  isAuthenticated(): boolean;
}

export interface LoginCredentials {
  identifier: string; // email or username
  password: string;
}

export interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireActive?: boolean;
}
