import uuid
from django.db import models
from decimal import Decimal
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.merchants.models import Merchant


class ProductType(models.Model):
    """Product types: 0-Shop, 1-Pre-loved, 2-Ready-to-Eat, 3-Fresh"""
    TYPE_CHOICES = [
        (0, 'Shop'),
        (1, 'Pre-loved'),
        (2, 'Ready-to-Eat'),
        (3, 'Fresh'),
    ]
    
    type_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=50, choices=TYPE_CHOICES, unique=True)
    
    class Meta:
        db_table = 'product_type'
        verbose_name = 'Product Type'
        verbose_name_plural = 'Product Types'
    
    def __str__(self):
        return self.get_name_display()


class Category(models.Model):
    """Product categories with hierarchical structure"""
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


class Shop(models.Model):
    """Shop model linked to merchant"""
    shop_id = models.AutoField(primary_key=True)
    merchant = models.OneToOneField(Merchant, on_delete=models.CASCADE, related_name='shop')
    shop_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'shops'
        verbose_name = 'Shop'
        verbose_name_plural = 'Shops'
    
    def __str__(self):
        return self.shop_name


class Product(models.Model):
    """Main product model"""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('out_of_stock', 'Out of Stock'),
        ('banned', 'Banned'),
        ('draft', 'Draft'),
    ]
    
    product_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='products')
    type = models.ForeignKey(ProductType, on_delete=models.PROTECT, related_name='products')
    name = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    stock = models.PositiveIntegerField(default=0)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    brand = models.ForeignKey(Brand, on_delete=models.PROTECT, null=True, blank=True, related_name='products')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    sku = models.CharField(max_length=100, blank=True)
    weight = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text="Weight in kg")
    dimensions = models.JSONField(default=dict, blank=True, help_text="Length, width, height in cm")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'products'
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        indexes = [
            models.Index(fields=['shop', 'status']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.shop.shop_name})"
    
    @property
    def is_in_stock(self):
        return self.stock > 0
    
    @property
    def primary_image(self):
        """Get the primary image for this product"""
        return self.images.filter(is_primary=True).first()


class ProductImage(models.Model):
    """Product images"""
    image_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
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
    
    def save(self, *args, **kwargs):
        # Ensure only one primary image per product
        if self.is_primary:
            ProductImage.objects.filter(
                product=self.product, 
                is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)


class ProductVariant(models.Model):
    """Product variants (e.g., different colors, sizes)"""
    variant_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
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
        unique_together = ['product', 'variant_name']
    
    def __str__(self):
        return f"{self.product.name} - {self.variant_name}"
    
    @property
    def final_price(self):
        return self.product.price + self.price_difference


class ProductTag(models.Model):
    """Product tags for better searchability"""
    tag_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='tags')
    tag_name = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'product_tags'
        verbose_name = 'Product Tag'
        verbose_name_plural = 'Product Tags'
        unique_together = ['product', 'tag_name']
    
    def __str__(self):
        return f"{self.product.name} - {self.tag_name}"


class ProductReview(models.Model):
    """Product reviews from users"""
    review_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
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
        unique_together = ['product', 'user_id']  # One review per user per product
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Review for {self.product.name} - {self.rating} stars"
