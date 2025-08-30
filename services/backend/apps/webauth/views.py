from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
import random
import string
from datetime import datetime, timedelta
from django.core.mail import send_mail
import uuid

from .serializers import (
    LoginSerializer, AdminSerializer, MerchantSerializer, MerchantSignupSerializer,
    SendOTPSerializer, VerifyOTPSerializer, PasswordResetSerializer, MerchantLocationSerializer
)
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


def generate_otp():
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))


def send_otp_email(email, otp, purpose='verification'):
    """Send OTP via email"""
    try:
        if purpose == 'password_reset':
            subject = 'Rapex Password Reset Code'
            message = f'''Your password reset code is: {otp}

This code will expire in 30 minutes.

If you did not request this password reset, please ignore this email.

Best regards,
Rapex Team'''
        else:
            subject = f'Rapex {purpose.title()} Code'
            message = f'''Your {purpose} code is: {otp}

This code will expire in 30 minutes.

Best regards,
Rapex Team'''
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False


class MerchantSignupView(APIView):
    def post(self, request):
        serializer = MerchantSignupSerializer(data=request.data)
        if serializer.is_valid():
            # Generate OTP
            otp = generate_otp()
            otp_expires_at = timezone.now() + timedelta(minutes=30)
            
            # Create merchant
            merchant = serializer.save(
                otp_code=otp,
                otp_expires_at=otp_expires_at,
                merchant_id=str(uuid.uuid4())
            )
            
            # Send OTP email
            if send_otp_email(merchant.email, otp, 'verification'):
                return Response({
                    'merchant_id': merchant.merchant_id,
                    'message': 'Merchant registration successful. Please check your email for verification code.'
                }, status=status.HTTP_201_CREATED)
            else:
                # Delete merchant if email fails
                merchant.delete()
                return Response({
                    'detail': 'Failed to send verification email. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyOTPView(APIView):
    def post(self, request):
        merchant_id = request.data.get('merchant_id')
        otp_code = request.data.get('otp_code')
        
        if not merchant_id or not otp_code:
            return Response({
                'detail': 'Merchant ID and OTP code are required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            merchant = Merchant.objects.get(merchant_id=merchant_id)
        except Merchant.DoesNotExist:
            return Response({
                'detail': 'Invalid merchant ID.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if OTP is valid and not expired
        if merchant.otp_code != otp_code:
            return Response({
                'detail': 'Invalid OTP code.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if timezone.now() > merchant.otp_expires_at:
            return Response({
                'detail': 'OTP code has expired.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify merchant
        merchant.is_verified = True
        merchant.otp_code = None
        merchant.otp_expires_at = None
        merchant.save()
        
        # Generate tokens
        tokens = get_tokens_for_user(merchant)
        data = MerchantSerializer(merchant).data
        data.update(tokens)
        
        return Response({
            'message': 'Email verified successfully.',
            'merchant': data
        }, status=status.HTTP_200_OK)


class ResendOTPView(APIView):
    def post(self, request):
        merchant_id = request.data.get('merchant_id')
        
        if not merchant_id:
            return Response({
                'detail': 'Merchant ID is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            merchant = Merchant.objects.get(merchant_id=merchant_id)
        except Merchant.DoesNotExist:
            return Response({
                'detail': 'Invalid merchant ID.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if merchant.is_verified:
            return Response({
                'detail': 'Merchant is already verified.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate new OTP
        otp = generate_otp()
        otp_expires_at = timezone.now() + timedelta(minutes=30)
        
        merchant.otp_code = otp
        merchant.otp_expires_at = otp_expires_at
        merchant.save()
        
        # Send OTP email
        if send_otp_email(merchant.email, otp, 'verification'):
            return Response({
                'message': 'New verification code sent to your email.'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'detail': 'Failed to send verification email. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ForgotPasswordView(APIView):
    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user_type = serializer.validated_data.get('user_type', 'merchant')
            
            # Find user
            if user_type == 'admin':
                try:
                    user = Admin.objects.get(email=email)
                except Admin.DoesNotExist:
                    return Response({
                        'detail': 'No admin found with this email address.'
                    }, status=status.HTTP_404_NOT_FOUND)
            else:
                try:
                    user = Merchant.objects.get(email=email)
                except Merchant.DoesNotExist:
                    return Response({
                        'detail': 'No merchant found with this email address.'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # Generate OTP
            otp = generate_otp()
            otp_expires_at = timezone.now() + timedelta(minutes=30)
            
            user.otp_code = otp
            user.otp_expires_at = otp_expires_at
            user.save()
            
            # Send OTP email
            if send_otp_email(email, otp, 'password reset'):
                return Response({
                    'message': 'Password reset code sent to your email.',
                    'user_id': user.pk
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'detail': 'Failed to send reset email. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyPasswordResetOTPView(APIView):
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp_code = serializer.validated_data['otp_code']
            purpose = serializer.validated_data.get('purpose', 'password_reset')
            
            # Determine user type based on email domain or explicit parameter
            user_type = request.data.get('user_type', 'merchant')
            
            # Find user by email
            if user_type == 'admin':
                try:
                    user = Admin.objects.get(email=email)
                except Admin.DoesNotExist:
                    return Response({
                        'detail': 'No admin found with this email address.'
                    }, status=status.HTTP_404_NOT_FOUND)
            else:
                try:
                    user = Merchant.objects.get(email=email)
                except Merchant.DoesNotExist:
                    return Response({
                        'detail': 'No merchant found with this email address.'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # Verify OTP
            if not user.otp_code or user.otp_code != otp_code:
                return Response({
                    'detail': 'Invalid OTP code.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not user.otp_expires_at or timezone.now() > user.otp_expires_at:
                return Response({
                    'detail': 'OTP code has expired.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'message': 'OTP verified successfully.',
                'email': email
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResetPasswordView(APIView):
    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp_code = serializer.validated_data['otp_code']
            new_password = serializer.validated_data['new_password']
            user_type = serializer.validated_data.get('user_type', 'merchant')
            
            # Find user by email
            if user_type == 'admin':
                try:
                    user = Admin.objects.get(email=email)
                except Admin.DoesNotExist:
                    return Response({
                        'detail': 'No admin found with this email address.'
                    }, status=status.HTTP_404_NOT_FOUND)
            else:
                try:
                    user = Merchant.objects.get(email=email)
                except Merchant.DoesNotExist:
                    return Response({
                        'detail': 'No merchant found with this email address.'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # Verify OTP
            if not user.otp_code or user.otp_code != otp_code:
                return Response({
                    'detail': 'Invalid OTP code.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not user.otp_expires_at or timezone.now() > user.otp_expires_at:
                return Response({
                    'detail': 'OTP code has expired.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Reset password
            user.set_password(new_password)
            user.otp_code = None
            user.otp_expires_at = None
            user.save()
            
            return Response({
                'message': 'Password reset successfully.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UpdateMerchantLocationView(APIView):
    def post(self, request):
        merchant_id = request.data.get('merchant_id')
        
        if not merchant_id:
            return Response({
                'detail': 'Merchant ID is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            merchant = Merchant.objects.get(merchant_id=merchant_id)
        except Merchant.DoesNotExist:
            return Response({
                'detail': 'Invalid merchant ID.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = MerchantLocationSerializer(merchant, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Location updated successfully.',
                'merchant': MerchantSerializer(merchant).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UploadDocumentView(APIView):
    def post(self, request):
        merchant_id = request.data.get('merchant_id')
        
        if not merchant_id:
            return Response({
                'detail': 'Merchant ID is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            merchant = Merchant.objects.get(merchant_id=merchant_id)
        except Merchant.DoesNotExist:
            return Response({
                'detail': 'Invalid merchant ID.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Handle file uploads
        uploaded_files = []
        for key, file in request.FILES.items():
            # Save file (you might want to add validation here)
            # For now, we'll just update the merchant status
            uploaded_files.append(key)
        
        if uploaded_files:
            merchant.status = 'pending'  # Update status to pending review
            merchant.save()
            
            return Response({
                'message': f'Documents uploaded successfully: {", ".join(uploaded_files)}',
                'merchant': MerchantSerializer(merchant).data
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'detail': 'No files uploaded.'
            }, status=status.HTTP_400_BAD_REQUEST)
