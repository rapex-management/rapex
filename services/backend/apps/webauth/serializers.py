from rest_framework import serializers
from .models import Admin, Merchant, MerchantDocument, EmailVerification


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
        fields = ['id', 'username', 'email', 'merchant_name', 'owner_name', 'mcc', 'status', 'phone']


class MerchantSignupSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = Merchant
        fields = [
            'username', 'email', 'password', 'confirm_password',
            'merchant_name', 'owner_name', 'phone', 'mcc',
            'zipcode', 'province', 'city_municipality', 'barangay',
            'street_name', 'house_number', 'latitude', 'longitude',
            'settlement_emails', 'withdrawal_option'
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
