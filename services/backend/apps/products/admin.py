from django.contrib import admin
from .models import (
    Product, ProductType, Category, Brand, Shop, 
    ProductImage, ProductVariant, ProductTag, ProductReview
)


@admin.register(ProductType)
class ProductTypeAdmin(admin.ModelAdmin):
    list_display = ['type_id', 'name']
    readonly_fields = ['type_id']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['category_id', 'name', 'parent', 'created_at']
    list_filter = ['parent', 'created_at']
    search_fields = ['name']
    readonly_fields = ['category_id', 'created_at', 'updated_at']


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['brand_id', 'name', 'created_at']
    search_fields = ['name']
    readonly_fields = ['brand_id', 'created_at']


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display = ['shop_id', 'shop_name', 'merchant', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['shop_name', 'merchant__merchant_name']
    readonly_fields = ['shop_id', 'created_at', 'updated_at']


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    readonly_fields = ['image_id', 'created_at']


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    readonly_fields = ['variant_id', 'created_at', 'updated_at']


class ProductTagInline(admin.TabularInline):
    model = ProductTag
    extra = 1
    readonly_fields = ['tag_id', 'created_at']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        'product_id', 'name', 'shop', 'category', 'brand', 
        'price', 'stock', 'status', 'created_at'
    ]
    list_filter = ['status', 'type', 'category', 'brand', 'created_at']
    search_fields = ['name', 'description', 'sku']
    readonly_fields = ['product_id', 'created_at', 'updated_at']
    inlines = [ProductImageInline, ProductVariantInline, ProductTagInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('product_id', 'shop', 'type', 'name', 'description')
        }),
        ('Pricing & Stock', {
            'fields': ('price', 'stock', 'sku')
        }),
        ('Categorization', {
            'fields': ('category', 'brand')
        }),
        ('Status & Details', {
            'fields': ('status', 'weight', 'dimensions')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ['image_id', 'product', 'is_primary', 'order', 'created_at']
    list_filter = ['is_primary', 'created_at']
    readonly_fields = ['image_id', 'created_at']


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = [
        'variant_id', 'product', 'variant_name', 'price_difference', 
        'stock', 'is_active', 'created_at'
    ]
    list_filter = ['is_active', 'created_at']
    search_fields = ['variant_name', 'product__name']
    readonly_fields = ['variant_id', 'created_at', 'updated_at']


@admin.register(ProductTag)
class ProductTagAdmin(admin.ModelAdmin):
    list_display = ['tag_id', 'product', 'tag_name', 'created_at']
    search_fields = ['tag_name', 'product__name']
    readonly_fields = ['tag_id', 'created_at']


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = [
        'review_id', 'product', 'user_id', 'rating', 
        'is_verified_purchase', 'is_approved', 'created_at'
    ]
    list_filter = ['rating', 'is_verified_purchase', 'is_approved', 'created_at']
    search_fields = ['product__name', 'comment']
    readonly_fields = ['review_id', 'created_at', 'updated_at']
