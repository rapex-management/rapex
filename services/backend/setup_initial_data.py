#!/usr/bin/env python3
"""
Initialize Product Management System with sample data
"""

from apps.products.models import ProductType, Category, Brand
from apps.merchants.models import Merchant, BusinessType

# Create product types
product_types = [
    {'name': 0},  # Shop
    {'name': 1},  # Pre-loved
    {'name': 2},  # Ready-to-Eat
    {'name': 3},  # Fresh
]

for pt_data in product_types:
    ProductType.objects.get_or_create(name=pt_data['name'])

print("✅ Product types created")

# Create categories
categories = [
    {'name': 'Electronics', 'parent': None},
    {'name': 'Smartphones', 'parent': 'Electronics'},
    {'name': 'Laptops', 'parent': 'Electronics'},
    {'name': 'Clothing', 'parent': None},
    {'name': 'Men\'s Clothing', 'parent': 'Clothing'},
    {'name': 'Women\'s Clothing', 'parent': 'Clothing'},
    {'name': 'Food & Beverages', 'parent': None},
    {'name': 'Fresh Fruits', 'parent': 'Food & Beverages'},
    {'name': 'Vegetables', 'parent': 'Food & Beverages'},
    {'name': 'Home & Garden', 'parent': None},
]

created_categories = {}
for cat_data in categories:
    parent = None
    if cat_data['parent']:
        parent = created_categories.get(cat_data['parent'])
    
    category, created = Category.objects.get_or_create(
        name=cat_data['name'],
        parent=parent
    )
    created_categories[cat_data['name']] = category

print("✅ Categories created")

# Create brands
brands = [
    {'name': 'Samsung', 'description': 'South Korean multinational electronics company'},
    {'name': 'Apple', 'description': 'American technology company'},
    {'name': 'Nike', 'description': 'American athletic footwear and apparel company'},
    {'name': 'Adidas', 'description': 'German athletic apparel company'},
    {'name': 'Uniqlo', 'description': 'Japanese casual wear designer'},
    {'name': 'Local Brand', 'description': 'Local Filipino brand'},
]

for brand_data in brands:
    Brand.objects.get_or_create(
        name=brand_data['name'],
        defaults={'description': brand_data['description']}
    )

print("✅ Brands created")

print("✅ Initial data setup complete!")
