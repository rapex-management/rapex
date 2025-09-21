#!/usr/bin/env python3
"""
Create 20 sample ShopProduct records for the merchant user.
Run with: python create_sample_shop_products.py
"""
import os
import django
import random
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rapex_main.settings')
django.setup()

from apps.merchants.models import Merchant
from apps.products.models import ShopProduct, MerchantCategory, MerchantBrand

merchant = Merchant.objects.filter(username='merchant').first()
if not merchant:
    print("❌ Merchant user 'merchant' not found. Please create the merchant account first.")
    exit(1)

# Get or create a default category and brand for the merchant
category, _ = MerchantCategory.objects.get_or_create(
    merchant=merchant,
    name='Default Category',
    defaults={'parent': None}
)
brand, _ = MerchantBrand.objects.get_or_create(
    merchant=merchant,
    brand_name='Default Brand'
)

for i in range(1, 21):
    price = Decimal(str(round(random.uniform(100, 1000), 2)))
    product, created = ShopProduct.objects.get_or_create(
        merchant=merchant,
        name=f"Sample Product {i}",
        defaults={
            'price': price,
            'stock': random.randint(1, 50),
            'status': 'active',
            'description': f"This is a sample product {i} for testing.",
            'sku': f"SKU-{i:03d}",
            'category': category,
            'brand': brand,
            'images': [f"https://via.placeholder.com/300x300?text=Product+{i}"],
        }
    )
    if created:
        print(f"✅ Created: {product.name}")
    else:
        print(f"ℹ️ Exists: {product.name}")

print("✅ 20 sample shop products added for merchant.")
