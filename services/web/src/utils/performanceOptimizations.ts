import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

// Global type declarations
declare global {
  interface Window {
    gc?: () => void;
  }
}

interface WebVitalMetric {
  name: string;
  value: number;
  id: string;
}

// Pre-load critical routes for better navigation performance
export const usePrefetchRoutes = (routes: string[]) => {
  const router = useRouter();

  useEffect(() => {
    // Prefetch routes after initial load
    const prefetchTimer = setTimeout(() => {
      routes.forEach(route => {
        router.prefetch(route).catch(err => {
          console.warn(`Failed to prefetch route: ${route}`, err);
        });
      });
    }, 1000);

    return () => clearTimeout(prefetchTimer);
  }, [router, routes]);
};

// Optimize image loading with IntersectionObserver
export const useImageLazyLoading = () => {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const images = document.querySelectorAll('img[data-src]');
    
    if (!images.length) return;

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src || '';
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.1
    });

    images.forEach(img => imageObserver.observe(img));

    return () => imageObserver.disconnect();
  }, []);
};

// Resource preloader for critical assets
export const preloadCriticalResources = () => {
  if (typeof window === 'undefined') return;

  // Preload fonts
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
  link.as = 'style';
  document.head.appendChild(link);

  // Preload common icons/images
  const commonAssets = [
    '/assets/rapexlogosquare.png',
    '/favicon.ico'
  ];

  commonAssets.forEach(asset => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = asset;
    link.as = 'image';
    document.head.appendChild(link);
  });
};

// Service Worker registration for PWA features
export const registerServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
};

// Memory cleanup for heavy components
export const useMemoryCleanup = (deps?: React.DependencyList) => {
  useEffect(() => {
    return () => {
      // Force garbage collection hint (if available)
      if ('gc' in window && typeof window.gc === 'function') {
        window.gc();
      }
    };
  }, deps);
};

// Batch DOM updates for better performance
export const useBatchedUpdates = () => {
  return useCallback((callback: () => void) => {
    // Fallback to requestAnimationFrame batching for better performance
    requestAnimationFrame(callback);
  }, []);
};

// Virtual scrolling helper
export const useVirtualScrolling = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2;
  const totalHeight = items.length * itemHeight;
  
  return {
    visibleCount,
    totalHeight,
    getVisibleItems: (scrollTop: number) => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + visibleCount, items.length);
      
      return {
        items: items.slice(startIndex, endIndex),
        startIndex,
        offsetY: startIndex * itemHeight
      };
    }
  };
};

// Performance monitoring utilities
export const PerformanceMetrics = {
  // Measure First Contentful Paint
  measureFCP: () => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          resolve(fcpEntry.startTime);
        }
      }).observe({ entryTypes: ['paint'] });
    });
  },

  // Measure Time to Interactive
  measureTTI: () => {
    return new Promise((resolve) => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'measure' && entry.name === 'TTI') {
              resolve(entry.duration);
            }
          });
        });
        observer.observe({ entryTypes: ['measure'] });
      }
    });
  },

  // Log Core Web Vitals
  logWebVitals: (metric: WebVitalMetric) => {
    console.log(`[Web Vitals] ${metric.name}: ${metric.value}ms`);
    
    // Analytics can be integrated here later if needed
    try {
      // Store metrics in localStorage for debugging
      const existingMetrics = JSON.parse(localStorage.getItem('webVitals') || '[]');
      existingMetrics.push({
        ...metric,
        timestamp: Date.now()
      });
      localStorage.setItem('webVitals', JSON.stringify(existingMetrics.slice(-10)));
    } catch {
      // Silent fail for localStorage issues
    }
  }
};

const performanceUtils = {
  usePrefetchRoutes,
  useImageLazyLoading,
  preloadCriticalResources,
  registerServiceWorker,
  useMemoryCleanup,
  useBatchedUpdates,
  useVirtualScrolling,
  PerformanceMetrics
};

export default performanceUtils;
