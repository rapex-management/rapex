# Generated migration for Google OAuth fields in Merchant model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('merchants', '0001_initial'),  # Replace with your latest migration
    ]

    operations = [
        migrations.AddField(
            model_name='merchant',
            name='google_id',
            field=models.CharField(blank=True, max_length=100, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='merchant',
            name='auth_provider',
            field=models.CharField(choices=[('email', 'Email'), ('google', 'Google')], default='email', max_length=20),
        ),
    ]
