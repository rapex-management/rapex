from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
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

# Import views for direct shop-products endpoints
from apps.products import views as product_views

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/', include('apps.webauth.urls')),
    path('api/merchants/', include('apps.merchants.urls')),
    path('api/products/', include('apps.products.urls')),
    path('api/wallets/', include('apps.wallets.urls')),
    
    # Direct shop-products endpoints for bulk operations
    path('api/shop-products/bulk-upload/', product_views.bulk_upload_products, name='shop-products-bulk-upload'),
    path('api/shop-products/csv-template/', product_views.download_csv_template, name='shop-products-csv-template'),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
