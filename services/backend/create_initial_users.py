#!/usr/bin/env python3
"""
Create initial admin and merchant users for development.
Run with: python create_initial_users.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rapex_main.settings')
django.setup()

from apps.webauth.models import Admin
from apps.merchants.models import Merchant

# Create admin user
admin_username = 'admin'
admin_email = 'admin@example.com'
admin_password = 'Password123!'
admin, created = Admin.objects.get_or_create(
    username=admin_username,
    defaults={
        'email': admin_email,
        'first_name': 'Admin',
        'last_name': 'User',
        'is_superuser': True,
        'status': 0,
    }
)
admin.set_password(admin_password)
admin.save()
if created:
    print(f"✅ Admin user '{admin_username}' created.")
else:
    print(f"ℹ️ Admin user '{admin_username}' already exists. Password updated.")

# Create merchant user
merchant_username = 'merchant'
merchant_email = 'merchant@example.com'
merchant_password = 'Password123!'
merchant, created = Merchant.objects.get_or_create(
    username=merchant_username,
    defaults={
        'email': merchant_email,
        'merchant_name': 'Merchant',
        'owner_name': 'Merchant Owner',
        'status': 0,
    }
)
merchant.set_password(merchant_password)
merchant.save()
if created:
    print(f"✅ Merchant user '{merchant_username}' created.")
else:
    print(f"ℹ️ Merchant user '{merchant_username}' already exists. Password updated.")
