from django.core.management.base import BaseCommand
from apps.webauth.models import MCC, BusinessType


class Command(BaseCommand):
    help = 'Populate MCC and BusinessType tables with initial data'

    def handle(self, *args, **options):
        # MCC and Business Type data
        mcc_business_types = {
            'General Retail': [
                'Grocery Store', 'Sari-Sari Store', 'Convenience Store', 'Department Store',
                'Discount Store', 'Clothing/Apparel Store', 'Toy Store', 'Bookstore',
                'Pet Supplies Store', 'Beauty & Personal Care Store', 'Home Improvement Store',
                'Household Goods Store', 'Stationery & Office Supplies Store', 'Retail Pharmacy',
                'Agricultural Store', 'Pre-loved (Secondhand Goods)'
            ],
            'Food & Beverage': [
                'Food Stall', 'Coffee Shop', 'Restaurant', 'Fast Food', 'Street Food Vendor',
                'Bakery', 'Fresh Market', 'Meat Shop', 'Fish Vendor'
            ],
            'Health & Wellness': [
                'Pharmacy', 'Optical Shop', 'Cosmetic & Beauty Products', 'Baby Products',
                'Wellness & Health Clinics'
            ],
            'Electronics & Appliances': [
                'Electronics Store', 'Mobile Phone Store', 'Computer Shop', 'Appliance Store',
                'Gadget Accessory Shop'
            ],
            'Home & Furniture': [
                'Furniture Store', 'Home Decor Store', 'Kitchenware & Cookware Store',
                'Appliance & Home Goods Store', 'Motor Parts Store'
            ],
            'Specialty & Niche Retail': [
                'Jewelry Store', 'Sporting Goods Store', 'Automotive Supplies Store',
                'Pet Supplies Store', 'Hobby & Crafts Store', 'Hardware Store'
            ],
            'Food Distribution': [
                'Food Wholesalers', 'Catering & Bulk Food Suppliers', 'Beverage Distributors'
            ]
        }

        # Clear existing data
        BusinessType.objects.all().delete()
        MCC.objects.all().delete()

        self.stdout.write('Creating MCC and BusinessType records...')

        for mcc_name, business_types in mcc_business_types.items():
            # Create MCC
            mcc, created = MCC.objects.get_or_create(mcc=mcc_name)
            if created:
                self.stdout.write(f'Created MCC: {mcc_name}')

            # Create Business Types for this MCC
            for business_type_name in business_types:
                business_type, created = BusinessType.objects.get_or_create(
                    business_category=mcc,
                    business_type=business_type_name
                )
                if created:
                    self.stdout.write(f'  Created Business Type: {business_type_name}')

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully populated {MCC.objects.count()} MCCs and {BusinessType.objects.count()} Business Types'
            )
        )
