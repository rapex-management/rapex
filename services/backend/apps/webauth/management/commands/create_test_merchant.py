from django.core.management.base import BaseCommand
from apps.webauth.models import Merchant


class Command(BaseCommand):
    help = 'Create a test merchant user'

    def handle(self, *args, **options):
        # Check if merchant already exists
        if Merchant.objects.filter(username='merchant').exists():
            self.stdout.write(
                self.style.WARNING('Merchant user already exists.')
            )
            return

        # Create merchant user
        merchant = Merchant.objects.create(
            username='merchant',
            email='merchant@rapex.com',
            merchant_name='Test Merchant',
            owner_name='Test Owner',
            status=0,  # Active
            business_registration=0,  # Registered (VAT Included)
            mcc=0,  # Food Stall
            phone='+639123456789',
            zipcode='1234',
            province='Test Province',
            city_municipality='Test City',
            barangay='Test Barangay',
            street_name='Test Street',
            house_number='123'
        )
        merchant.set_password('merchant123')
        merchant.save()

        self.stdout.write(
            self.style.SUCCESS('Successfully created merchant user: merchant/merchant123')
        )
