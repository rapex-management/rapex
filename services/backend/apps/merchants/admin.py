from django.contrib import admin
from apps.webauth.models import Merchant, MerchantDocument


@admin.register(Merchant)
class MerchantAdmin(admin.ModelAdmin):
    list_display = [
        'merchant_name', 'owner_name', 'email', 'phone', 'status', 
        'business_registration', 'province', 'city_municipality', 'date_joined'
    ]
    list_filter = [
        'status', 'business_registration', 'province', 'business_category', 
        'business_type', 'date_joined'
    ]
    search_fields = [
        'merchant_name', 'owner_name', 'email', 'username', 'phone', 
        'province', 'city_municipality'
    ]
    readonly_fields = [
        'id', 'merchant_id', 'date_joined', 'verified_at', 'verified_by',
        'last_login'
    ]
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'merchant_id', 'username', 'email', 'merchant_name', 'owner_name')
        }),
        ('Contact & Location', {
            'fields': ('phone', 'province', 'city_municipality', 'barangay', 
                      'street_name', 'house_number', 'zipcode', 'latitude', 'longitude')
        }),
        ('Business Information', {
            'fields': ('business_category', 'business_type', 'business_registration')
        }),
        ('Status & Verification', {
            'fields': ('status', 'verified_at', 'verified_by', 'date_joined', 'last_login')
        }),
        ('Additional Information', {
            'fields': ('settlement_emails', 'withdrawal_option', 'profile_picture', 
                      'documents_info', 'additional_info'),
            'classes': ('collapse',)
        })
    )
    ordering = ['-date_joined']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('business_category', 'business_type')


@admin.register(MerchantDocument)
class MerchantDocumentAdmin(admin.ModelAdmin):
    list_display = [
        'merchant', 'document_type', 'original_filename', 'verified', 
        'uploaded_at', 'verified_by'
    ]
    list_filter = ['document_type', 'verified', 'uploaded_at']
    search_fields = ['merchant__merchant_name', 'merchant__email', 'original_filename']
    readonly_fields = ['id', 'uploaded_at', 'file_size']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('merchant', 'verified_by')
