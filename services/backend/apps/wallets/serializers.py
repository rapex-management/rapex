from rest_framework import serializers
from decimal import Decimal
from .models import MerchantWallet, MerchantWalletTransaction, MerchantPaymentMethod


class MerchantWalletSerializer(serializers.ModelSerializer):
    merchant_name = serializers.CharField(source='merchant.merchant_name', read_only=True)
    merchant_id = serializers.UUIDField(source='merchant.id', read_only=True)
    
    class Meta:
        model = MerchantWallet
        fields = [
            'wallet_id', 'merchant_id', 'merchant_name', 'balance', 
            'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['wallet_id', 'created_at', 'updated_at']


class MerchantWalletTransactionSerializer(serializers.ModelSerializer):
    wallet_merchant_name = serializers.CharField(source='wallet.merchant.merchant_name', read_only=True)
    
    class Meta:
        model = MerchantWalletTransaction
        fields = [
            'transaction_id', 'wallet', 'wallet_merchant_name', 'amount', 
            'transaction_type', 'transaction_status', 'description', 
            'reference_id', 'related_order_id', 'processed_by', 
            'timestamp', 'updated_at'
        ]
        read_only_fields = ['transaction_id', 'timestamp', 'updated_at']


class MerchantPaymentMethodSerializer(serializers.ModelSerializer):
    # Mask sensitive payment details in responses
    masked_payment_details = serializers.SerializerMethodField()
    
    class Meta:
        model = MerchantPaymentMethod
        fields = [
            'payment_method_id', 'wallet', 'payment_method_type', 
            'masked_payment_details', 'display_name', 'status', 
            'is_verified', 'verified_at', 'is_default', 
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'payment_method_id', 'is_verified', 'verified_at', 
            'created_at', 'updated_at'
        ]
    
    def get_masked_payment_details(self, obj):
        """Return masked version of payment details for security"""
        details = obj.payment_details.copy() if obj.payment_details else {}
        
        # Mask sensitive information
        if 'account_number' in details:
            account = details['account_number']
            if len(account) > 4:
                details['account_number'] = '*' * (len(account) - 4) + account[-4:]
        
        if 'card_number' in details:
            card = details['card_number']
            if len(card) > 4:
                details['card_number'] = '*' * (len(card) - 4) + card[-4:]
        
        if 'phone_number' in details:
            phone = details['phone_number']
            if len(phone) > 4:
                details['phone_number'] = phone[:2] + '*' * (len(phone) - 6) + phone[-4:]
        
        return details


class WalletTransactionCreateSerializer(serializers.Serializer):
    """Serializer for creating wallet transactions securely"""
    wallet_id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=18, decimal_places=2)
    transaction_type = serializers.ChoiceField(choices=[
        'deposit', 'withdrawal', 'refund', 'commission', 
        'penalty', 'transfer_in', 'transfer_out', 'adjustment'
    ])
    description = serializers.CharField(required=False, allow_blank=True)
    reference_id = serializers.CharField(required=False, allow_blank=True, max_length=100)
    related_order_id = serializers.UUIDField(required=False, allow_null=True)
    
    def validate_amount(self, value):
        """Validate transaction amount based on type"""
        transaction_type = self.initial_data.get('transaction_type')
        
        if transaction_type in ['deposit', 'refund', 'transfer_in', 'commission']:
            if value <= 0:
                raise serializers.ValidationError(
                    f"Amount must be positive for {transaction_type} transactions"
                )
        elif transaction_type in ['withdrawal', 'penalty', 'transfer_out']:
            if value >= 0:
                raise serializers.ValidationError(
                    f"Amount must be negative for {transaction_type} transactions"
                )
        
        return value


class PaymentMethodCreateSerializer(serializers.ModelSerializer):
    """Secure serializer for creating payment methods"""
    
    class Meta:
        model = MerchantPaymentMethod
        fields = [
            'wallet', 'payment_method_type', 'payment_details', 
            'display_name', 'is_default'
        ]
    
    def validate_payment_details(self, value):
        """Validate payment details structure based on payment method type"""
        payment_type = self.initial_data.get('payment_method_type')
        
        required_fields = {
            'bank_account': ['bank_name', 'account_number', 'account_holder_name'],
            'gcash': ['phone_number'],
            'paymaya': ['phone_number'],
            'paypal': ['email'],
            'credit_card': ['card_token'],  # Should be tokenized
            'debit_card': ['card_token'],   # Should be tokenized
        }
        
        if payment_type in required_fields:
            missing_fields = []
            for field in required_fields[payment_type]:
                if field not in value or not value[field]:
                    missing_fields.append(field)
            
            if missing_fields:
                raise serializers.ValidationError(
                    f"Missing required fields for {payment_type}: {', '.join(missing_fields)}"
                )
        
        return value