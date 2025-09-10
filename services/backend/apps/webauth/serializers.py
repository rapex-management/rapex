from rest_framework import serializers
from .models import Admin, Rider, User, EmailVerification
from apps.merchants.models import Merchant, MerchantDocument, BusinessCategory, BusinessType, MerchantRegistrationSession


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()  # username or email
    password = serializers.CharField(write_only=True)


class AdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Admin
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'status', 'is_superuser']


class MerchantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Merchant
        fields = ['id', 'username', 'email', 'merchant_name', 'owner_name', 'business_category', 'business_type', 'business_registration', 'status', 'phone']


class MerchantSignupSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = Merchant
        fields = [
            'username', 'email', 'password', 'confirm_password',
            'merchant_name', 'owner_name', 'phone', 'business_category', 'business_type', 'business_registration'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
        }
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
        return data
    
    def validate_username(self, value):
        if Merchant.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value
    
    def validate_email(self, value):
        if Merchant.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        
        merchant = Merchant(**validated_data)
        merchant.set_password(password)
        merchant.save()
        
        return merchant


class MerchantLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Merchant
        fields = [
            'zipcode', 'province', 'city_municipality', 'barangay',
            'street_name', 'house_number', 'latitude', 'longitude'
        ]


class MerchantDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MerchantDocument
        fields = [
            'id', 'document_type', 'file_url', 'original_filename',
            'file_size', 'uploaded_at', 'verified', 'verified_at',
            'verified_by', 'rejection_reason'
        ]
        read_only_fields = ['id', 'uploaded_at', 'verified', 'verified_at', 'verified_by']


class EmailVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailVerification
        fields = ['email', 'otp_code', 'purpose']
        extra_kwargs = {
            'otp_code': {'write_only': True}
        }


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6)
    purpose = serializers.CharField(max_length=50)


class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.CharField(max_length=50, default='password_reset')
    user_type = serializers.ChoiceField(choices=[('merchant', 'Merchant'), ('admin', 'Admin')], default='merchant')


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(min_length=8)
    user_type = serializers.ChoiceField(choices=[('merchant', 'Merchant'), ('admin', 'Admin')], default='merchant')


class BusinessCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessCategory
        fields = ['id', 'category_name', 'description']


class BusinessTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessType
        fields = ['id', 'business_type', 'business_category']


class MerchantLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Merchant
        fields = [
            'zipcode', 'province', 'city_municipality', 'barangay',
            'street_name', 'house_number', 'latitude', 'longitude'
        ]


# New serializers for multi-step registration
class MerchantRegistrationStep1Serializer(serializers.Serializer):
    """Step 1: General Information - stored in cache only"""
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    merchant_name = serializers.CharField(max_length=200)
    owner_name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=20)
    business_category = serializers.IntegerField()
    business_type = serializers.IntegerField()
    business_registration = serializers.IntegerField()
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
        return data
    
    def validate_username(self, value):
        if Merchant.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value
    
    def validate_email(self, value):
        if Merchant.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value
    
    def validate_business_category(self, value):
        if not BusinessCategory.objects.filter(id=value).exists():
            raise serializers.ValidationError("Invalid business category")
        return value
    
    def validate_business_type(self, value):
        if not BusinessType.objects.filter(id=value).exists():
            raise serializers.ValidationError("Invalid business type")
        return value


class MerchantRegistrationStep2Serializer(serializers.Serializer):
    """Step 2: Location Information - stored in cache only"""
    zipcode = serializers.CharField(max_length=10)
    province = serializers.CharField(max_length=100)
    city_municipality = serializers.CharField(max_length=100)
    barangay = serializers.CharField(max_length=100)
    street_name = serializers.CharField(max_length=200)
    house_number = serializers.CharField(max_length=50)
    latitude = serializers.DecimalField(max_digits=25, decimal_places=20, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=25, decimal_places=20, required=False, allow_null=True)


class MerchantRegistrationStep3Serializer(serializers.Serializer):
    """Step 3: Document Information - stored in cache only"""
    documents_info = serializers.JSONField(required=False, default=dict)
    
    def validate_documents_info(self, value):
        # Validate document structure
        if not isinstance(value, dict):
            raise serializers.ValidationError("Documents info must be a dictionary")
        return value


class MerchantRegistrationSessionSerializer(serializers.Serializer):
    """Session management for multi-step registration"""
    session_id = serializers.CharField(read_only=True)
    step = serializers.IntegerField(min_value=1, max_value=3)
    data = serializers.JSONField()
    
    def validate_step(self, value):
        if value not in [1, 2, 3]:
            raise serializers.ValidationError("Invalid step number")
        return value


class MerchantFinalRegistrationSerializer(serializers.Serializer):
    """Final registration serializer that creates the actual merchant"""
    session_id = serializers.CharField()
    otp_code = serializers.CharField(max_length=6)
    
    def validate_session_id(self, value):
        session = MerchantRegistrationSession(value)
        if session.is_expired():
            raise serializers.ValidationError("Registration session has expired")
        return value
    
    def create_merchant_from_session(self, session_id, validated_otp=False):
        """Create merchant from cached session data"""
        from django.utils import timezone
        import uuid
        
        session = MerchantRegistrationSession(session_id)
        form_data = session.get_all_form_data()
        
        if not form_data:
            raise serializers.ValidationError("No registration data found")
        
        # Create merchant instance
        merchant_data = {
            'username': form_data.get('username'),
            'email': form_data.get('email'),
            'merchant_name': form_data.get('merchant_name'),
            'owner_name': form_data.get('owner_name'),
            'phone': form_data.get('phone'),
            'business_category_id': form_data.get('business_category'),
            'business_type_id': form_data.get('business_type'),
            'business_registration': form_data.get('business_registration'),
            'zipcode': form_data.get('zipcode'),
            'province': form_data.get('province'),
            'city_municipality': form_data.get('city_municipality'),
            'barangay': form_data.get('barangay'),
            'street_name': form_data.get('street_name'),
            'house_number': form_data.get('house_number'),
            'latitude': form_data.get('latitude'),
            'longitude': form_data.get('longitude'),
            'documents_info': form_data.get('documents_info', {}),
            'status': 5 if validated_otp else 4,  # Pending if OTP verified, else Unverified
            'merchant_id': str(uuid.uuid4())
        }
        
        # Remove confirm_password if present
        merchant_data.pop('confirm_password', None)
        password = form_data.pop('password', None)
        
        merchant = Merchant(**merchant_data)
        if password:
            merchant.set_password(password)
        
        merchant.save()
        
        # Clear session after successful creation
        session.clear_session()
        
        return merchant
