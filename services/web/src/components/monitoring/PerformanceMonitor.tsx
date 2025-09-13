import { useEffect } from 'react';
import { useRouter } from 'next/router';

interface PerformanceMonitorProps {
  enableTracking?: boolean;
  enableLogging?: boolean;
  enableReporting?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enableTracking = true,
  enableLogging = true,
  enableReporting = false
}) => {
  const router = useRouter();

  useEffect(() => {
    if (!enableTracking) return;

    // Track navigation timing
    const trackNavigation = () => {
      if (typeof window === 'undefined' || !window.performance) return;

      const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const metrics = {
          dns: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcp: navigation.connectEnd - navigation.connectStart,
          request: navigation.responseStart - navigation.requestStart,
          response: navigation.responseEnd - navigation.responseStart,
          dom: navigation.domContentLoadedEventEnd - navigation.navigationStart,
          load: navigation.loadEventEnd - navigation.navigationStart,
          fcp: 0, // Will be measured separately
          lcp: 0, // Will be measured separately
        };

        if (enableLogging) {
          console.log('[Performance] Navigation Metrics:', metrics);
        }

        // Store metrics for potential reporting
        if (enableReporting) {
          try {
            const existingMetrics = JSON.parse(sessionStorage.getItem('performanceMetrics') || '[]');
            existingMetrics.push({
              type: 'navigation',
              route: router.asPath,
              timestamp: Date.now(),
              metrics
            });
            sessionStorage.setItem('performanceMetrics', JSON.stringify(existingMetrics));
          } catch {
            // Silent fail
          }
        }
      }
    };

    // Track First Contentful Paint
    const trackFCP = () => {
      if (!('PerformanceObserver' in window)) return;

      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              if (enableLogging) {
                console.log(`[Performance] FCP: ${entry.startTime.toFixed(2)}ms`);
              }
              observer.disconnect();
            }
          });
        });
        observer.observe({ entryTypes: ['paint'] });
      } catch (error) {
        console.warn('[Performance] Failed to track FCP:', error);
      }
    };

    // Track Largest Contentful Paint
    const trackLCP = () => {
      if (!('PerformanceObserver' in window)) return;

      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          if (enableLogging) {
            console.log(`[Performance] LCP: ${lastEntry.startTime.toFixed(2)}ms`);
          }
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('[Performance] Failed to track LCP:', error);
      }
    };

    // Track Cumulative Layout Shift
    const trackCLS = () => {
      if (!('PerformanceObserver' in window)) return;

      try {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          
          if (enableLogging) {
            console.log(`[Performance] CLS: ${clsValue.toFixed(4)}`);
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('[Performance] Failed to track CLS:', error);
      }
    };

    // Track resource loading times
    const trackResources = () => {
      if (typeof window === 'undefined' || !window.performance) return;

      const resources = window.performance.getEntriesByType('resource');
      const slowResources = resources.filter((resource: any) => resource.duration > 1000);
      
      if (slowResources.length > 0 && enableLogging) {
        console.warn('[Performance] Slow resources detected:', slowResources.map((r: any) => ({
          name: r.name,
          duration: r.duration.toFixed(2) + 'ms'
        })));
      }
    };

    // Track memory usage (if available)
    const trackMemory = () => {
      if (typeof window === 'undefined') return;
      
      const memory = (performance as any).memory;
      if (memory && enableLogging) {
        console.log('[Performance] Memory:', {
          used: (memory.usedJSHeapSize / 1048576).toFixed(2) + 'MB',
          total: (memory.totalJSHeapSize / 1048576).toFixed(2) + 'MB',
          limit: (memory.jsHeapSizeLimit / 1048576).toFixed(2) + 'MB'
        });
      }
    };

    // Initialize tracking
    const initTimer = setTimeout(() => {
      trackNavigation();
      trackFCP();
      trackLCP();
      trackCLS();
      trackResources();
      trackMemory();
    }, 1000);

    // Track route changes
    const handleRouteChange = (url: string) => {
      if (enableLogging) {
        console.log(`[Performance] Route change to: ${url}`);
      }
      
      // Track route change timing
      const startTime = performance.now();
      
      const handleRouteComplete = () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (enableLogging) {
          console.log(`[Performance] Route change completed in: ${duration.toFixed(2)}ms`);
        }
      };

      router.events.off('routeChangeComplete', handleRouteComplete);
      router.events.on('routeChangeComplete', handleRouteComplete);
    };

    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      clearTimeout(initTimer);
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [enableTracking, enableLogging, enableReporting, router]);

  return null;
};
