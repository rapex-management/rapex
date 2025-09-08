import { Merchant, MerchantListResponse, BatchActionRequest, StatusUpdateRequest } from '../types/merchant';
import { api } from './apiClient';

class MerchantService {
  private readonly API_BASE = '/merchants';

  // Get merchants with caching
  async getMerchants(params: Record<string, string> = {}): Promise<MerchantListResponse> {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `${this.API_BASE}?${queryString}` : this.API_BASE;
    
    return api.get<MerchantListResponse>(endpoint, true, 300000); // 5 minutes cache
  }

  // Get single merchant with caching
  async getMerchant(id: string): Promise<Merchant> {
    return api.get<Merchant>(`${this.API_BASE}/${id}`, true, 120000); // 2 minutes cache
  }

  // Update merchant
  async updateMerchant(id: string, data: Partial<Merchant>): Promise<Merchant> {
    const result = await api.patch<Merchant>(`${this.API_BASE}/${id}/update`, data);
    // Invalidate cache after update
    api.invalidateCache();
    return result;
  }

  // Update merchant status
  async updateMerchantStatus(id: string, data: StatusUpdateRequest): Promise<{ message: string }> {
    const result = await api.post<{ message: string }>(`${this.API_BASE}/${id}/status`, data as unknown as Record<string, unknown>);
    // Invalidate cache after status update
    api.invalidateCache();
    return result;
  }

  // Batch actions
  async batchAction(data: BatchActionRequest): Promise<{ message: string; updated_count: number }> {
    const result = await api.post<{ message: string; updated_count: number }>(
      `${this.API_BASE}/batch-action`, 
      data as unknown as Record<string, unknown>
    );
    // Invalidate cache after batch operation
    api.invalidateCache();
    return result;
  }

  // Create merchant
  async createMerchant(data: Partial<Merchant> & { password: string; confirm_password: string }): Promise<Merchant> {
    const result = await api.post<Merchant>(`${this.API_BASE}/create`, data as unknown as Record<string, unknown>);
    // Invalidate cache after creation
    api.invalidateCache();
    return result;
  }

  // Delete merchant
  async deleteMerchant(id: string): Promise<{ message: string }> {
    const result = await api.delete<{ message: string }>(`${this.API_BASE}/${id}/delete`);
    // Invalidate cache after deletion
    api.invalidateCache();
    return result;
  }

  // Get merchant statistics with caching
  async getStatistics(): Promise<{
    total_merchants: number;
    by_status: Record<string, number>;
    by_business_registration: Record<string, number>;
    recent_registrations: number;
    pending_verification: number;
    top_provinces: Array<{ province: string; count: number }>;
  }> {
    return api.get(`${this.API_BASE}/statistics`, true, 600000); // 10 minutes cache
  }

  // Prefetch common data for better performance
  async prefetchDashboardData(): Promise<void> {
    const endpoints = [
      `${this.API_BASE}/statistics`,
      `${this.API_BASE}?page=1&limit=10`, // First page of merchants
    ];
    
    await api.prefetch(endpoints);
  }

  // Search merchants with debouncing support
  private searchTimeout: NodeJS.Timeout | null = null;
  
  async searchMerchants(
    query: string,
    debounceMs: number = 300
  ): Promise<Promise<MerchantListResponse>> {
    return new Promise((resolve) => {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
      
      this.searchTimeout = setTimeout(async () => {
        const result = await this.getMerchants({ search: query, page: '1', limit: '10' });
        resolve(result);
      }, debounceMs);
    });
  }

  // Clear all cached data
  invalidateCache(): void {
    api.invalidateCache();
  }
}

export const merchantService = new MerchantService();
