#!/usr/bin/env python3
"""
Seed script for Product Management System
Creates sample categories, brands, product types, and products for testing.
"""

import os
import sys
import django
from decimal import Decimal

# Add the project root to Python path
sys.path.append('/app')

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rapex_main.settings')
django.setup()

from django.db import transaction
from apps.merchants.models import Merchant
from apps.products.models import (
    ProductType, Category, Brand, Shop, Product, ProductImage
)


def create_product_types():
    """Create basic product types"""
    types_data = [
        (0, 'Shop'),
        (1, 'Pre-loved'),
        (2, 'Ready-to-Eat'),
        (3, 'Fresh'),
    ]
    
    for type_id, name in types_data:
        product_type, created = ProductType.objects.get_or_create(
            name=type_id,
            defaults={'type_id': type_id}
        )
        if created:
            print(f"Created product type: {product_type.get_name_display()}")


def create_categories():
    """Create sample categories"""
    categories_data = [
        # Main categories
        'Electronics',
        'Clothing & Fashion',
        'Home & Garden',
        'Sports & Outdoors',
        'Food & Beverages',
        'Health & Beauty',
        'Books & Media',
        'Toys & Games',
        'Automotive',
        'Baby & Kids',
    ]
    
    # Subcategories
    subcategories_data = {
        'Electronics': [
            'Smartphones', 'Laptops', 'Cameras', 'Audio', 'Gaming', 'Accessories'
        ],
        'Clothing & Fashion': [
            'Men\'s Clothing', 'Women\'s Clothing', 'Shoes', 'Bags', 'Jewelry', 'Watches'
        ],
        'Home & Garden': [
            'Furniture', 'Kitchen', 'Bedding', 'Decor', 'Tools', 'Garden'
        ],
        'Food & Beverages': [
            'Snacks', 'Beverages', 'Fresh Produce', 'Meat & Seafood', 'Dairy', 'Pantry'
        ],
        'Health & Beauty': [
            'Skincare', 'Makeup', 'Personal Care', 'Health Supplements', 'Fitness'
        ]
    }
    
    # Create main categories
    for cat_name in categories_data:
        category, created = Category.objects.get_or_create(
            name=cat_name,
            parent=None
        )
        if created:
            print(f"Created category: {cat_name}")
        
        # Create subcategories
        if cat_name in subcategories_data:
            for subcat_name in subcategories_data[cat_name]:
                subcategory, created = Category.objects.get_or_create(
                    name=subcat_name,
                    parent=category
                )
                if created:
                    print(f"Created subcategory: {cat_name} > {subcat_name}")


def create_brands():
    """Create sample brands"""
    brands_data = [
        ('Apple', 'Premium technology products'),
        ('Samsung', 'Innovative electronics and appliances'),
        ('Nike', 'Athletic footwear and apparel'),
        ('Adidas', 'Sports and lifestyle brand'),
        ('Uniqlo', 'Japanese casual wear designer'),
        ('H&M', 'Swedish multinational clothing-retail company'),
        ('IKEA', 'Swedish furniture retailer'),
        ('Nestlé', 'Multinational food and drink processing company'),
        ('Coca-Cola', 'Beverage corporation'),
        ('Toyota', 'Japanese automotive manufacturer'),
        ('Generic Brand', 'No-brand or generic products'),
    ]
    
    for name, description in brands_data:
        brand, created = Brand.objects.get_or_create(
            name=name,
            defaults={'description': description}
        )
        if created:
            print(f"Created brand: {name}")


def create_sample_products():
    """Create sample products for testing"""
    # Get first merchant or create a test merchant
    try:
        merchant = Merchant.objects.filter(status=0).first()
        if not merchant:
            print("No active merchant found. Creating test merchant...")
            merchant = Merchant.objects.create(
                username='test_merchant',
                email='test@merchant.com',
                merchant_name='Test Shop',
                owner_name='Test Owner',
                phone='+639123456789',
                status=0,  # Active
                business_registration=0,  # Registered VAT
                zipcode='4114',
                province='Cavite',
                city_municipality='Kawit',
                barangay='Poblacion'
            )
            merchant.set_password('testpassword123')
            merchant.save()
            print(f"Created test merchant: {merchant.merchant_name}")
        
        # Get or create shop for merchant
        shop, created = Shop.objects.get_or_create(
            merchant=merchant,
            defaults={
                'shop_name': merchant.merchant_name,
                'description': 'Test shop for product management demo'
            }
        )
        if created:
            print(f"Created shop: {shop.shop_name}")
        
        # Get required data
        electronics_category = Category.objects.filter(name='Electronics').first()
        clothing_category = Category.objects.filter(name='Clothing & Fashion').first()
        food_category = Category.objects.filter(name='Food & Beverages').first()
        
        apple_brand = Brand.objects.filter(name='Apple').first()
        nike_brand = Brand.objects.filter(name='Nike').first()
        generic_brand = Brand.objects.filter(name='Generic Brand').first()
        
        shop_type = ProductType.objects.filter(name=0).first()  # Shop type
        fresh_type = ProductType.objects.filter(name=3).first()  # Fresh type
        
        if not all([electronics_category, shop_type]):
            print("Missing required categories or product types")
            return
        
        # Sample products data
        products_data = [
            {
                'name': 'iPhone 15 Pro',
                'description': 'Latest iPhone with advanced camera system and A17 Pro chip. Features titanium design and USB-C connectivity.',
                'price': Decimal('59999.00'),
                'stock': 25,
                'category': electronics_category,
                'brand': apple_brand,
                'type': shop_type,
                'status': 'active',
                'sku': 'IPH15PRO-256',
                'weight': Decimal('0.187'),
                'dimensions': {'length': 14.67, 'width': 7.09, 'height': 0.83},
                'images': [
                    'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium?wid=5120&hei=2880',
                ]
            },
            {
                'name': 'Nike Air Max 270',
                'description': 'Comfortable running shoes with Max Air technology. Perfect for daily wear and light exercise.',
                'price': Decimal('7495.00'),
                'stock': 50,
                'category': clothing_category,
                'brand': nike_brand,
                'type': shop_type,
                'status': 'active',
                'sku': 'NIKE-AM270-BLK-42',
                'weight': Decimal('0.5'),
                'dimensions': {'length': 30, 'width': 12, 'height': 10},
                'images': [
                    'https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/awjogtdnqxniqqk0wpgf/air-max-270-mens-shoes-KkLcGR.png',
                ]
            },
            {
                'name': 'Fresh Mangoes (1kg)',
                'description': 'Sweet and juicy Philippine mangoes, handpicked for quality. Perfect for desserts or eating fresh.',
                'price': Decimal('250.00'),
                'stock': 100,
                'category': food_category,
                'brand': generic_brand,
                'type': fresh_type,
                'status': 'active',
                'sku': 'MANGO-FRESH-1KG',
                'weight': Decimal('1.0'),
                'images': [
                    'https://images.unsplash.com/photo-1605027990121-cbae9d0e8058?w=800&q=80',
                ]
            },
            {
                'name': 'Samsung Galaxy Buds Pro',
                'description': 'Premium wireless earbuds with active noise cancellation and superior sound quality.',
                'price': Decimal('9990.00'),
                'stock': 30,
                'category': electronics_category,
                'brand': Brand.objects.filter(name='Samsung').first(),
                'type': shop_type,
                'status': 'active',
                'sku': 'SGBUDS-PRO-BLK',
                'weight': Decimal('0.2'),
                'images': [
                    'https://images.samsung.com/is/image/samsung/p6pim/ph/galaxy-buds-pro/gallery/ph-galaxy-buds-pro-r190-sm-r190nzkaxph-531415850',
                ]
            },
            {
                'name': 'Draft Product - Coming Soon',
                'description': 'This is a draft product that will be launched soon. Stay tuned!',
                'price': Decimal('1999.00'),
                'stock': 0,
                'category': electronics_category,
                'brand': generic_brand,
                'type': shop_type,
                'status': 'draft',
                'sku': 'DRAFT-001',
                'images': []
            }
        ]
        
        # Create products
        for product_data in products_data:
            images_data = product_data.pop('images', [])
            
            product, created = Product.objects.get_or_create(
                shop=shop,
                name=product_data['name'],
                defaults={**product_data, 'shop': shop}
            )
            
            if created:
                print(f"Created product: {product.name}")
                
                # Add images
                for i, image_url in enumerate(images_data):
                    ProductImage.objects.create(
                        product=product,
                        image_url=image_url,
                        is_primary=(i == 0),
                        alt_text=f"{product.name} image {i+1}",
                        order=i
                    )
                    print(f"  Added image {i+1} for {product.name}")
            else:
                print(f"Product already exists: {product.name}")
        
        print(f"\nSample products created for shop: {shop.shop_name}")
        print(f"Merchant: {merchant.merchant_name} ({merchant.email})")
        
    except Exception as e:
        print(f"Error creating sample products: {e}")
        import traceback
        traceback.print_exc()


def main():
    """Main function to run all seed operations"""
    print("Starting Product Management System seed process...")
    
    try:
        with transaction.atomic():
            print("\n1. Creating product types...")
            create_product_types()
            
            print("\n2. Creating categories...")
            create_categories()
            
            print("\n3. Creating brands...")
            create_brands()
            
            print("\n4. Creating sample products...")
            create_sample_products()
            
        print("\n✅ Seed process completed successfully!")
        print("\nYou can now:")
        print("1. Access the admin panel to view created data")
        print("2. Login to the merchant panel with the test merchant")
        print("3. Test the product management features")
        
    except Exception as e:
        print(f"\n❌ Seed process failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
