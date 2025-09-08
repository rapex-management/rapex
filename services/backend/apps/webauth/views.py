from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
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
    SendOTPSerializer, VerifyOTPSerializer, PasswordResetSerializer, MerchantLocationSerializer,
    BusinessCategorySerializer, BusinessTypeSerializer, MerchantRegistrationStep1Serializer,
    MerchantRegistrationStep2Serializer, MerchantRegistrationStep3Serializer,
    MerchantRegistrationSessionSerializer, MerchantFinalRegistrationSerializer
)
from .models import Admin, EmailVerification
from apps.merchants.models import Merchant, BusinessCategory, BusinessType, MerchantRegistrationSession
from .authentication import get_tokens_for_user


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
        
        # Check merchant status before allowing login
        if merchant.status == 4:  # Unverified
            return Response({
                'detail': 'Account pending approval',
                'status_code': 'PENDING_APPROVAL',
                'message': 'Your account is currently under review. Please wait for admin approval.',
                'redirect_to': '/merchant/pending-approval'
            }, status=status.HTTP_403_FORBIDDEN)
        elif merchant.status == 5:  # Pending
            return Response({
                'detail': 'Account pending approval',
                'status_code': 'PENDING_APPROVAL',
                'message': 'Your application is under review by our team. Please wait for admin approval.',
                'redirect_to': '/merchant/pending-approval'
            }, status=status.HTTP_403_FORBIDDEN)
        elif merchant.status == 1:  # Banned
            return Response({
                'detail': 'Account suspended',
                'status_code': 'ACCOUNT_BANNED',
                'message': 'Your account has been suspended. Please contact support for assistance.'
            }, status=status.HTTP_403_FORBIDDEN)
        elif merchant.status == 2:  # Frozen
            return Response({
                'detail': 'Account temporarily frozen',
                'status_code': 'ACCOUNT_FROZEN',
                'message': 'Your account is temporarily frozen. Please contact support for assistance.'
            }, status=status.HTTP_403_FORBIDDEN)
        elif merchant.status == 3:  # Deleted
            return Response({
                'detail': 'Account not found',
                'status_code': 'ACCOUNT_DELETED',
                'message': 'This account is no longer active.'
            }, status=status.HTTP_404_NOT_FOUND)
        elif merchant.status != 0:  # Not Active
            return Response({
                'detail': 'Account not accessible',
                'status_code': 'ACCOUNT_INACTIVE',
                'message': 'Your account is not currently accessible. Please contact support.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Update last login for active merchants only
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


class BusinessCategoryListView(APIView):
    """
    API endpoint to get all business categories
    """
    def get(self, request):
        try:
            business_categories = BusinessCategory.objects.all().order_by('category_name')
            serializer = BusinessCategorySerializer(business_categories, many=True)
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'success': False,
                'detail': 'Failed to fetch business categories.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BusinessTypeListView(APIView):
    """
    API endpoint to get business types, optionally filtered by business category
    """
    def get(self, request):
        try:
            business_category_id = request.query_params.get('business_category_id')
            
            if business_category_id:
                # Filter business types by business category ID
                business_types = BusinessType.objects.filter(business_category_id=business_category_id).order_by('business_type')
            else:
                # Get all business types
                business_types = BusinessType.objects.all().order_by('business_type')
            
            serializer = BusinessTypeSerializer(business_types, many=True)
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'success': False,
                'detail': 'Failed to fetch business types.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CheckUsernameView(APIView):
    """
    API endpoint to check if a username is available
    """
    def post(self, request):
        try:
            username = request.data.get('username', '').strip()
            
            if not username:
                return Response({
                    'available': False,
                    'detail': 'Username is required.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if username already exists
            exists = Merchant.objects.filter(username=username).exists()
            
            return Response({
                'available': not exists,
                'detail': 'Username is available.' if not exists else 'Username is already taken.'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'available': False,
                'detail': 'Error checking username availability.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CheckEmailView(APIView):
    """
    API endpoint to check if an email is available
    """
    def post(self, request):
        try:
            email = request.data.get('email', '').strip().lower()
            
            if not email:
                return Response({
                    'available': False,
                    'detail': 'Email is required.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if email already exists
            exists = Merchant.objects.filter(email=email).exists()
            
            return Response({
                'available': not exists,
                'detail': 'Email is available.' if not exists else 'Email is already registered.'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'available': False,
                'detail': 'Error checking email availability.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# New Multi-Step Registration Views
class MerchantRegistrationStepView(APIView):
    """
    Handle multi-step merchant registration using Redis cache
    Steps are saved temporarily until final submission
    """
    
    def post(self, request):
        """Save step data to cache"""
        print(f"Registration step request received: {request.data}")
        step = request.data.get('step')
        session_id = request.data.get('session_id')
        data = request.data.get('data', {})
        
        print(f"Step: {step}, Session ID: {session_id}")
        print(f"Data received: {data}")
        
        if not step:
            return Response({
                'detail': 'Step number is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create or get session
        if not session_id:
            session = MerchantRegistrationSession()
        else:
            session = MerchantRegistrationSession(session_id)
            if session.is_expired():
                return Response({
                    'detail': 'Registration session has expired. Please start over.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate step data
        if step == 1:
            serializer = MerchantRegistrationStep1Serializer(data=data)
        elif step == 2:
            serializer = MerchantRegistrationStep2Serializer(data=data)
        elif step == 3:
            serializer = MerchantRegistrationStep3Serializer(data=data)
        else:
            return Response({
                'detail': 'Invalid step number'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not serializer.is_valid():
            print(f"Validation errors for step {step}: {serializer.errors}")
            return Response({
                'detail': 'Validation failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Save validated data to cache
        try:
            session.save_step_data(step, serializer.validated_data)
            
            # For step 3, send OTP
            if step == 3:
                email = session.get_step_data(1).get('email')
                if email:
                    # Generate and send OTP
                    otp = generate_otp()
                    otp_expires_at = timezone.now() + timedelta(minutes=10)
                    
                    # Store OTP in EmailVerification model
                    EmailVerification.objects.filter(
                        email=email, 
                        purpose='merchant_signup'
                    ).delete()  # Remove old OTPs
                    
                    EmailVerification.objects.create(
                        email=email,
                        otp_code=otp,
                        purpose='merchant_signup',
                        expires_at=otp_expires_at
                    )
                    
                    if send_otp_email(email, otp, 'verification'):
                        return Response({
                            'session_id': session.session_id,
                            'step': step,
                            'message': 'Step saved successfully. OTP sent to your email.',
                            'next_step': 'verification'
                        }, status=status.HTTP_200_OK)
                    else:
                        return Response({
                            'detail': 'Failed to send OTP. Please try again.'
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({
                'session_id': session.session_id,
                'step': step,
                'message': 'Step saved successfully',
                'next_step': step + 1 if step < 3 else 'verification'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'detail': f'Failed to save step data: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request):
        """Retrieve step data from cache"""
        session_id = request.query_params.get('session_id')
        step = request.query_params.get('step')
        
        if not session_id:
            return Response({
                'detail': 'Session ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        session = MerchantRegistrationSession(session_id)
        
        if session.is_expired():
            return Response({
                'detail': 'Registration session has expired'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if step:
            data = session.get_step_data(int(step))
            return Response({
                'session_id': session_id,
                'step': int(step),
                'data': data
            }, status=status.HTTP_200_OK)
        else:
            # Return all session data
            session_data = session.get_session_data()
            return Response({
                'session_id': session_id,
                'session_data': session_data
            }, status=status.HTTP_200_OK)


class MerchantFinalRegistrationView(APIView):
    """
    Complete merchant registration after OTP verification
    This creates the actual merchant record in the database
    """
    
    def post(self, request):
        serializer = MerchantFinalRegistrationSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        session_id = serializer.validated_data['session_id']
        otp_code = serializer.validated_data['otp_code']
        
        # Get session data
        session = MerchantRegistrationSession(session_id)
        
        if session.is_expired():
            return Response({
                'detail': 'Registration session has expired'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get email from step 1 data
        step1_data = session.get_step_data(1)
        email = step1_data.get('email')
        
        if not email:
            return Response({
                'detail': 'Invalid session data'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify OTP
        try:
            email_verification = EmailVerification.objects.get(
                email=email,
                otp_code=otp_code,
                purpose='merchant_signup',
                verified=False,
                expires_at__gt=timezone.now()
            )
        except EmailVerification.DoesNotExist:
            return Response({
                'detail': 'Invalid or expired OTP'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create merchant from session data
            merchant = serializer.create_merchant_from_session(session_id, validated_otp=True)
            
            # Mark OTP as verified
            email_verification.verified = True
            email_verification.verified_at = timezone.now()
            email_verification.save()
            
            # Generate tokens
            tokens = get_tokens_for_user(merchant)
            data = MerchantSerializer(merchant).data
            data.update(tokens)
            
            return Response({
                'message': 'Merchant registration completed successfully',
                'merchant': data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'detail': f'Failed to complete registration: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MerchantRegistrationSessionStatusView(APIView):
    """
    Check registration session status and progress
    """
    
    def get(self, request):
        session_id = request.query_params.get('session_id')
        
        if not session_id:
            return Response({
                'detail': 'Session ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        session = MerchantRegistrationSession(session_id)
        
        if session.is_expired():
            return Response({
                'detail': 'Registration session has expired',
                'expired': True
            }, status=status.HTTP_400_BAD_REQUEST)
        
        session_data = session.get_session_data()
        completed_steps = []
        
        for i in range(1, 4):
            if f'step_{i}' in session_data:
                completed_steps.append(i)
        
        return Response({
            'session_id': session_id,
            'completed_steps': completed_steps,
            'last_step': session_data.get('last_step', 0),
            'is_expired': False,
            'can_continue': True
        }, status=status.HTTP_200_OK)


class MerchantTokenVerificationView(APIView):
    """
    Verify merchant JWT token and return merchant status
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Get the authenticated merchant from the request
            merchant = request.user
            
            # Return merchant data including current status
            data = MerchantSerializer(merchant).data
            
            return Response({
                'valid': True,
                'merchant': data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'valid': False,
                'detail': f'Token verification failed: {str(e)}'
            }, status=status.HTTP_401_UNAUTHORIZED)
