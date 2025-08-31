from rest_framework.permissions import BasePermission
from apps.webauth.models import Admin


class IsAdminUser(BasePermission):
    """
    Permission class to check if user is an admin
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user is an Admin instance
        try:
            admin = Admin.objects.get(id=request.user.id)
            return admin.status == 0  # Active status
        except Admin.DoesNotExist:
            return False
    
    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class IsSuperAdminUser(BasePermission):
    """
    Permission class to check if user is a super admin
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        try:
            admin = Admin.objects.get(id=request.user.id)
            return admin.status == 0 and admin.is_superuser
        except Admin.DoesNotExist:
            return False
    
    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
