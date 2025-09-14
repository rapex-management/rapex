# Product Models Restructuring Migration Guide

## Overview

This document outlines the major restructuring of the product models from a single monolithic `Product` model to four separate product type-specific models:

- `ShopProduct` (for shop items)
- `PrelovedProduct` (for pre-loved items)
- `ReadyToEatProduct` (for ready-to-eat meals)
- `FreshProduct` (for fresh produce)

## Key Changes

### 1. New Product Models Structure

#### Common Base Fields (BaseProduct):
- `product_id` (UUID, Primary Key)
- `merchant` (FK to merchants - replaces shop relationship)
- `name` (String, Required)
- `price` (Decimal, Required)
- `markup_price` (Decimal, Auto-computed)
- `stock` (Positive Integer, Required)
- `status` (Enum: active, out_of_stock, banned, draft, Required)
- `description` (Long Text, Nullable)
- `sku` (String, Nullable)
- `category` (FK to merchant_categories, Nullable)
- `brand` (FK to brands, Nullable)
- `weight` (Decimal, Nullable)
- `dimensions` (JSON, Nullable)
- `created_at`, `updated_at` (Timestamps)

#### Product Type Specific Fields:

**PrelovedProduct:**
- `condition` (Enum: Like New, Fairly Used, Heavily Used, Required)
- `usage_notes` (Text, Nullable)

**ReadyToEatProduct:**
- `menu_details` (JSON, Nullable)
- `preparation_time` (Duration, Nullable)
- `is_vegetarian` (Boolean, Nullable)

**FreshProduct:**
- `shelf_life_days` (Integer, Required)
- `origin` (String, Nullable)
- `storage_instructions` (Text, Nullable)

### 2. New MerchantCategory Model
- Replaces the global Category system
- Allows merchants to have their own category hierarchies
- `merchant_id` (FK to merchants, Required)
- `name` (String, Required)
- `parent_id` (FK to merchant_categories, Nullable)

### 3. Updated Related Models
All related models now use Generic Foreign Keys to work with any product type:
- `ProductImage`
- `ProductVariant`
- `ProductTag`
- `ProductReview`

## Migration Steps

### 1. Create New Tables
```bash
python manage.py makemigrations products
python manage.py migrate products
```

### 2. Data Migration Script
Create a data migration to move existing data:

```python
# Create migration file: python manage.py makemigrations products --empty

from django.db import migrations
from django.contrib.contenttypes.models import ContentType

def migrate_products(apps, schema_editor):
    # Get old models
    OldProduct = apps.get_model('products', 'Product')  # If keeping old model temporarily
    Shop = apps.get_model('products', 'Shop')
    ProductType = apps.get_model('products', 'ProductType')  # If keeping old model temporarily
    
    # Get new models
    ShopProduct = apps.get_model('products', 'ShopProduct')
    PrelovedProduct = apps.get_model('products', 'PrelovedProduct')
    ReadyToEatProduct = apps.get_model('products', 'ReadyToEatProduct')
    FreshProduct = apps.get_model('products', 'FreshProduct')
    MerchantCategory = apps.get_model('products', 'MerchantCategory')
    
    # Migrate categories to merchant categories
    Category = apps.get_model('products', 'Category')
    for category in Category.objects.all():
        # Create merchant categories for each merchant that has products in this category
        merchants_with_category = Shop.objects.filter(
            products__category=category
        ).distinct()
        
        for shop in merchants_with_category:
            MerchantCategory.objects.get_or_create(
                merchant=shop.merchant,
                name=category.name,
                parent=None  # Handle hierarchies separately if needed
            )
    
    # Migrate products to appropriate types
    for product in OldProduct.objects.all():
        common_fields = {
            'product_id': product.product_id,
            'merchant': product.shop.merchant,
            'name': product.name,
            'price': product.price,
            'stock': product.stock,
            'status': product.status,
            'description': product.description,
            'sku': product.sku,
            'brand': product.brand,
            'weight': product.weight,
            'dimensions': product.dimensions,
            'created_at': product.created_at,
            'updated_at': product.updated_at,
        }
        
        # Try to find matching merchant category
        try:
            merchant_category = MerchantCategory.objects.get(
                merchant=product.shop.merchant,
                name=product.category.name
            )
            common_fields['category'] = merchant_category
        except MerchantCategory.DoesNotExist:
            pass
        
        # Create appropriate product type
        if product.type.name == 0:  # Shop
            ShopProduct.objects.create(**common_fields)
        elif product.type.name == 1:  # Pre-loved
            PrelovedProduct.objects.create(
                condition='like_new',  # Default, update manually if needed
                **common_fields
            )
        elif product.type.name == 2:  # Ready-to-Eat
            ReadyToEatProduct.objects.create(**common_fields)
        elif product.type.name == 3:  # Fresh
            FreshProduct.objects.create(
                shelf_life_days=7,  # Default, update manually if needed
                **common_fields
            )

def reverse_migrate_products(apps, schema_editor):
    # Reverse migration logic if needed
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('products', 'XXXX_previous_migration'),
    ]
    
    operations = [
        migrations.RunPython(migrate_products, reverse_migrate_products),
    ]
```

### 3. Migrate Related Model Data

Create another migration to update ProductImage, ProductVariant, ProductTag, and ProductReview:

```python
def migrate_related_models(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    ProductImage = apps.get_model('products', 'ProductImage')
    ProductVariant = apps.get_model('products', 'ProductVariant')
    ProductTag = apps.get_model('products', 'ProductTag')
    ProductReview = apps.get_model('products', 'ProductReview')
    
    # Get content types for new models
    shop_ct = ContentType.objects.get_for_model(apps.get_model('products', 'ShopProduct'))
    preloved_ct = ContentType.objects.get_for_model(apps.get_model('products', 'PrelovedProduct'))
    rte_ct = ContentType.objects.get_for_model(apps.get_model('products', 'ReadyToEatProduct'))
    fresh_ct = ContentType.objects.get_for_model(apps.get_model('products', 'FreshProduct'))
    
    # Map old products to new ones and update related models
    # This requires knowing the mapping from old product IDs to new product types
    # Implementation depends on how you track this mapping
```

## Breaking Changes

1. **Direct Product model references** - All code referencing `Product` model needs to be updated to use the specific product type models
2. **Shop model removed** - The `Shop` model is no longer needed as products are directly linked to merchants
3. **Category system changed** - Global categories replaced with merchant-specific categories
4. **Related model queries** - Queries for images, variants, tags, and reviews now use generic foreign keys

## API Changes Required

1. Update serializers to handle new product models
2. Update views to work with specific product types
3. Update URL patterns if needed
4. Update any API documentation

## Benefits

1. **Type Safety** - Each product type has its specific fields and validation
2. **Performance** - Smaller, more focused tables
3. **Scalability** - Easier to add type-specific features
4. **Merchant Autonomy** - Merchants can create their own category hierarchies
5. **Automatic Markup Calculation** - Built-in markup price computation

## Testing

1. Test data migration with sample data
2. Verify all CRUD operations work with new models
3. Test generic foreign key relationships
4. Verify markup price calculation
5. Test merchant category hierarchy functionality

## Rollback Plan

If rollback is needed:
1. Keep old tables during migration period
2. Create reverse migration scripts
3. Restore from database backup if necessary