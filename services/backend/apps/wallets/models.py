import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from apps.merchants.models import Merchant


class MerchantWallet(models.Model):
    """
    Merchant Wallet Table - stores wallet information specific to merchants
    """
    wallet_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    merchant = models.OneToOneField(
        Merchant, 
        on_delete=models.CASCADE, 
        related_name='wallet',
        db_column='merchant_id'
    )
    balance = models.DecimalField(
        max_digits=18, 
        decimal_places=2, 
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('suspended', 'Suspended'),
        ('frozen', 'Frozen'),
        ('closed', 'Closed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'wallets'
        db_table = 'merchant_wallets'
        indexes = [
            models.Index(fields=['merchant'], name='idx_wallet_merchant'),
            models.Index(fields=['status'], name='idx_wallet_status'),
            models.Index(fields=['created_at'], name='idx_wallet_created'),
        ]
    
    def __str__(self):
        return f"Wallet for {self.merchant.merchant_name} - Balance: {self.balance}"
    
    def save(self, *args, **kwargs):
        # Additional validation to ensure balance is never negative
        if self.balance < 0:
            raise ValueError("Wallet balance cannot be negative")
        super().save(*args, **kwargs)


class MerchantWalletTransaction(models.Model):
    """
    Merchant Wallet Transaction Table - logs every transaction performed on merchant wallets
    """
    transaction_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(
        MerchantWallet, 
        on_delete=models.CASCADE, 
        related_name='transactions',
        db_column='wallet_id'
    )
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    
    TRANSACTION_TYPE_CHOICES = [
        ('deposit', 'Deposit'),
        ('withdrawal', 'Withdrawal'),
        ('refund', 'Refund'),
        ('commission', 'Commission'),
        ('penalty', 'Penalty'),
        ('transfer_in', 'Transfer In'),
        ('transfer_out', 'Transfer Out'),
        ('adjustment', 'Balance Adjustment'),
    ]
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    
    TRANSACTION_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('reversed', 'Reversed'),
    ]
    transaction_status = models.CharField(max_length=20, choices=TRANSACTION_STATUS_CHOICES, default='pending')
    
    description = models.TextField(blank=True, null=True)
    
    # Additional metadata
    reference_id = models.CharField(max_length=100, blank=True, null=True)  # External reference
    related_order_id = models.UUIDField(blank=True, null=True)  # Link to order if applicable
    processed_by = models.UUIDField(blank=True, null=True)  # Admin who processed (if manual)
    
    timestamp = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'wallets'
        db_table = 'merchant_wallet_transactions'
        indexes = [
            models.Index(fields=['wallet'], name='idx_wtxn_wallet'),
            models.Index(fields=['transaction_type'], name='idx_wtxn_type'),
            models.Index(fields=['transaction_status'], name='idx_wtxn_status'),
            models.Index(fields=['timestamp'], name='idx_wtxn_timestamp'),
            models.Index(fields=['reference_id'], name='idx_wtxn_ref'),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"Transaction {self.transaction_type} - {self.amount} for {self.wallet.merchant.merchant_name}"


class MerchantPaymentMethod(models.Model):
    """
    Merchant Payment Method Table - stores payment methods linked to merchant wallets
    """
    payment_method_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(
        MerchantWallet, 
        on_delete=models.CASCADE, 
        related_name='payment_methods',
        db_column='wallet_id'
    )
    
    PAYMENT_METHOD_TYPE_CHOICES = [
        ('bank_account', 'Bank Account'),
        ('credit_card', 'Credit Card'),
        ('debit_card', 'Debit Card'),
        ('e_wallet', 'E-Wallet'),
        ('gcash', 'GCash'),
        ('paymaya', 'PayMaya'),
        ('paypal', 'PayPal'),
        ('crypto', 'Cryptocurrency'),
    ]
    payment_method_type = models.CharField(max_length=20, choices=PAYMENT_METHOD_TYPE_CHOICES)
    
    # JSONB field to store tokenized/encrypted payment information securely
    payment_details = models.JSONField(
        help_text="Tokenized or encrypted payment information (bank details, card tokens, etc.)"
    )
    
    # Display name for the payment method (e.g., "BDO ****1234", "GCash - 09xx xxx xxxx")
    display_name = models.CharField(max_length=100, blank=True)
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('expired', 'Expired'),
        ('blocked', 'Blocked'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # For verification purposes
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(blank=True, null=True)
    
    # Default payment method flag
    is_default = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'wallets'
        db_table = 'merchant_payment_methods'
        indexes = [
            models.Index(fields=['wallet'], name='idx_payment_wallet'),
            models.Index(fields=['payment_method_type'], name='idx_payment_type'),
            models.Index(fields=['status'], name='idx_payment_status'),
            models.Index(fields=['is_default'], name='idx_payment_default'),
        ]
    
    def __str__(self):
        return f"{self.get_payment_method_type_display()} for {self.wallet.merchant.merchant_name}"
    
    def save(self, *args, **kwargs):
        # Ensure only one default payment method per wallet
        if self.is_default:
            MerchantPaymentMethod.objects.filter(
                wallet=self.wallet, 
                is_default=True
            ).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)
