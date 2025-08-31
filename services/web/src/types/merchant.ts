export interface Merchant {
  id: string;
  username: string;
  email: string;
  merchant_name: string;
  owner_name: string;
  phone: string;
  status: number;
  status_display: string;
  business_registration: number;
  date_joined: string;
  verified_at?: string;
  verified_by?: string;
  verified_by_name?: string;
  document_count: number;
  province: string;
  city_municipality: string;
  merchant_host_id?: string;
  business_category?: string;
  business_category_name?: string;
  business_type?: string;
  business_type_name?: string;
  zipcode?: string;
  barangay?: string;
  street_name?: string;
  house_number?: string;
  latitude?: number;
  longitude?: number;
  settlement_emails?: string[];
  withdrawal_option?: string;
  profile_picture?: string;
  documents?: MerchantDocument[];
  documents_info?: Record<string, unknown>;
  additional_info?: Record<string, unknown>;
  merchant_id?: string;
}

export interface MerchantDocument {
  id: string;
  document_type: string;
  file_url: string;
  original_filename: string;
  file_size: number;
  uploaded_at: string;
  verified: boolean;
  verified_at?: string;
  verified_by?: string;
  rejection_reason?: string;
}

export interface MerchantListResponse {
  results: Merchant[];
  count: number;
  next?: string;
  previous?: string;
  stats: {
    total: number;
    active: number;
    pending: number;
    rejected: number;
    banned: number;
    frozen: number;
    deleted: number;
  };
}

export interface MerchantFilters {
  search: string;
  status: string;
  status_filter: string;
  business_registration: string;
  province: string;
  city_municipality: string;
  date_from: string;
  date_to: string;
  ordering: string;
}

export interface BatchActionRequest {
  merchant_ids: string[];
  action: 'approve' | 'reject' | 'ban' | 'freeze' | 'delete' | 'activate';
  reason?: string;
}

export interface StatusUpdateRequest {
  status: number;
  reason?: string;
}
