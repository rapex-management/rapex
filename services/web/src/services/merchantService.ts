import { Merchant, MerchantListResponse, BatchActionRequest, StatusUpdateRequest } from '../types/merchant';

const API_BASE = '/api/proxy/merchants';

class MerchantService {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || error.message || 'Request failed');
    }

    return response.json();
  }

  async getMerchants(params: Record<string, string> = {}): Promise<MerchantListResponse> {
    const queryString = new URLSearchParams(params).toString();
    return this.request<MerchantListResponse>(`/?${queryString}`);
  }

  async getMerchant(id: string): Promise<Merchant> {
    return this.request<Merchant>(`/${id}`);
  }

  async updateMerchant(id: string, data: Partial<Merchant>): Promise<Merchant> {
    return this.request<Merchant>(`/${id}/update`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateMerchantStatus(id: string, data: StatusUpdateRequest): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async batchAction(data: BatchActionRequest): Promise<{ message: string; updated_count: number }> {
    return this.request<{ message: string; updated_count: number }>('/batch-action', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createMerchant(data: Partial<Merchant> & { password: string; confirm_password: string }): Promise<Merchant> {
    return this.request<Merchant>('/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteMerchant(id: string, reason?: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/${id}/delete`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  async getStatistics(): Promise<{
    total_merchants: number;
    by_status: Record<string, number>;
    by_business_registration: Record<string, number>;
    recent_registrations: number;
    pending_verification: number;
    top_provinces: Array<{ province: string; count: number }>;
  }> {
    return this.request('/statistics');
  }
}

export const merchantService = new MerchantService();
