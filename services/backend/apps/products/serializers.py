from rest_framework import serializers
from .models import (
    ShopProduct, PrelovedProduct, ReadyToEatProduct, FreshProduct,
    MerchantCategory, Category, Brand, 
    ProductImage, ProductVariant, ProductTag, ProductReview
)
from apps.merchants.models import Merchant

# Temporary compatibility - for migration purposes only
Product = ShopProduct  # Default to ShopProduct for now
Shop = Merchant  # Shop is now just Merchant

# Create a temporary ProductType class for compatibility
class ProductType:
    TYPE_CHOICES = [
        (0, 'Shop'),
        (1, 'Pre-loved'), 
        (2, 'Ready-to-Eat'),
        (3, 'Fresh'),
    ]
    
    class objects:
        @staticmethod
        def all():
            return []
    
    def get_name_display(self):
        return "Shop"


class ProductTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductType
        fields = ['type_id', 'name']


class CategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    subcategories = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['category_id', 'name', 'parent', 'parent_name', 'subcategories', 'created_at', 'updated_at']
    
    def get_subcategories(self, obj):
        if obj.subcategories.exists():
            return CategorySerializer(obj.subcategories.all(), many=True).data
        return []


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ['brand_id', 'name', 'description', 'created_at']


class MerchantBrandSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import MerchantBrand
        model = MerchantBrand
        fields = ['brand_id', 'brand_name', 'merchant']
        read_only_fields = ['merchant']


class ShopSerializer(serializers.ModelSerializer):
    """Serializer for Merchant (acting as Shop)"""
    
    class Meta:
        model = Shop
        fields = ['id', 'merchant_name', 'owner_name', 'email', 'phone', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['image_id', 'product', 'image_url', 'is_primary', 'alt_text', 'order', 'created_at']
        read_only_fields = ['product']


class ProductVariantSerializer(serializers.ModelSerializer):
    final_price = serializers.ReadOnlyField()
    
    class Meta:
        model = ProductVariant
        fields = [
            'variant_id', 'product', 'variant_name', 'price_difference', 
            'stock', 'sku', 'is_active', 'final_price', 'created_at', 'updated_at'
        ]
        read_only_fields = ['product']


class ProductTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductTag
        fields = ['tag_id', 'product', 'tag_name', 'created_at']
        read_only_fields = ['product']


class ProductReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductReview
        fields = [
            'review_id', 'product', 'user_id', 'rating', 'comment', 
            'is_verified_purchase', 'is_approved', 'created_at', 'updated_at'
        ]
        read_only_fields = ['product', 'user_id', 'is_verified_purchase']


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for product listings"""
    merchant_name = serializers.CharField(source='merchant.merchant_name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.CharField(source='brand.brand_name', read_only=True)
    primary_image = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'product_id', 'name', 'price', 'stock', 'status', 'merchant_name',
            'category_name', 'brand_name', 'primary_image',
            'total_reviews', 'average_rating', 'created_at', 'updated_at'
        ]
    
    def get_primary_image(self, obj):
        primary_image = obj.primary_image
        if primary_image:
            # Handle both old ProductImage objects and new string URLs
            if isinstance(primary_image, str):
                return {
                    'image_url': primary_image,
                    'alt_text': obj.name
                }
            else:
                return {
                    'image_id': primary_image.image_id,
                    'image_url': primary_image.image_url,
                    'alt_text': primary_image.alt_text
                }
        return None
    
    def get_total_reviews(self, obj):
        return obj.reviews.filter(is_approved=True).count()
    
    def get_average_rating(self, obj):
        reviews = obj.reviews.filter(is_approved=True)
        if reviews.exists():
            return round(sum(review.rating for review in reviews) / reviews.count(), 1)
        return 0


class ProductDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single product view"""
    merchant = ShopSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    brand = MerchantBrandSerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    total_reviews = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    is_in_stock = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = [
            'product_id', 'merchant', 'name', 'description', 'price', 
            'stock', 'category', 'brand', 'status', 'sku', 'weight', 
            'dimensions', 'images',
            'total_reviews', 'average_rating', 'is_in_stock',
            'created_at', 'updated_at'
        ]
    
    def get_total_reviews(self, obj):
        return obj.reviews.filter(is_approved=True).count()
    
    def get_average_rating(self, obj):
        reviews = obj.reviews.filter(is_approved=True)
        if reviews.exists():
            return round(sum(review.rating for review in reviews) / reviews.count(), 1)
        return 0


# ShopProduct Serializers
class ShopProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating shop products"""
    images = serializers.ListField(
        child=serializers.URLField(),
        required=False,
        help_text="List of image URLs"
    )
    dimensions = serializers.JSONField(required=False, default=dict)
    
    class Meta:
        model = ShopProduct
        fields = [
            'product_id', 'name', 'description', 'price', 'stock', 
            'category', 'brand', 'status', 'sku', 'weight', 
            'dimensions', 'images'
        ]
        read_only_fields = ['product_id', 'markup_price', 'created_at', 'updated_at']
    
    def validate_price(self, value):
        """Validate that price is positive"""
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0")
        return value
    
    def validate_stock(self, value):
        """Validate that stock is non-negative"""
        if value < 0:
            raise serializers.ValidationError("Stock cannot be negative")
        return value
    
    def validate_dimensions(self, value):
        """Validate dimensions format if provided"""
        if value:
            required_keys = ['length', 'width', 'height']
            for key in required_keys:
                if key not in value:
                    raise serializers.ValidationError(f"Dimensions must include {key}")
                if not isinstance(value[key], (int, float)) or value[key] <= 0:
                    raise serializers.ValidationError(f"{key} must be a positive number")
        return value
    
    def create(self, validated_data):
        """Create a new shop product"""
        # Set the merchant from the request context
        merchant = self.context['request'].user
        validated_data['merchant'] = merchant
        
        return ShopProduct.objects.create(**validated_data)
    
    def update(self, instance, validated_data):
        """Update an existing shop product"""
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating products (legacy compatibility)"""
    images = ProductImageSerializer(many=True, required=False)
    variants = ProductVariantSerializer(many=True, required=False)
    tags = ProductTagSerializer(many=True, required=False)
    
    class Meta:
        model = Product
        fields = [
            'product_id', 'type', 'name', 'description', 'price', 
            'stock', 'category', 'brand', 'status', 'sku', 'weight', 
            'dimensions', 'images', 'variants', 'tags'
        ]
        read_only_fields = ['product_id']
    
    def create(self, validated_data):
        images_data = validated_data.pop('images', [])
        variants_data = validated_data.pop('variants', [])
        tags_data = validated_data.pop('tags', [])
        
        # Get merchant's shop
        merchant = self.context['request'].user
        shop, created = Shop.objects.get_or_create(
            merchant=merchant,
            defaults={'shop_name': merchant.merchant_name}
        )
        validated_data['shop'] = shop
        
        product = Product.objects.create(**validated_data)
        
        # Create images
        for image_data in images_data:
            ProductImage.objects.create(product=product, **image_data)
        
        # Create variants
        for variant_data in variants_data:
            ProductVariant.objects.create(product=product, **variant_data)
        
        # Create tags
        for tag_data in tags_data:
            ProductTag.objects.create(product=product, **tag_data)
        
        return product
    
    def update(self, instance, validated_data):
        images_data = validated_data.pop('images', None)
        variants_data = validated_data.pop('variants', None)
        tags_data = validated_data.pop('tags', None)
        
        # Update product fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update images if provided
        if images_data is not None:
            instance.images.all().delete()
            for image_data in images_data:
                ProductImage.objects.create(product=instance, **image_data)
        
        # Update variants if provided
        if variants_data is not None:
            instance.variants.all().delete()
            for variant_data in variants_data:
                ProductVariant.objects.create(product=instance, **variant_data)
        
        # Update tags if provided
        if tags_data is not None:
            instance.tags.all().delete()
            for tag_data in tags_data:
                ProductTag.objects.create(product=instance, **tag_data)
        
        return instance
