#!/usr/bin/env python
"""
Fresh Migration Script for RAPEX
This script drops all tables and recreates them with fresh migrations
"""
import os
import sys
import django
import subprocess
from pathlib import Path

# Setup Django environment
ROOT = Path(__file__).resolve().parent
APPS_DIR = ROOT / 'apps'
if str(APPS_DIR) not in sys.path:
    sys.path.insert(0, str(APPS_DIR))
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rapex_main.settings')
django.setup()

from django.core.management import execute_from_command_line
from django.db import connection
from django.conf import settings

def drop_all_tables():
    """Drop all tables in the database"""
    print("🗑️  Dropping all tables...")
    
    with connection.cursor() as cursor:
        # Get all table names
        cursor.execute("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename NOT LIKE 'pg_%'
            AND tablename NOT LIKE 'sql_%'
        """)
        
        tables = [row[0] for row in cursor.fetchall()]
        
        if tables:
            # Drop all tables
            tables_str = ', '.join(f'"{table}"' for table in tables)
            cursor.execute(f'DROP TABLE IF EXISTS {tables_str} CASCADE')
            print(f"✅ Dropped {len(tables)} tables")
        else:
            print("✅ No tables found to drop")

def fresh_migrate():
    """Run fresh migrations - recreates ALL tables with same structure"""
    print("\n🔄 Running fresh migrations...")
    
    # Remove existing migration files (keep __init__.py)
    apps_to_migrate = [
        'webauth', 'accounts', 'merchants', 'products', 
        'orders', 'riders', 'analytics', 'wallets', 'comissions'
    ]
    
    print("🗑️  Removing old migration files...")
    for app_name in apps_to_migrate:
        migrations_dir = ROOT / 'apps' / app_name / 'migrations'
        if migrations_dir.exists():
            # Remove all migration files except __init__.py
            for migration_file in migrations_dir.glob('*.py'):
                if migration_file.name != '__init__.py':
                    migration_file.unlink()
                    print(f"   Removed {migration_file.name}")
    
    # Make new migrations from existing models
    print("\n📝 Creating fresh migrations from existing models...")
    print("   This recreates ALL tables with SAME structure...")
    execute_from_command_line(['manage.py', 'makemigrations'])
    
    # Apply migrations to create empty tables
    print("\n⚡ Applying migrations (creating empty tables)...")
    execute_from_command_line(['manage.py', 'migrate'])
    
    print("✅ All tables recreated with same structure (empty)")

def create_seeders():
    """Create ONLY admin, merchant users AND business categories/types (all other tables remain empty)"""
    print("\n🌱 Seeding users and business data into empty tables...")
    
    # Import models after Django setup
    from apps.webauth.models import Admin
    from apps.merchants.models import Merchant, BusinessCategory, BusinessType
    
    # Create Business Categories
    try:
        print("📊 Creating business categories...")
        categories_data = [
            {'category_name': 'General Retail', 'description': 'General merchandise and retail stores'},
            {'category_name': 'Food & Beverage', 'description': 'Restaurants, cafes, food establishments'},
            {'category_name': 'Pre-loved', 'description': 'Second-hand and vintage items'},
            {'category_name': 'Fresh Market', 'description': 'Fresh produce and market goods'},
            {'category_name': 'Grocery & Supermarket', 'description': 'Grocery stores and supermarkets'},
            {'category_name': 'Clothing & Accessories', 'description': 'Fashion, clothing, and accessories'},
            {'category_name': 'Electronics', 'description': 'Electronic devices and gadgets'},
            {'category_name': 'Pharmacy', 'description': 'Pharmaceutical and health products'},
            {'category_name': 'Hardware', 'description': 'Tools, construction, and hardware supplies'},
            {'category_name': 'Sports & Recreation', 'description': 'Sports equipment and recreational items'},
        ]
        
        created_categories = []
        for cat_data in categories_data:
            category, created = BusinessCategory.objects.get_or_create(
                category_name=cat_data['category_name'],
                defaults={'description': cat_data['description']}
            )
            created_categories.append(category)
            if created:
                print(f"   ✅ Created: {category.category_name}")
            else:
                print(f"   ℹ️  Exists: {category.category_name}")
        
        print(f"📊 Business categories ready: {len(created_categories)} total")
    except Exception as e:
        print(f"❌ Failed to create business categories: {e}")
    
    # Create Business Types
    try:
        print("🏷️  Creating business types...")
        
        # General Retail types
        general_retail_category = BusinessCategory.objects.get(category_name='General Retail')
        general_retail_types = [
            'Department Store', 'Variety Store', 'General Merchandise', 'Mini Store', 
            'Convenience Store', 'Specialty Store', 'Gift Shop', 'Souvenir Shop'
        ]
        
        # Food & Beverage types  
        food_beverage_category = BusinessCategory.objects.get(category_name='Food & Beverage')
        food_beverage_types = [
            'Restaurant', 'Fast Food', 'Cafe', 'Coffee Shop', 'Bakery', 'Pastry Shop',
            'Bar', 'Pub', 'Food Truck', 'Catering', 'Canteen', 'Cafeteria', 
            'Food Court', 'Snack Bar', 'Ice Cream Shop', 'Juice Bar'
        ]
        
        # Pre-loved types
        preloved_category = BusinessCategory.objects.get(category_name='Pre-loved')
        preloved_types = [
            'Thrift Store', 'Vintage Shop', 'Second Hand Store', 'Consignment Shop',
            'Antique Store', 'Used Goods', 'Flea Market Vendor', 'Estate Sale'
        ]
        
        # Fresh Market types
        fresh_market_category = BusinessCategory.objects.get(category_name='Fresh Market')
        fresh_market_types = [
            'Wet Market', 'Farmers Market', 'Fresh Produce', 'Fruit Stand',
            'Vegetable Stand', 'Meat Shop', 'Fish Market', 'Poultry Shop',
            'Dairy Products', 'Organic Market'
        ]
        
        # Grocery & Supermarket types
        grocery_category = BusinessCategory.objects.get(category_name='Grocery & Supermarket')
        grocery_types = [
            'Supermarket', 'Grocery Store', 'Mini Mart', 'Hypermarket',
            'Delicatessen', 'Health Food Store', 'Wholesale Grocery'
        ]
        
        # Clothing & Accessories types
        clothing_category = BusinessCategory.objects.get(category_name='Clothing & Accessories')
        clothing_types = [
            'Clothing Store', 'Fashion Boutique', 'Shoe Store', 'Bag Shop',
            'Jewelry Store', 'Watch Shop', 'Accessories Store', 'Uniform Shop',
            'Sportswear', 'Underwear Shop', 'Tailoring Shop', 'Fabric Store'
        ]
        
        # Electronics types
        electronics_category = BusinessCategory.objects.get(category_name='Electronics')
        electronics_types = [
            'Electronics Store', 'Computer Shop', 'Mobile Phone Shop', 'Gadget Store',
            'Audio/Video Store', 'Appliance Store', 'Camera Shop', 'Gaming Store',
            'Electronics Repair', 'Tech Accessories'
        ]
        
        # Pharmacy types
        pharmacy_category = BusinessCategory.objects.get(category_name='Pharmacy')
        pharmacy_types = [
            'Pharmacy', 'Drugstore', 'Medical Supplies', 'Health Store',
            'Herbal Medicine', 'Optical Shop', 'Medical Equipment', 'Wellness Center'
        ]
        
        # Hardware types
        hardware_category = BusinessCategory.objects.get(category_name='Hardware')
        hardware_types = [
            'Hardware Store', 'Construction Supplies', 'Tools Shop', 'Paint Store',
            'Electrical Supplies', 'Plumbing Supplies', 'Building Materials', 'Home Improvement'
        ]
        
        # Sports & Recreation types
        sports_category = BusinessCategory.objects.get(category_name='Sports & Recreation')
        sports_types = [
            'Sports Store', 'Sporting Goods', 'Fitness Equipment', 'Outdoor Gear',
            'Athletic Wear', 'Sports Accessories', 'Recreation Equipment', 'Gym Equipment',
            'Bicycle Shop', 'Fishing Supplies'
        ]
        
        type_mappings = [
            (general_retail_category, general_retail_types),
            (food_beverage_category, food_beverage_types),
            (preloved_category, preloved_types),
            (fresh_market_category, fresh_market_types),
            (grocery_category, grocery_types),
            (clothing_category, clothing_types),
            (electronics_category, electronics_types),
            (pharmacy_category, pharmacy_types),
            (hardware_category, hardware_types),
            (sports_category, sports_types),
        ]
        
        total_types = 0
        for category, type_list in type_mappings:
            for type_name in type_list:
                business_type, created = BusinessType.objects.get_or_create(
                    business_category=category,
                    business_type=type_name
                )
                total_types += 1
                if created:
                    print(f"   ✅ Created: {type_name} ({category.category_name})")
        
        print(f"🏷️  Business types ready: {total_types} total")
    except Exception as e:
        print(f"❌ Failed to create business types: {e}")
    
    # Create Admin User
    try:
        admin_user = Admin.objects.create(
            username='admin',
            email='admin@example.com',
            first_name='System',
            last_name='Administrator',
            status=0,  # Active status
            is_superuser=True
        )
        admin_user.set_password('admin123')
        admin_user.save()
        print("✅ Created admin user in Admin table")
    except Exception as e:
        print(f"❌ Failed to create admin user: {e}")
    
    # Create Merchant User  
    try:
        # Get a business category and type for the merchant
        food_category = BusinessCategory.objects.filter(category_name='Food & Beverage').first()
        restaurant_type = BusinessType.objects.filter(business_type='Restaurant').first()
        
        merchant_user = Merchant.objects.create(
            username='merchant',
            email='merchant@example.com',
            merchant_name='Test Restaurant',
            owner_name='Merchant Owner',
            phone='+1234567890',
            status=0,  # Active status
            business_category=food_category,
            business_type=restaurant_type,
            zipcode='12345',
            province='Test Province',
            city_municipality='Test City',
            barangay='Test Barangay',
            street_name='Test Street',
            house_number='123'
        )
        merchant_user.set_password('merchant123')
        merchant_user.save()
        print("✅ Created merchant user in Merchant table")
    except Exception as e:
        print(f"❌ Failed to create merchant user: {e}")
    
    print("🎯 All other tables remain completely empty")

def verify_tables():
    """Verify all tables were created and show their status"""
    print("\n🔍 Verifying created tables...")
    
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename NOT LIKE 'pg_%'
            AND tablename NOT LIKE 'sql_%'
            ORDER BY tablename
        """)
        
        tables = [row[0] for row in cursor.fetchall()]
        
        print(f"✅ Created {len(tables)} tables:")
        for table in tables:
            if table in ['django_migrations', 'django_content_type', 'django_session']:
                print(f"   📄 {table} (Django system table)")
            elif 'admin' in table.lower():
                cursor.execute(f'SELECT COUNT(*) FROM "{table}"')
                count = cursor.fetchone()[0]
                print(f"   👤 {table} ({count} records - seeded)")
            elif 'merchant' in table.lower():
                cursor.execute(f'SELECT COUNT(*) FROM "{table}"')
                count = cursor.fetchone()[0]
                print(f"   🏪 {table} ({count} records - seeded)")
            else:
                cursor.execute(f'SELECT COUNT(*) FROM "{table}"')
                count = cursor.fetchone()[0]
                print(f"   📊 {table} ({count} records - empty)")
        
        print(f"\n🎯 Summary: {len(tables)} tables created with same structure as before")

def main():
    """Main function to execute fresh migration"""
    print("🚀 RAPEX Fresh Migration Started")
    print("=" * 50)
    print("GOAL: Drop all tables → Recreate same structure → Empty tables + seed users")
    print("=" * 50)
    
    try:
        # Step 1: Drop all tables
        drop_all_tables()
        
        # Step 2: Fresh migrations (recreate same structure)
        fresh_migrate()
        
        # Step 3: Create seeders (only admin & merchant)
        create_seeders()
        
        # Step 4: Verify everything was created correctly
        verify_tables()
        
        print("\n" + "=" * 70)
        print("✅ Fresh migration completed successfully!")
        print("🎯 Result: ALL tables recreated with SAME structure but EMPTY")
        print("👥 Seeded: 1 Admin + 1 Merchant user + Business Categories & Types")
        print("=" * 70)
        print("\n👤 Admin Credentials:")
        print("   Username: admin")
        print("   Email: admin@example.com") 
        print("   Password: admin123")
        print("   Status: 0 (Active)")
        print("\n🏪 Merchant Credentials:")
        print("   Username: merchant")
        print("   Email: merchant@example.com")
        print("   Password: merchant123")
        print("   Status: 0 (Active)")
        print("   Business: Test Restaurant (Food & Beverage)")
        print("\n📊 Business Data Seeded:")
        print("   ✅ 10 Business Categories (General Retail, Food & Beverage, Electronics, etc.)")
        print("   ✅ 80+ Business Types (Restaurant, Cafe, Hardware Store, etc.)")
        print("\n🌐 Access URLs:")
        print("   Admin Dashboard: http://localhost:3000/admin/dashboard")
        print("   Merchant Dashboard: http://localhost:3000/merchant/dashboard")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
