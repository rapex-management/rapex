from django.core.management.base import BaseCommand
from apps.webauth.models import Admin


class Command(BaseCommand):
    help = 'Create a test admin user'

    def handle(self, *args, **options):
        # Check if admin already exists
        if Admin.objects.filter(username='admin').exists():
            self.stdout.write(
                self.style.WARNING('Admin user already exists.')
            )
            return

        # Create admin user
        admin = Admin.objects.create(
            username='admin',
            email='admin@rapex.com',
            first_name='Admin',
            last_name='User',
            is_superuser=True,
            status=0  # Active
        )
        admin.set_password('admin123')
        admin.save()

        self.stdout.write(
            self.style.SUCCESS('Successfully created admin user: admin/admin123')
        )
