# Generated migration for Google OAuth fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('webauth', '0001_initial'),  # Replace with your latest migration
    ]

    operations = [
        migrations.AddField(
            model_name='admin',
            name='google_id',
            field=models.CharField(blank=True, max_length=100, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='admin',
            name='auth_provider',
            field=models.CharField(choices=[('email', 'Email'), ('google', 'Google')], default='email', max_length=20),
        ),
        migrations.AddField(
            model_name='user',
            name='google_id',
            field=models.CharField(blank=True, max_length=100, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='user',
            name='auth_provider',
            field=models.CharField(choices=[('email', 'Email'), ('google', 'Google')], default='email', max_length=20),
        ),
    ]
