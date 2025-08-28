from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.files.storage import default_storage
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.db import transaction
import json
import uuid
import random
import string
from .models import Merchant, MerchantDocument, EmailVerification
from .serializers import MerchantSignupSerializer, MerchantDocumentSerializer, VerifyOTPSerializer

def add_cors_headers(response):
    """Add CORS headers to response"""
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

@csrf_exempt
def merchant_signup(request):
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        return add_cors_headers(response)
    
    if request.method != 'POST':
        response = JsonResponse({'error': 'Method not allowed'}, status=405)
        return add_cors_headers(response)
        
    try:
        # Handle multipart form data
        data = {}
        for key, value in request.POST.items():
            data[key] = value
        
        # Handle file uploads
        documents = []
        for key, file in request.FILES.items():
            if key.startswith('document_'):
                # Validate file size (2MB limit)
                if file.size > 2 * 1024 * 1024:
                    return JsonResponse({
                        'error': f'File {file.name} exceeds 2MB limit'
                    }, status=400)
                
                # Validate file type
                allowed_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
                if file.content_type not in allowed_types:
                    return JsonResponse({
                        'error': f'File {file.name} has invalid type. Only PDF, JPG, PNG allowed'
                    }, status=400)
                
                documents.append(file)
        
        if not documents:
            return JsonResponse({
                'error': 'At least one business document is required'
            }, status=400)
        
        # Validate required fields
        required_fields = [
            'merchantName', 'ownerName', 'username', 'email', 'password',
            'phone', 'mccCategory', 'zipcode', 'province', 'city_municipality', 
            'barangay', 'street_name', 'house_number', 'latitude', 'longitude'
        ]
        
        for field in required_fields:
            if not data.get(field):
                return JsonResponse({
                    'error': f'Field {field} is required'
                }, status=400)
        
        # Check if username or email already exists
        if Merchant.objects.filter(username=data['username']).exists():
            return JsonResponse({
                'error': 'Username already exists'
            }, status=400)
        
        if Merchant.objects.filter(email=data['email']).exists():
            return JsonResponse({
                'error': 'Email already exists'
            }, status=400)
        
        with transaction.atomic():
            # Create merchant
            merchant = Merchant.objects.create(
                username=data['username'],
                email=data['email'],
                merchant_name=data['merchantName'],
                owner_name=data['ownerName'],
                phone=data['phone'],
                mcc=int(data['mccCategory']),
                zipcode=data['zipcode'],
                province=data['province'],
                city_municipality=data['city_municipality'],
                barangay=data['barangay'],
                street_name=data['street_name'],
                house_number=data['house_number'],
                latitude=float(data['latitude']),
                longitude=float(data['longitude']),
                status=4  # Unverified
            )
            merchant.set_password(data['password'])
            merchant.save()
            
            # Save documents
            for i, document in enumerate(documents):
                # Generate unique filename
                ext = document.name.split('.')[-1] if '.' in document.name else 'bin'
                filename = f"merchant_docs/{merchant.id}/{uuid.uuid4()}.{ext}"
                
                # Save file
                file_path = default_storage.save(filename, document)
                
                # Create document record
                MerchantDocument.objects.create(
                    merchant=merchant,
                    document_type=f'document_{i}',
                    file_url=f'/media/{file_path}',
                    original_filename=document.name,
                    file_size=document.size
                )
            
            # Generate OTP for email verification
            otp = ''.join(random.choices(string.digits, k=6))
            
            # Save OTP
            EmailVerification.objects.create(
                email=merchant.email,
                otp_code=otp,
                purpose='merchant_signup',
                expires_at=timezone.now() + timezone.timedelta(minutes=10)
            )
            
            # Send OTP email
            try:
                send_mail(
                    subject='Verify Your Rapex Merchant Registration',
                    message=f'''
                    Dear {data['ownerName']},
                    
                    Thank you for registering as a Rapex merchant!
                    
                    Your verification code is: {otp}
                    
                    This code will expire in 10 minutes.
                    
                    After verification, our team will review your application and notify you within 1-2 working days.
                    
                    Best regards,
                    Rapex Team
                    ''',
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[data['email']],
                    fail_silently=False,
                )
            except Exception as e:
                print(f"Email sending failed: {e}")
                # Continue without failing the registration
            
            response = JsonResponse({
                'success': True,
                'message': 'Registration successful. Please check your email for verification code.',
                'merchant_id': str(merchant.id)
            })
            return add_cors_headers(response)
    
    except Exception as e:
        response = JsonResponse({
            'error': f'Registration failed: {str(e)}'
        }, status=500)
        return add_cors_headers(response)

@csrf_exempt
def verify_otp(request):
    if request.method == 'OPTIONS':
        response = JsonResponse({})
        return add_cors_headers(response)
    
    if request.method != 'POST':
        response = JsonResponse({'error': 'Method not allowed'}, status=405)
        return add_cors_headers(response)
        
    try:
        data = json.loads(request.body)
        merchant_id = data.get('merchant_id')
        otp = data.get('otp')
        
        if not merchant_id or not otp:
            return JsonResponse({
                'error': 'Merchant ID and OTP are required'
            }, status=400)
        
        # Find verification record
        verification = EmailVerification.objects.filter(
            merchant_id=merchant_id,
            otp=otp,
            is_verified=False,
            expires_at__gte=timezone.now()
        ).first()
        
        if not verification:
            return JsonResponse({
                'error': 'Invalid or expired OTP'
            }, status=400)
        
        # Mark as verified
        verification.is_verified = True
        verification.save()
        
        # Update merchant email verification status
        merchant = verification.merchant
        merchant.email_verified = True
        merchant.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Email verified successfully. Your application is now under review.'
        })
    
    except Exception as e:
        return JsonResponse({
            'error': f'Verification failed: {str(e)}'
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def resend_otp(request):
    try:
        data = json.loads(request.body)
        merchant_id = data.get('merchant_id')
        
        if not merchant_id:
            return JsonResponse({
                'error': 'Merchant ID is required'
            }, status=400)
        
        merchant = Merchant.objects.get(id=merchant_id)
        
        # Generate new OTP
        otp = ''.join(random.choices(string.digits, k=6))
        
        # Invalidate old OTPs
        EmailVerification.objects.filter(
            merchant=merchant,
            is_verified=False
        ).update(is_verified=True)  # Mark as used
        
        # Create new OTP
        EmailVerification.objects.create(
            merchant=merchant,
            otp=otp,
            expires_at=timezone.now() + timezone.timedelta(minutes=10)
        )
        
        # Send new OTP email
        try:
            send_mail(
                subject='New Verification Code - Rapex Merchant Registration',
                message=f'''
                Dear {merchant.owner_name},
                
                Your new verification code is: {otp}
                
                This code will expire in 10 minutes.
                
                Best regards,
                Rapex Team
                ''',
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[merchant.email],
                fail_silently=False,
            )
        except Exception as e:
            return JsonResponse({
                'error': 'Failed to send email'
            }, status=500)
        
        return JsonResponse({
            'success': True,
            'message': 'New verification code sent to your email.'
        })
    
    except Merchant.DoesNotExist:
        return JsonResponse({
            'error': 'Merchant not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'error': f'Failed to resend OTP: {str(e)}'
        }, status=500)
