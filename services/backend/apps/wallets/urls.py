from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MerchantWalletViewSet, MerchantWalletTransactionViewSet, MerchantPaymentMethodViewSet

router = DefaultRouter()
router.register(r'wallets', MerchantWalletViewSet)
router.register(r'transactions', MerchantWalletTransactionViewSet)
router.register(r'payment-methods', MerchantPaymentMethodViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
