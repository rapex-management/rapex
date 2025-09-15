from django.urls import path
from . import views

app_name = 'products'

urlpatterns = [
    # Product management (legacy)
    path('', views.ProductListCreateView.as_view(), name='product-list-create'),
    path('<uuid:product_id>/', views.ProductDetailView.as_view(), name='product-detail'),
    
    # ShopProduct management (new)
    path('shop-products/', views.ShopProductListCreateView.as_view(), name='shop-product-list-create'),
    path('shop-products/<uuid:product_id>/', views.ShopProductDetailView.as_view(), name='shop-product-detail'),
    
    # ShopProduct supporting data
    path('shop-products/categories/', views.shop_product_categories, name='shop-product-categories'),
    path('shop-products/categories/create/', views.create_merchant_category, name='create-merchant-category'),
    path('shop-products/brands/', views.shop_product_brands, name='shop-product-brands'),
    path('shop-products/brands/create/', views.create_merchant_brand, name='create-merchant-brand'),
    path('shop-products/upload-image/', views.upload_product_image, name='upload-product-image'),
    
    # Product images
    path('<uuid:product_id>/images/', views.ProductImageListCreateView.as_view(), name='product-images'),
    path('images/<uuid:image_id>/', views.ProductImageDetailView.as_view(), name='product-image-detail'),
    
    # Product variants
    path('<uuid:product_id>/variants/', views.ProductVariantListCreateView.as_view(), name='product-variants'),
    path('variants/<uuid:variant_id>/', views.ProductVariantDetailView.as_view(), name='product-variant-detail'),
    
    # Supporting data (legacy)
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
