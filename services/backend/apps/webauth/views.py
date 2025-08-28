from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer, AdminSerializer, MerchantSerializer
from .models import Admin, Merchant


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class AdminLoginView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data['identifier']
        password = serializer.validated_data['password']
        
        # Try to find admin by username or email
        try:
            admin = Admin.objects.get(Q(username=identifier) | Q(email=identifier))
        except Admin.DoesNotExist:
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        
        if not admin.check_password(password):
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Update last login
        admin.last_login = timezone.now()
        admin.save()
        
        tokens = get_tokens_for_user(admin)
        data = AdminSerializer(admin).data
        data.update(tokens)
        return Response(data)


class MerchantLoginView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data['identifier']
        password = serializer.validated_data['password']
        
        # Try to find merchant by username or email
        try:
            merchant = Merchant.objects.get(Q(username=identifier) | Q(email=identifier))
        except Merchant.DoesNotExist:
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        
        if not merchant.check_password(password):
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        
        # Update last login
        merchant.last_login = timezone.now()
        merchant.save()
        
        tokens = get_tokens_for_user(merchant)
        data = MerchantSerializer(merchant).data
        data.update(tokens)
        return Response(data)


class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'detail': 'Successfully logged out'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'detail': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)
