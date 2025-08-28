from django.urls import path
from .views import AdminLoginView, MerchantLoginView, LogoutView

urlpatterns = [
    path('auth/admin/login/', AdminLoginView.as_view(), name='admin-login'),
    path('auth/merchant/login/', MerchantLoginView.as_view(), name='merchant-login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
]
