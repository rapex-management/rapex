from django.contrib import admin
from .models import (
    MerchantCategory, Category, Brand,
    ShopProduct, PrelovedProduct, ReadyToEatProduct, FreshProduct,
    ProductImage, ProductVariant, ProductTag, ProductReview
)


@admin.register(MerchantCategory)
class MerchantCategoryAdmin(admin.ModelAdmin):
    list_display = ['category_id', 'merchant', 'name', 'parent', 'created_at']
    list_filter = ['merchant', 'parent', 'created_at']
    search_fields = ['name', 'merchant__merchant_name']
    readonly_fields = ['category_id', 'created_at', 'updated_at']


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


class BaseProductAdmin(admin.ModelAdmin):
    """Base admin class for all product types"""
    list_display = [
        'product_id', 'name', 'merchant', 'category', 'brand', 
        'price', 'markup_price', 'stock', 'status', 'has_images', 'created_at'
    ]
    list_filter = ['status', 'category', 'brand', 'created_at']
    search_fields = ['name', 'description', 'sku']
    readonly_fields = ['product_id', 'markup_price', 'created_at', 'updated_at']
    
    def has_images(self, obj):
        """Show if product has images"""
        return bool(obj.images and len(obj.images) > 0)
    has_images.boolean = True
    has_images.short_description = 'Has Images'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('product_id', 'merchant', 'name', 'description')
        }),
        ('Images', {
            'fields': ('images',)
        }),
        ('Pricing & Stock', {
            'fields': ('price', 'markup_price', 'stock', 'sku')
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


@admin.register(ShopProduct)
class ShopProductAdmin(BaseProductAdmin):
    """Admin for shop products"""
    pass


@admin.register(PrelovedProduct)
class PrelovedProductAdmin(BaseProductAdmin):
    """Admin for preloved products"""
    list_display = BaseProductAdmin.list_display + ['condition']
    list_filter = BaseProductAdmin.list_filter + ['condition']
    
    fieldsets = BaseProductAdmin.fieldsets + (
        ('Preloved Specific', {
            'fields': ('condition', 'usage_notes')
        }),
    )


@admin.register(ReadyToEatProduct)
class ReadyToEatProductAdmin(BaseProductAdmin):
    """Admin for ready-to-eat products"""
    list_display = BaseProductAdmin.list_display + ['is_vegetarian', 'preparation_time']
    list_filter = BaseProductAdmin.list_filter + ['is_vegetarian']
    
    fieldsets = BaseProductAdmin.fieldsets + (
        ('Ready-to-Eat Specific', {
            'fields': ('menu_details', 'preparation_time', 'is_vegetarian')
        }),
    )


@admin.register(FreshProduct)
class FreshProductAdmin(BaseProductAdmin):
    """Admin for fresh products"""
    list_display = BaseProductAdmin.list_display + ['shelf_life_days', 'origin']
    list_filter = BaseProductAdmin.list_filter + ['shelf_life_days']
    
    fieldsets = BaseProductAdmin.fieldsets + (
        ('Fresh Specific', {
            'fields': ('shelf_life_days', 'origin', 'storage_instructions')
        }),
    )



@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ['image_id', 'content_type', 'object_id', 'is_primary', 'order', 'created_at']
    list_filter = ['is_primary', 'content_type', 'created_at']
    readonly_fields = ['image_id', 'created_at']


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = [
        'variant_id', 'content_type', 'object_id', 'variant_name', 'price_difference', 
        'stock', 'is_active', 'created_at'
    ]
    list_filter = ['is_active', 'content_type', 'created_at']
    search_fields = ['variant_name']
    readonly_fields = ['variant_id', 'created_at', 'updated_at']


@admin.register(ProductTag)
class ProductTagAdmin(admin.ModelAdmin):
    list_display = ['tag_id', 'content_type', 'object_id', 'tag_name', 'created_at']
    search_fields = ['tag_name']
    readonly_fields = ['tag_id', 'created_at']


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = [
        'review_id', 'content_type', 'object_id', 'user_id', 'rating', 
        'is_verified_purchase', 'is_approved', 'created_at'
    ]
    list_filter = ['rating', 'is_verified_purchase', 'is_approved', 'content_type', 'created_at']
    search_fields = ['comment']
    readonly_fields = ['review_id', 'created_at', 'updated_at']
