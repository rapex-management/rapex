from django.contrib import admin
from django.urls import include, path
from rest_framework import routers

# Test Docker auto-reload for Django backend - CHANGED AGAIN!
router = routers.DefaultRouter()
try:
    # Admin viewset is optional in development; if it's missing or commented
    # out, avoid crashing at import time (migrations/startup should continue).
    from accounts.views import AdminUserViewSet
    router.register(r'admin/users', AdminUserViewSet, basename='admin-users')
except Exception:
    # Log to stdout so container logs show the reason
    import sys
    print('Warning: AdminUserViewSet not registered:', file=sys.stderr)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/', include('apps.webauth.urls')),
    path('api/merchants/', include('apps.merchants.urls')),
    path('api/products/', include('apps.products.urls')),
]
