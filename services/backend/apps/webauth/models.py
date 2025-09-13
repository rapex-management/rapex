import uuid
import json
from decimal import Decimal
from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.core.cache import cache
from django.utils import timezone


class BaseUser(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def set_password(self, raw):
        self.password = make_password(raw)

    def check_password(self, raw):
        return check_password(raw, self.password)

    @property
    def is_authenticated(self):
        """
        Always return True. This is a way to tell if the user has been
        authenticated in templates.
        """
        return True

    @property
    def is_anonymous(self):
        """
        Always return False. This is a way to tell if the user has been
        authenticated in templates.
        """
        return False

    def get_username(self):
        """Return the username for this User."""
        return getattr(self, 'username', None)

    def __str__(self):
        return self.username


class Admin(BaseUser):
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    status = models.IntegerField(choices=[(0, 'Active'), (1, 'Banned'), (2, 'Frozen'), (3, 'Deleted'), (4, 'Unverified')], default=0)
    profile_picture = models.URLField(blank=True)
    is_superuser = models.BooleanField(default=False)
    
    # OTP fields for password reset
    otp_code = models.CharField(max_length=6, null=True, blank=True)
    otp_expires_at = models.DateTimeField(null=True, blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    
    # Google OAuth fields
    google_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    auth_provider = models.CharField(max_length=20, choices=[('email', 'Email'), ('google', 'Google')], default='email')


class Rider(BaseUser):
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    phone = models.CharField(max_length=20)
    status = models.IntegerField(choices=[(0, 'Active'), (1, 'Banned'), (2, 'Frozen'), (3, 'Deleted'), (4, 'Unverified')], default=4)
    profile_picture = models.URLField(blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)


class User(BaseUser):
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    phone = models.CharField(max_length=20)
    status = models.IntegerField(choices=[(0, 'Active'), (1, 'Banned'), (2, 'Frozen'), (3, 'Deleted'), (4, 'Unverified')], default=4)
    profile_picture = models.URLField(blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    
    # Google OAuth fields
    google_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    auth_provider = models.CharField(max_length=20, choices=[('email', 'Email'), ('google', 'Google')], default='email')


class EmailVerification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    otp_code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=50, choices=[
        ('merchant_signup', 'Merchant Signup'),
        ('password_reset', 'Password Reset'),
        ('email_change', 'Email Change')
    ])
    expires_at = models.DateTimeField()
    verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['email', 'purpose', 'verified']),
            models.Index(fields=['expires_at']),
        ]
