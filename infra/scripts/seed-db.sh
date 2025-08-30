#!/bin/bash

echo "Seeding database with test users..."

# Create seed script
docker exec -i infra-backend-1 sh -lc "cat > /tmp/seed_all_users.py <<'PY'
from apps.webauth.models import Admin, Merchant

# Create admin user
admin = Admin(
    username='admin',
    email='admin@example.com',
    first_name='Admin',
    last_name='User',
    is_superuser=True
)
admin.set_password('AdminPass123!')
admin.save()

# Create merchant users
merchant1 = Merchant(
    username='merchant1',
    email='merchant@example.com',
    merchant_name='Test Merchant',
    owner_name='Owner Name',
    phone='09171234567',
    zipcode='1000',
    province='Province',
    city_municipality='City',
    barangay='Barangay',
    street_name='Main St',
    house_number='1',
    mcc=0,
    merchant_id='M0001'
)
merchant1.set_password('MerchantPass123!')
merchant1.save()

merchant2 = Merchant(
    username='sh4ki',
    email='shekaigarcia@gmail.com',
    merchant_name='Sheki Merchant',
    owner_name='Sheka Garcia',
    phone='09170000000',
    zipcode='0000',
    province='Province',
    city_municipality='City',
    barangay='Barangay',
    street_name='Main St',
    house_number='1',
    mcc=0,
    merchant_id='M0002'
)
merchant2.set_password('Sheki5726!')
merchant2.save()

print('✅ Admin created:', admin.email)
print('✅ Merchant 1 created:', merchant1.email)
print('✅ Merchant 2 created:', merchant2.email)
print('Database seeded successfully!')
PY

python manage.py shell < /tmp/seed_all_users.py"

echo "✅ Database seeding complete!"
