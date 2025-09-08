/**
 * Optimized API Client with caching, retries, and performance improvements
 */

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  expires: number;
}

class ApiClient {
  private cache = new Map<string, CacheEntry>();
  private baseURL: string;
  private defaultTimeout = 10000; // 10 seconds
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second

  constructor() {
    this.baseURL = '/api/proxy';
  }

  // Cache management
  private getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttl: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expires: Date.now() + ttl
    });
  }

  private clearCache(): void {
    this.cache.clear();
  }

  // Retry logic
  private async retry<T>(
    fn: () => Promise<T>,
    attempts: number = this.retryAttempts
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempts <= 1) throw error;
      
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      return this.retry(fn, attempts - 1);
    }
  }

  // Optimized fetch with timeout
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = this.defaultTimeout
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Main request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useCache: boolean = true,
    cacheTTL: number = 300000
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = this.getCacheKey(url, options);

    // Check cache for GET requests
    if (useCache && (!options.method || options.method === 'GET')) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) return cached;
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    // Add auth token if available
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('merchant_token') || localStorage.getItem('token')
      : null;
    
    if (token) {
      requestOptions.headers = {
        ...requestOptions.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    return this.retry(async () => {
      const response = await this.fetchWithTimeout(url, requestOptions);
      
      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          // Clear auth tokens on unauthorized
          if (typeof window !== 'undefined') {
            localStorage.removeItem('merchant_token');
            localStorage.removeItem('token');
            localStorage.removeItem('merchant_refresh_token');
            localStorage.removeItem('refresh');
            localStorage.removeItem('merchant');
            localStorage.removeItem('admin');
          }
          throw new Error('Authentication required');
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || `Request failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache successful GET requests
      if (useCache && (!options.method || options.method === 'GET')) {
        this.setCache(cacheKey, data, cacheTTL);
      }

      return data;
    });
  }

  // Public API methods
  async get<T>(endpoint: string, useCache: boolean = true, cacheTTL?: number): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, useCache, cacheTTL);
  }

  async post<T>(endpoint: string, data?: Record<string, unknown> | FormData): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, false);
  }

  async put<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, false);
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, false);
  }

  async patch<T>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }, false);
  }

  // Batch requests
  async batch<T>(requests: Array<{ endpoint: string; options?: RequestInit }>): Promise<T[]> {
    return Promise.all(
      requests.map(({ endpoint, options }) => 
        this.request<T>(endpoint, options, false)
      )
    );
  }

  // Prefetch for better performance
  async prefetch(endpoints: string[]): Promise<void> {
    const promises = endpoints.map(endpoint => 
      this.get(endpoint, true, 600000) // Cache for 10 minutes
        .catch(() => null) // Ignore errors in prefetch
    );
    
    await Promise.allSettled(promises);
  }

  // Clear cache manually
  invalidateCache(): void {
    this.clearCache();
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// Named exports for common operations
export const api = {
  get: <T>(endpoint: string, useCache?: boolean, cacheTTL?: number) => 
    apiClient.get<T>(endpoint, useCache, cacheTTL),
  post: <T>(endpoint: string, data?: Record<string, unknown> | FormData) => 
    apiClient.post<T>(endpoint, data),
  put: <T>(endpoint: string, data?: Record<string, unknown>) => 
    apiClient.put<T>(endpoint, data),
  delete: <T>(endpoint: string) => 
    apiClient.delete<T>(endpoint),
  patch: <T>(endpoint: string, data?: Record<string, unknown>) => 
    apiClient.patch<T>(endpoint, data),
  batch: <T>(requests: Array<{ endpoint: string; options?: RequestInit }>) => 
    apiClient.batch<T>(requests),
  prefetch: (endpoints: string[]) => 
    apiClient.prefetch(endpoints),
  invalidateCache: () => 
    apiClient.invalidateCache(),
};

export default apiClient;
