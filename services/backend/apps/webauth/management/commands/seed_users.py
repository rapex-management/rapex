from django.core.management.base import BaseCommand
from apps.webauth.models import Admin, Merchant


class Command(BaseCommand):
    help = 'Seed example admin and merchant users'

    def handle(self, *args, **options):
        # Create admin user
        if not Admin.objects.filter(username='admin').exists():
            a = Admin(
                username='admin',
                email='admin@example.com',
                first_name='Admin',
                last_name='User',
                status=0,  # Active
                is_superuser=True
            )
            a.set_password('adminpass')
            a.save()
            self.stdout.write(self.style.SUCCESS('Created admin user: username=admin, email=admin@example.com, password=adminpass'))
        else:
            self.stdout.write('Admin user already exists')

        # Create merchant user
        if not Merchant.objects.filter(username='merchant').exists():
            m = Merchant(
                username='merchant',
                email='merchant@example.com',
                merchant_name='Demo Restaurant',
                owner_name='John Doe',
                mcc=10,  # Restaurant
                phone='+1234567890',
                zipcode='12345',
                province='Demo Province',
                city_municipality='Demo City',
                barangay='Demo Barangay',
                street_name='Demo Street',
                house_number='123',
                status=0  # Active
            )
            m.set_password('merchantpass')
            m.save()
            self.stdout.write(self.style.SUCCESS('Created merchant user: username=merchant, email=merchant@example.com, password=merchantpass'))
        else:
            self.stdout.write('Merchant user already exists')
