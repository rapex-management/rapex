from django.core.management.base import BaseCommand
from apps.webauth.models import MCC, BusinessType


class Command(BaseCommand):
    help = 'Populate MCC and BusinessType tables with sample data'

    def handle(self, *args, **options):
        # Create MCC categories
        mcc_data = [
            'General Retail',
            'Food & Beverage', 
            'Grocery & Supermarket',
            'Gas Station',
            'Clothing & Accessories',
            'Electronics',
            'Books & Media',
            'Health & Beauty',
            'Home & Garden',
            'Sports & Recreation',
            'Automotive',
            'Services - Professional',
            'Services - Personal',
            'Hotel & Lodging',
            'Transportation',
            'Entertainment'
        ]

        # Create or get MCC objects
        mcc_objects = []
        for mcc_name in mcc_data:
            mcc, created = MCC.objects.get_or_create(mcc=mcc_name)
            mcc_objects.append(mcc)
            if created:
                self.stdout.write(f'Created MCC: {mcc_name}')

        # Create business types for some MCCs
        business_type_data = {
            'Food & Beverage': [
                'Restaurant',
                'Fast Food Chain',
                'Coffee Shop',
                'Bakery',
                'Food Truck',
                'Catering Service'
            ],
            'General Retail': [
                'Department Store',
                'Convenience Store',
                'Specialty Shop',
                'Online Store',
                'Wholesale Store'
            ],
            'Electronics': [
                'Computer Store',
                'Mobile Phone Shop',
                'Electronics Repair',
                'Gaming Store',
                'Audio Visual Equipment'
            ],
            'Services - Professional': [
                'Consulting',
                'Legal Services',
                'Accounting',
                'Marketing Agency',
                'IT Services'
            ]
        }

        for mcc_name, types in business_type_data.items():
            try:
                mcc = MCC.objects.get(mcc=mcc_name)
                for type_name in types:
                    business_type, created = BusinessType.objects.get_or_create(
                        business_category=mcc,
                        business_type=type_name
                    )
                    if created:
                        self.stdout.write(f'Created BusinessType: {type_name} for {mcc_name}')
            except MCC.DoesNotExist:
                self.stdout.write(f'MCC {mcc_name} not found')

        self.stdout.write(self.style.SUCCESS('Successfully populated MCC and BusinessType data'))
