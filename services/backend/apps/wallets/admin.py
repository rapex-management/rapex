from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import MerchantWallet, MerchantWalletTransaction, MerchantPaymentMethod


@admin.register(MerchantWallet)
class MerchantWalletAdmin(admin.ModelAdmin):
    list_display = ['wallet_id', 'merchant_name', 'balance', 'status', 'created_at', 'updated_at']
    list_filter = ['status', 'created_at']
    search_fields = ['merchant__merchant_name', 'merchant__owner_name', 'wallet_id']
    readonly_fields = ['wallet_id', 'created_at', 'updated_at']
    
    def merchant_name(self, obj):
        return obj.merchant.merchant_name
    merchant_name.short_description = 'Merchant Name'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('merchant')


@admin.register(MerchantWalletTransaction)
class MerchantWalletTransactionAdmin(admin.ModelAdmin):
    list_display = [
        'transaction_id', 'wallet_merchant', 'amount', 'transaction_type', 
        'transaction_status', 'timestamp', 'reference_id'
    ]
    list_filter = ['transaction_type', 'transaction_status', 'timestamp']
    search_fields = [
        'transaction_id', 'wallet__merchant__merchant_name', 
        'reference_id', 'description'
    ]
    readonly_fields = ['transaction_id', 'timestamp', 'updated_at']
    date_hierarchy = 'timestamp'
    
    def wallet_merchant(self, obj):
        return obj.wallet.merchant.merchant_name
    wallet_merchant.short_description = 'Merchant'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('wallet__merchant')


@admin.register(MerchantPaymentMethod)
class MerchantPaymentMethodAdmin(admin.ModelAdmin):
    list_display = [
        'payment_method_id', 'wallet_merchant', 'payment_method_type', 
        'display_name', 'status', 'is_verified', 'is_default', 'created_at'
    ]
    list_filter = ['payment_method_type', 'status', 'is_verified', 'is_default']
    search_fields = [
        'payment_method_id', 'wallet__merchant__merchant_name', 
        'display_name'
    ]
    readonly_fields = ['payment_method_id', 'created_at', 'updated_at', 'verified_at']
    
    def wallet_merchant(self, obj):
        return obj.wallet.merchant.merchant_name
    wallet_merchant.short_description = 'Merchant'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('wallet__merchant')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('payment_method_id', 'wallet', 'payment_method_type', 'display_name')
        }),
        ('Payment Details', {
            'fields': ('payment_details',),
            'classes': ('collapse',)
        }),
        ('Status & Verification', {
            'fields': ('status', 'is_verified', 'verified_at', 'is_default')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
