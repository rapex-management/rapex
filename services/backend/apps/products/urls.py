from django.urls import path
from . import views

app_name = 'products'

urlpatterns = [
    # Product management
    path('', views.ProductListCreateView.as_view(), name='product-list-create'),
    path('<uuid:product_id>/', views.ProductDetailView.as_view(), name='product-detail'),
    
    # Product images
    path('<uuid:product_id>/images/', views.ProductImageListCreateView.as_view(), name='product-images'),
    path('images/<uuid:image_id>/', views.ProductImageDetailView.as_view(), name='product-image-detail'),
    
    # Product variants
    path('<uuid:product_id>/variants/', views.ProductVariantListCreateView.as_view(), name='product-variants'),
    path('variants/<uuid:variant_id>/', views.ProductVariantDetailView.as_view(), name='product-variant-detail'),
    
    # Supporting data
    path('types/', views.ProductTypeListView.as_view(), name='product-types'),
    path('categories/', views.CategoryListView.as_view(), name='categories'),
    path('brands/', views.BrandListView.as_view(), name='brands'),
    
    # Shop management
    path('shop/', views.ShopDetailView.as_view(), name='shop-detail'),
    
    # Dashboard and utilities
    path('dashboard/', views.product_dashboard, name='product-dashboard'),
    path('bulk-update/', views.bulk_update_products, name='bulk-update-products'),
    path('bulk-upload/', views.bulk_upload_products, name='bulk-upload-products'),
    path('csv-template/', views.download_csv_template, name='csv-template'),
]
