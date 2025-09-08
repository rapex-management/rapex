import uuid
import json
from decimal import Decimal
from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.core.cache import cache
from django.utils import timezone
from apps.webauth.models import BaseUser


class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle Decimal objects"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


class BusinessCategory(models.Model):
    id = models.AutoField(primary_key=True)
    category_name = models.CharField(max_length=100, unique=True)  # Business category name
    description = models.TextField(blank=True)  # Optional description
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'merchants'
    
    def __str__(self):
        return self.category_name


class BusinessType(models.Model):
    id = models.AutoField(primary_key=True)
    business_category = models.ForeignKey(BusinessCategory, on_delete=models.CASCADE, related_name='business_types')
    business_type = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'merchants'
        unique_together = ['business_category', 'business_type']
    
    def __str__(self):
        return f"{self.business_type} ({self.business_category.category_name})"


class Merchant(BaseUser):
    merchant_name = models.CharField(max_length=200)
    owner_name = models.CharField(max_length=200)
    merchant_host_id = models.CharField(max_length=100, blank=True)
    status = models.IntegerField(choices=[(0, 'Active'), (1, 'Banned'), (2, 'Frozen'), (3, 'Deleted'), (4, 'Unverified'), (5, 'Pending'), (6, 'Rejected')], default=4)
    business_registration = models.IntegerField(choices=[(0, 'Registered (VAT Included)'), (1, 'Registered (NON-VAT)'), (2, 'Unregistered')], default=2)
    # Business categorization fields
    business_category = models.ForeignKey(BusinessCategory, on_delete=models.PROTECT, null=True, blank=True, related_name='merchants')
    business_type = models.ForeignKey(BusinessType, on_delete=models.PROTECT, null=True, blank=True, related_name='merchants')
    phone = models.CharField(max_length=20)
    zipcode = models.CharField(max_length=10)
    province = models.CharField(max_length=100)
    city_municipality = models.CharField(max_length=100)
    barangay = models.CharField(max_length=100)
    street_name = models.CharField(max_length=200)
    house_number = models.CharField(max_length=50)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    settlement_emails = models.JSONField(default=list, blank=True)
    withdrawal_option = models.CharField(max_length=100, blank=True)
    profile_picture = models.URLField(blank=True)
    documents = models.JSONField(default=list, blank=True)  # URLs of documents
    documents_info = models.JSONField(default=dict, blank=True)  # DTI/SEC, BIR TIN, etc.
    additional_info = models.JSONField(default=dict, blank=True)  # comments/remarks
    date_joined = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.UUIDField(null=True, blank=True)  # Admin who verified
    
    # OTP fields for verification
    otp_code = models.CharField(max_length=6, null=True, blank=True)
    otp_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Unique merchant identifier for registration process
    merchant_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    
    class Meta:
        app_label = 'merchants'


class MerchantDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='merchant_documents')
    document_type = models.CharField(max_length=50)  # 'dti_sec', 'bir_tin', 'barangay_permit', 'additional'
    file_url = models.URLField()
    original_filename = models.CharField(max_length=255)
    file_size = models.IntegerField()  # in bytes
    uploaded_at = models.DateTimeField(auto_now_add=True)
    verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey('webauth.Admin', on_delete=models.SET_NULL, null=True, blank=True)  # Cross-app reference
    rejection_reason = models.TextField(blank=True)

    class Meta:
        app_label = 'merchants'
        unique_together = ['merchant', 'document_type']


class MerchantRegistrationSession:
    """
    Temporary registration session handler using Redis cache
    Stores multi-step form data until final submission
    """
    
    def __init__(self, session_id=None):
        self.session_id = session_id or str(uuid.uuid4())
        self.cache_key = f"merchant_registration:{self.session_id}"
        self.expire_time = 3600  # 1 hour
    
    def save_step_data(self, step, data):
        """Save data for a specific step"""
        session_data = self.get_session_data()
        session_data[f'step_{step}'] = data
        session_data['last_step'] = step
        session_data['updated_at'] = str(timezone.now())
        
        # Use custom encoder to handle Decimal objects
        cache.set(self.cache_key, json.dumps(session_data, cls=DecimalEncoder), self.expire_time)
        return True
    
    def get_session_data(self):
        """Get all session data"""
        cached_data = cache.get(self.cache_key)
        if cached_data:
            return json.loads(cached_data)
        return {}
    
    def get_step_data(self, step):
        """Get data for a specific step"""
        session_data = self.get_session_data()
        return session_data.get(f'step_{step}', {})
    
    def get_all_form_data(self):
        """Compile all steps data into single form data"""
        session_data = self.get_session_data()
        compiled_data = {}
        
        # Merge all step data
        for key, value in session_data.items():
            if key.startswith('step_'):
                if isinstance(value, dict):
                    compiled_data.update(value)
        
        return compiled_data
    
    def clear_session(self):
        """Clear the session data"""
        cache.delete(self.cache_key)
    
    def is_expired(self):
        """Check if session is expired"""
        return cache.get(self.cache_key) is None
    
    def extend_session(self):
        """Extend session expiry"""
        session_data = self.get_session_data()
        if session_data:
            cache.set(self.cache_key, json.dumps(session_data), self.expire_time)
            return True
        return False
