"""
Performance optimization decorators and utilities for Django views
"""
import time
import hashlib
import json
from functools import wraps
from typing import Any, Callable, Optional, Union
from django.core.cache import cache
from django.http import JsonResponse
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page, never_cache
from django.views.decorators.vary import vary_on_headers
from rest_framework.response import Response


def cached_api_response(timeout: int = 300, vary_on: Optional[list] = None):
    """
    Cache API responses with optional vary headers
    
    Args:
        timeout: Cache timeout in seconds (default 5 minutes)
        vary_on: List of headers to vary cache on
    """
    def decorator(view_func: Callable) -> Callable:
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Create cache key based on request details
            cache_key_data = {
                'path': request.path,
                'method': request.method,
                'query_params': dict(request.GET),
                'user_id': getattr(request.user, 'id', None) if hasattr(request, 'user') else None,
            }
            
            # Add vary headers to cache key
            if vary_on:
                for header in vary_on:
                    cache_key_data[f'header_{header}'] = request.META.get(f'HTTP_{header.upper().replace("-", "_")}', '')
            
            # Generate cache key
            cache_key_str = json.dumps(cache_key_data, sort_keys=True)
            cache_key = f"api_cache:{hashlib.md5(cache_key_str.encode()).hexdigest()}"
            
            # Check cache
            cached_response = cache.get(cache_key)
            if cached_response:
                return JsonResponse(cached_response, safe=False)
            
            # Get fresh response
            response = view_func(request, *args, **kwargs)
            
            # Cache successful responses only
            if hasattr(response, 'status_code') and 200 <= response.status_code < 300:
                if hasattr(response, 'data'):
                    cache.set(cache_key, response.data, timeout)
                elif hasattr(response, 'content'):
                    try:
                        cache.set(cache_key, json.loads(response.content), timeout)
                    except (json.JSONDecodeError, AttributeError):
                        pass
            
            return response
        return wrapper
    return decorator


def rate_limit(max_requests: int = 100, window: int = 3600, per_user: bool = True):
    """
    Rate limiting decorator
    
    Args:
        max_requests: Maximum requests allowed
        window: Time window in seconds
        per_user: Whether to limit per user or globally
    """
    def decorator(view_func: Callable) -> Callable:
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Create rate limit key
            if per_user and hasattr(request, 'user') and request.user.is_authenticated:
                rate_key = f"rate_limit:user:{request.user.id}:{view_func.__name__}"
            else:
                client_ip = request.META.get('REMOTE_ADDR', 'unknown')
                rate_key = f"rate_limit:ip:{client_ip}:{view_func.__name__}"
            
            # Check current count
            current_count = cache.get(rate_key, 0)
            
            if current_count >= max_requests:
                return JsonResponse({
                    'error': 'Rate limit exceeded',
                    'detail': f'Maximum {max_requests} requests per {window} seconds'
                }, status=429)
            
            # Increment count
            cache.set(rate_key, current_count + 1, window)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def performance_monitor(view_func: Callable) -> Callable:
    """
    Monitor view performance and log slow queries
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        start_time = time.time()
        
        try:
            response = view_func(request, *args, **kwargs)
            
            # Log performance
            duration = time.time() - start_time
            if duration > 1.0:  # Log if slower than 1 second
                print(f"SLOW_QUERY: {view_func.__name__} took {duration:.2f}s")
            
            # Add performance header in debug mode
            if settings.DEBUG and hasattr(response, '__setitem__'):
                response['X-Response-Time'] = f"{duration:.3f}s"
            
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            print(f"ERROR in {view_func.__name__} after {duration:.2f}s: {str(e)}")
            raise
    
    return wrapper


def cache_per_user(timeout: int = 300):
    """
    Cache response per authenticated user
    """
    def decorator(view_func: Callable) -> Callable:
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not hasattr(request, 'user') or not request.user.is_authenticated:
                return view_func(request, *args, **kwargs)
            
            # Create user-specific cache key
            cache_key_data = {
                'view': view_func.__name__,
                'user_id': request.user.id,
                'args': str(args),
                'kwargs': str(sorted(kwargs.items())),
                'query_params': str(sorted(request.GET.items())),
            }
            
            cache_key_str = json.dumps(cache_key_data, sort_keys=True)
            cache_key = f"user_cache:{hashlib.md5(cache_key_str.encode()).hexdigest()}"
            
            # Check cache
            cached_response = cache.get(cache_key)
            if cached_response:
                return JsonResponse(cached_response, safe=False)
            
            # Get fresh response
            response = view_func(request, *args, **kwargs)
            
            # Cache successful responses
            if hasattr(response, 'status_code') and 200 <= response.status_code < 300:
                if hasattr(response, 'data'):
                    cache.set(cache_key, response.data, timeout)
            
            return response
        return wrapper
    return decorator


class CacheKeyBuilder:
    """
    Helper class to build consistent cache keys
    """
    
    @staticmethod
    def build_key(prefix: str, *args, **kwargs) -> str:
        """Build a cache key from arguments"""
        key_data = {
            'prefix': prefix,
            'args': [str(arg) for arg in args],
            'kwargs': {k: str(v) for k, v in sorted(kwargs.items())}
        }
        key_str = json.dumps(key_data, sort_keys=True)
        return f"{prefix}:{hashlib.md5(key_str.encode()).hexdigest()}"
    
    @staticmethod
    def invalidate_pattern(pattern: str) -> None:
        """Invalidate all cache keys matching a pattern"""
        # Note: This requires django-redis for pattern deletion
        try:
            from django_redis import get_redis_connection
            redis_conn = get_redis_connection("default")
            keys = redis_conn.keys(f"*{pattern}*")
            if keys:
                redis_conn.delete(*keys)
        except ImportError:
            # Fallback for other cache backends
            pass


# Commonly used decorators
fast_cache = cached_api_response(timeout=60)  # 1 minute
medium_cache = cached_api_response(timeout=300)  # 5 minutes
slow_cache = cached_api_response(timeout=900)  # 15 minutes

# Method decorators for class-based views
cache_page_fast = method_decorator(cache_page(60))
cache_page_medium = method_decorator(cache_page(300))
cache_page_slow = method_decorator(cache_page(900))

# Performance monitoring decorator
monitor_performance = method_decorator(performance_monitor)

# Common header variations
vary_on_auth = vary_on_headers('Authorization')
vary_on_user_agent = vary_on_headers('User-Agent')
