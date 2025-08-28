from django.urls import path
from .views import AdminLoginView, MerchantLoginView, LogoutView
from .merchant_signup import merchant_signup, verify_otp

urlpatterns = [
    path('auth/admin/login/', AdminLoginView.as_view(), name='admin-login'),
    path('auth/merchant/login/', MerchantLoginView.as_view(), name='merchant-login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/merchant/signup/', merchant_signup, name='merchant-signup'),
    path('auth/merchant/verify-otp/', verify_otp, name='verify-otp'),
]
