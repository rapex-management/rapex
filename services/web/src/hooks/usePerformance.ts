import { useState, useEffect, useCallback, useRef } from 'react';

// Generic hook for optimized API calls with caching and error handling
export function useApiData<T>(
  fetchFunction: () => Promise<T>,
  dependencies: React.DependencyList = [],
  options: {
    immediate?: boolean;
    cacheKey?: string;
    ttl?: number;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { data: T; expires: number }>>(new Map());

  const { immediate = true, cacheKey, ttl = 300000 } = options; // 5 minutes default TTL

  const fetchData = useCallback(async () => {
    // Check cache first
    if (cacheKey) {
      const cached = cacheRef.current.get(cacheKey);
      if (cached && Date.now() < cached.expires) {
        setData(cached.data);
        setError(null);
        return cached.data;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction();
      
      // Cache the result
      if (cacheKey) {
        cacheRef.current.set(cacheKey, {
          data: result,
          expires: Date.now() + ttl
        });
      }

      setData(result);
      setError(null);
      return result;
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        const errorMessage = err.message || 'An error occurred';
        setError(errorMessage);
        console.error('API Error:', errorMessage);
      }
      return null;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFunction, cacheKey, ttl, ...dependencies]);

  const refetch = useCallback(() => {
    // Clear cache before refetching
    if (cacheKey) {
      cacheRef.current.delete(cacheKey);
    }
    return fetchData();
  }, [fetchData, cacheKey]);

  const clearCache = useCallback(() => {
    if (cacheKey) {
      cacheRef.current.delete(cacheKey);
    }
  }, [cacheKey]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, immediate]);

  return { data, loading, error, refetch, clearCache };
}

// Hook for debounced search
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook for optimized local storage with caching
export function useOptimizedLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window !== 'undefined') {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      }
      return initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// Hook for infinite scroll/pagination
export function useInfiniteScroll<T>(
  fetchFunction: (page: number, limit: number) => Promise<{ data: T[]; has_next: boolean }>,
  limit: number = 10
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNext, setHasNext] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchMore = useCallback(async () => {
    if (loading || !hasNext) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction(page, limit);
      setData(prev => [...prev, ...result.data]);
      setHasNext(result.has_next);
      setPage(prev => prev + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, page, limit, loading, hasNext]);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setHasNext(true);
    setError(null);
  }, []);

  useEffect(() => {
    if (page === 1 && hasNext && !loading) {
      fetchMore();
    }
  }, [fetchMore, page, hasNext, loading]);

  return { data, loading, hasNext, error, fetchMore, reset };
}

// Hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const startTimeRef = useRef<number | undefined>(undefined);
  const renderCountRef = useRef(0);

  useEffect(() => {
    startTimeRef.current = performance.now();
    renderCountRef.current += 1;

    return () => {
      if (startTimeRef.current) {
        const renderTime = performance.now() - startTimeRef.current;
        console.log(`[Performance] ${componentName} - Render #${renderCountRef.current}: ${renderTime.toFixed(2)}ms`);
      }
    };
  });

  return {
    renderCount: renderCountRef.current,
    markStart: () => { startTimeRef.current = performance.now(); },
    markEnd: (operation: string) => {
      if (startTimeRef.current) {
        const duration = performance.now() - startTimeRef.current;
        console.log(`[Performance] ${componentName} - ${operation}: ${duration.toFixed(2)}ms`);
      }
    }
  };
}
