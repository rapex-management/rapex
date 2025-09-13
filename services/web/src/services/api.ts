import axios from 'axios';
import { getLocalStorageItem, removeLocalStorageItem } from '../hooks/useLocalStorage';

// Resolve backend base host (no /api suffix) with flexible fallbacks.
// Order: explicit NEXT_PUBLIC_BACKEND_URL > NEXT_PUBLIC_API_URL > BACKEND_URL > localhost.
const RAW_API_BASE_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  'http://localhost:8000'
);

// Normalize: strip trailing slashes and any trailing /api to avoid duplication.
const NORMALIZED_BASE = RAW_API_BASE_URL
  .replace(/\/$/, '')
  .replace(/\/api$/i, '')
  .replace(/\/$/, '');

const api = axios.create({
  baseURL: NORMALIZED_BASE, // host only; we inject /api/ via interceptor
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Request interceptor: ensure all relative (non-absolute) URLs are prefixed with /api.
api.interceptors.request.use(
  (config) => {
    if (config.url) {
      // If absolute (starts with http), leave unchanged.
      const isAbsolute = /^https?:\/\//i.test(config.url);
      if (!isAbsolute) {
        // Remove any duplicate leading slashes
        const clean = config.url.replace(/^\/+/, '');
        if (!clean.startsWith('api/')) {
          config.url = `/api/${clean}`; // final URL becomes {baseHost}/api/...
        } else if (!clean.startsWith('/')) {
          config.url = `/${clean}`;
        }
      }
    }
    const token = getLocalStorageItem('merchant_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
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