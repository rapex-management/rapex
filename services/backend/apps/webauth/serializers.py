from rest_framework import serializers
from .models import Admin, Merchant


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
