import uuid
from django.db import models
from decimal import Decimal
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from apps.merchants.models import Merchant


# Common choices for all product types
PRODUCT_STATUS_CHOICES = [
    ('active', 'Active'),
    ('out_of_stock', 'Out of Stock'),
    ('banned', 'Banned'),
    ('draft', 'Draft'),
]

CONDITION_CHOICES = [
    ('like_new', 'Like New'),
    ('fairly_used', 'Fairly Used'),
    ('heavily_used', 'Heavily Used'),
]


class MerchantCategory(models.Model):
    """Merchant-specific product categories with hierarchical structure"""
    category_id = models.AutoField(primary_key=True)
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=100)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subcategories')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'merchant_categories'
        verbose_name = 'Merchant Category'
        verbose_name_plural = 'Merchant Categories'
        unique_together = ['merchant', 'name', 'parent']
    
    def __str__(self):
        if self.parent:
            return f"{self.merchant.merchant_name} - {self.parent.name} > {self.name}"
        return f"{self.merchant.merchant_name} - {self.name}"


class Category(models.Model):
    """Global product categories with hierarchical structure (kept for backward compatibility)"""
    category_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subcategories')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'categories'
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
    
    def __str__(self):
        if self.parent:
            return f"{self.parent.name} > {self.name}"
        return self.name


class Brand(models.Model):
    """Product brands"""
    brand_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'brands'
        verbose_name = 'Brand'
        verbose_name_plural = 'Brands'
    
    def __str__(self):
        return self.name


class BaseProduct(models.Model):
    """Abstract base class for all product types"""
    product_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='%(class)s_products')
    name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    markup_price = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    stock = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=PRODUCT_STATUS_CHOICES, default='draft')
    description = models.TextField(null=True, blank=True)
    sku = models.CharField(max_length=100, null=True, blank=True)
    category = models.ForeignKey(MerchantCategory, on_delete=models.PROTECT, null=True, blank=True, related_name='%(class)s_products')
    brand = models.ForeignKey('MerchantBrand', on_delete=models.PROTECT, null=True, blank=True, related_name='%(class)s_products')
    weight = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text="Weight in kg")
    dimensions = models.JSONField(default=dict, blank=True, help_text="Length, width, height in cm")
    images = models.JSONField(default=list, null=True, blank=True, help_text="Array of image URLs")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=['merchant', 'status']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['name']),
        ]
    
    def save(self, *args, **kwargs):
        # Calculate markup_price (assuming 10% markup for now - can be customized per merchant)
        if not self.markup_price:
            self.markup_price = self.price * Decimal('1.1')
        super().save(*args, **kwargs)
    
    @property
    def is_in_stock(self):
        return self.stock > 0
    
    @property
    def primary_image(self):
        """Get the first image from the images array"""
        if self.images and len(self.images) > 0:
            return self.images[0]
        return None
    
    @property
    def related_images(self):
        """Get related ProductImage objects (for backward compatibility)"""
        content_type = ContentType.objects.get_for_model(self.__class__)
        return ProductImage.objects.filter(
            content_type=content_type,
            object_id=self.product_id
        )
    
    @property
    def variants(self):
        """Get all variants for this product"""
        content_type = ContentType.objects.get_for_model(self.__class__)
        return ProductVariant.objects.filter(
            content_type=content_type,
            object_id=self.product_id
        )
    
    @property
    def tags(self):
        """Get all tags for this product"""
        content_type = ContentType.objects.get_for_model(self.__class__)
        return ProductTag.objects.filter(
            content_type=content_type,
            object_id=self.product_id
        )
    
    @property
    def reviews(self):
        """Get all reviews for this product"""
        content_type = ContentType.objects.get_for_model(self.__class__)
        return ProductReview.objects.filter(
            content_type=content_type,
            object_id=self.product_id
        )
    
    def __str__(self):
        return f"{self.name} ({self.merchant.merchant_name})"


class ShopProduct(BaseProduct):
    """Shop products model"""
    
    class Meta:
        db_table = 'shop_products'
        verbose_name = 'Shop Product'
        verbose_name_plural = 'Shop Products'


class PrelovedProduct(BaseProduct):
    """Preloved products model"""
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES)
    usage_notes = models.TextField(null=True, blank=True, help_text="Additional notes about item usage and condition")
    
    class Meta:
        db_table = 'preloved_products'
        verbose_name = 'Preloved Product'
        verbose_name_plural = 'Preloved Products'


class ReadyToEatProduct(BaseProduct):
    """Ready-to-eat products model"""
    menu_details = models.JSONField(default=dict, blank=True, help_text="Menu details like ingredients, allergens, etc.")
    preparation_time = models.DurationField(null=True, blank=True, help_text="Time required to prepare the meal")
    is_vegetarian = models.BooleanField(null=True, blank=True)
    
    class Meta:
        db_table = 'ready_to_eat_products'
        verbose_name = 'Ready-to-Eat Product'
        verbose_name_plural = 'Ready-to-Eat Products'


class FreshProduct(BaseProduct):
    """Fresh products model"""
    shelf_life_days = models.PositiveIntegerField(help_text="Number of days the product stays fresh")
    origin = models.CharField(max_length=200, null=True, blank=True, help_text="Origin/source of the fresh product")
    storage_instructions = models.TextField(null=True, blank=True, help_text="Instructions for proper storage")
    
    class Meta:
        db_table = 'fresh_products'
        verbose_name = 'Fresh Product'
        verbose_name_plural = 'Fresh Products'


class ProductImage(models.Model):
    """Product images for all product types"""
    image_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    product = GenericForeignKey('content_type', 'object_id')
    image_url = models.URLField()
    is_primary = models.BooleanField(default=False)
    alt_text = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'product_images'
        verbose_name = 'Product Image'
        verbose_name_plural = 'Product Images'
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
        ]
    
    def save(self, *args, **kwargs):
        # Ensure only one primary image per product
        if self.is_primary:
            ProductImage.objects.filter(
                content_type=self.content_type,
                object_id=self.object_id,
                is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)


class ProductVariant(models.Model):
    """Product variants (e.g., different colors, sizes) for all product types"""
    variant_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    product = GenericForeignKey('content_type', 'object_id')
    variant_name = models.CharField(max_length=100)  # e.g., "Color: Red", "Size: Large"
    price_difference = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    stock = models.PositiveIntegerField(default=0)
    sku = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'product_variants'
        verbose_name = 'Product Variant'
        verbose_name_plural = 'Product Variants'
        unique_together = ['content_type', 'object_id', 'variant_name']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
        ]
    
    def __str__(self):
        return f"{self.product.name} - {self.variant_name}"
    
    @property
    def final_price(self):
        return self.product.price + self.price_difference


class ProductTag(models.Model):
    """Product tags for better searchability for all product types"""
    tag_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    product = GenericForeignKey('content_type', 'object_id')
    tag_name = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'product_tags'
        verbose_name = 'Product Tag'
        verbose_name_plural = 'Product Tags'
        unique_together = ['content_type', 'object_id', 'tag_name']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
        ]
    
    def __str__(self):
        return f"{self.product.name} - {self.tag_name}"


class ProductReview(models.Model):
    """Product reviews from users for all product types"""
    review_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    product = GenericForeignKey('content_type', 'object_id')
    user_id = models.UUIDField()  # Reference to user from webauth app
    rating = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField()
    is_verified_purchase = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'product_reviews'
        verbose_name = 'Product Review'
        verbose_name_plural = 'Product Reviews'
        unique_together = ['content_type', 'object_id', 'user_id']  # One review per user per product
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['content_type', 'object_id']),
        ]
    
    def __str__(self):
        return f"Review for {self.product.name} - {self.rating} stars"


class MerchantBrand(models.Model):
    """Merchant-specific product brands - simplified structure"""
    brand_id = models.AutoField(primary_key=True)
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='merchant_brands')
    brand_name = models.CharField(max_length=100)
    
    class Meta:
        db_table = 'merchant_brands'
        verbose_name = 'Merchant Brand'
        verbose_name_plural = 'Merchant Brands'
        unique_together = ['merchant', 'brand_name']
    
    def __str__(self):
        return f"{self.merchant.merchant_name} - {self.brand_name}"
