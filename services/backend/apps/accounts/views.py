# Example  

# from rest_framework import viewsets, permissions
# from .models import User
# from .serializers import UserSerializer

# class IsAdminOrSuperadmin(permissions.BasePermission):
#     def has_permission(self, request, view):
#         return request.user.is_authenticated and request.user.role in ('ADMIN','SUPERADMIN')

# class AdminUserViewSet(viewsets.ModelViewSet):
#     queryset = User.objects.all()
#     serializer_class = UserSerializer
#     permission_classes = [IsAdminOrSuperadmin]
