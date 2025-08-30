from django.urls import path
from .views import (
    AdminLoginView, MerchantLoginView, LogoutView,
    MerchantSignupView, VerifyOTPView, ResendOTPView,
    ForgotPasswordView, VerifyPasswordResetOTPView, ResetPasswordView, 
    UpdateMerchantLocationView, UploadDocumentView
)

urlpatterns = [
    # Authentication
    path('auth/admin/login/', AdminLoginView.as_view(), name='admin-login'),
    path('auth/merchant/login/', MerchantLoginView.as_view(), name='merchant-login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    
    # Merchant Registration
    path('auth/merchant/signup/', MerchantSignupView.as_view(), name='merchant-signup'),
    path('auth/merchant/verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('auth/merchant/resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    
    # Password Reset
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('auth/verify-otp/', VerifyPasswordResetOTPView.as_view(), name='verify-password-reset-otp'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    
    # Merchant Updates
    path('auth/merchant/update-location/', UpdateMerchantLocationView.as_view(), name='update-location'),
    path('auth/merchant/upload-documents/', UploadDocumentView.as_view(), name='upload-documents'),
]
