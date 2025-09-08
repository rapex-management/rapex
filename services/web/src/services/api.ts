import axios from 'axios';
import { getLocalStorageItem, removeLocalStorageItem } from '../hooks/useLocalStorage';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getLocalStorageItem('merchant_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      removeLocalStorageItem('merchant_token');
      removeLocalStorageItem('merchant_refresh_token');
      removeLocalStorageItem('merchant');
      
      // Use Next.js router for navigation if available
      if (typeof window !== 'undefined') {
        window.location.href = '/merchant/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;