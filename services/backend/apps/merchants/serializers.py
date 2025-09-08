from rest_framework import serializers
from .models import Merchant, MerchantDocument
from apps.webauth.models import Admin
from decimal import Decimal


class MerchantDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MerchantDocument
        fields = [
            'id', 'document_type', 'file_url', 'original_filename', 
            'file_size', 'uploaded_at', 'verified', 'verified_at', 
            'verified_by', 'rejection_reason'
        ]
        read_only_fields = ['id', 'uploaded_at']


class MerchantListSerializer(serializers.ModelSerializer):
    status_display = serializers.SerializerMethodField()
    document_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Merchant
        fields = [
            'id', 'username', 'email', 'merchant_name', 'owner_name', 
            'phone', 'status', 'status_display', 'business_registration',
            'date_joined', 'verified_at', 'verified_by', 'document_count',
            'province', 'city_municipality'
        ]
        read_only_fields = ['id', 'date_joined']
    
    def get_status_display(self, obj):
        status_choices = {
            0: 'Active',
            1: 'Banned', 
            2: 'Frozen',
            3: 'Deleted',
            4: 'Unverified',
            5: 'Pending',
            6: 'Rejected'
        }
        return status_choices.get(obj.status, 'Unknown')
    
    def get_document_count(self, obj):
        return obj.merchant_documents.count()


class MerchantDetailSerializer(serializers.ModelSerializer):
    status_display = serializers.SerializerMethodField()
    documents = MerchantDocumentSerializer(source='merchant_documents', many=True, read_only=True)
    business_category_name = serializers.CharField(source='business_category.mcc', read_only=True)
    business_type_name = serializers.CharField(source='business_type.business_type', read_only=True)
    verified_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Merchant
        fields = [
            'id', 'username', 'email', 'merchant_name', 'owner_name',
            'merchant_host_id', 'status', 'status_display', 'business_registration',
            'business_category', 'business_category_name', 'business_type', 'business_type_name',
            'phone', 'zipcode', 'province', 'city_municipality', 'barangay',
            'street_name', 'house_number', 'latitude', 'longitude',
            'settlement_emails', 'withdrawal_option', 'profile_picture',
            'documents', 'documents_info', 'additional_info',
            'date_joined', 'verified_at', 'verified_by', 'verified_by_name',
            'merchant_id'
        ]
        read_only_fields = ['id', 'date_joined', 'verified_at', 'verified_by']
    
    def get_status_display(self, obj):
        status_choices = {
            0: 'Active',
            1: 'Banned', 
            2: 'Frozen',
            3: 'Deleted',
            4: 'Unverified',
            5: 'Pending',
            6: 'Rejected'
        }
        return status_choices.get(obj.status, 'Unknown')
    
    def get_verified_by_name(self, obj):
        if obj.verified_by:
            try:
                admin = Admin.objects.get(id=obj.verified_by)
                return f"{admin.first_name} {admin.last_name}"
            except Admin.DoesNotExist:
                return "Unknown Admin"
        return None


class MerchantUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Merchant
        fields = [
            'merchant_name', 'owner_name', 'phone', 'zipcode', 'province',
            'city_municipality', 'barangay', 'street_name', 'house_number',
            'latitude', 'longitude', 'settlement_emails', 'withdrawal_option',
            'business_category', 'business_type', 'business_registration',
            'additional_info'
        ]
    
    def validate_latitude(self, value):
        if value is not None and (value < -90 or value > 90):
            raise serializers.ValidationError("Latitude must be between -90 and 90 degrees.")
        return value
    
    def validate_longitude(self, value):
        if value is not None and (value < -180 or value > 180):
            raise serializers.ValidationError("Longitude must be between -180 and 180 degrees.")
        return value


class MerchantStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[
        (0, 'Active'),
        (1, 'Banned'), 
        (2, 'Frozen'),
        (3, 'Deleted'),
        (4, 'Unverified'),
        (5, 'Pending'),
        (6, 'Rejected')
    ])
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)


class MerchantBatchActionSerializer(serializers.Serializer):
    merchant_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False
    )
    action = serializers.ChoiceField(choices=[
        ('approve', 'Approve'),
        ('reject', 'Reject'),
        ('ban', 'Ban'),
        ('freeze', 'Freeze'),
        ('delete', 'Delete'),
        ('activate', 'Activate')
    ])
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)


class MerchantCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = Merchant
        fields = [
            'username', 'email', 'password', 'confirm_password',
            'merchant_name', 'owner_name', 'phone', 'zipcode', 'province',
            'city_municipality', 'barangay', 'street_name', 'house_number',
            'latitude', 'longitude', 'business_category', 'business_type',
            'business_registration', 'settlement_emails', 'withdrawal_option'
        ]
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords don't match.")
        return data
    
    def validate_email(self, value):
        if Merchant.objects.filter(email=value).exists():
            raise serializers.ValidationError("A merchant with this email already exists.")
        return value
    
    def validate_username(self, value):
        if Merchant.objects.filter(username=value).exists():
            raise serializers.ValidationError("A merchant with this username already exists.")
        return value
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        merchant = Merchant.objects.create(**validated_data)
        merchant.set_password(password)
        merchant.save()
        return merchant
