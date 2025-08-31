from django.urls import path
from .views import (
    AdminLoginView, MerchantLoginView, LogoutView,
    MerchantSignupView, VerifyOTPView, ResendOTPView,
    ForgotPasswordView, VerifyPasswordResetOTPView, ResetPasswordView, 
    UpdateMerchantLocationView, UploadDocumentView, BusinessCategoryListView, BusinessTypeListView,
    CheckUsernameView, CheckEmailView, MerchantRegistrationStepView, 
    MerchantFinalRegistrationView, MerchantRegistrationSessionStatusView, MerchantTokenVerificationView
)

urlpatterns = [
    # Authentication
    path('auth/admin/login/', AdminLoginView.as_view(), name='admin-login'),
    path('auth/merchant/login/', MerchantLoginView.as_view(), name='merchant-login'),
    path('auth/merchant/verify-token/', MerchantTokenVerificationView.as_view(), name='merchant-verify-token'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    
    # Legacy Merchant Registration (kept for backward compatibility)
    path('auth/merchant/signup/', MerchantSignupView.as_view(), name='merchant-signup'),
    path('auth/merchant/verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('auth/merchant/resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    
    # New Multi-Step Merchant Registration
    path('auth/merchant/registration/step/', MerchantRegistrationStepView.as_view(), name='merchant-registration-step'),
    path('auth/merchant/registration/complete/', MerchantFinalRegistrationView.as_view(), name='merchant-final-registration'),
    path('auth/merchant/registration/status/', MerchantRegistrationSessionStatusView.as_view(), name='merchant-registration-status'),
    
    # Password Reset
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('auth/verify-otp/', VerifyPasswordResetOTPView.as_view(), name='verify-password-reset-otp'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    
    # Merchant Updates
    path('auth/merchant/update-location/', UpdateMerchantLocationView.as_view(), name='update-location'),
    path('auth/merchant/upload-documents/', UploadDocumentView.as_view(), name='upload-documents'),
    
    # Reference Data
    path('data/business-categories/', BusinessCategoryListView.as_view(), name='business-category-list'),
    path('data/business-types/', BusinessTypeListView.as_view(), name='business-type-list'),
    
    # Validation
    path('check/username/', CheckUsernameView.as_view(), name='check-username'),
    path('check/email/', CheckEmailView.as_view(), name='check-email'),
]
