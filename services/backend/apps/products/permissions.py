from rest_framework.permissions import BasePermission, IsAuthenticated
from apps.merchants.models import Merchant


class IsMerchant(BasePermission):
    """
    Permission class to check if user is a merchant
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            isinstance(request.user, Merchant) and
            request.user.status == 0  # Active status
        )


class IsProductOwner(BasePermission):
    """
    Permission class to check if merchant owns the product
    """
    
    def has_object_permission(self, request, view, obj):
        # Check if the user is a merchant and owns the product
        return (
            isinstance(request.user, Merchant) and
            hasattr(obj, 'merchant') and
            obj.merchant == request.user
        )


class IsShopOwner(BasePermission):
    """
    Permission class to check if merchant owns the shop
    """
    
    def has_object_permission(self, request, view, obj):
        return (
            isinstance(request.user, Merchant) and
            obj.merchant == request.user
        )
