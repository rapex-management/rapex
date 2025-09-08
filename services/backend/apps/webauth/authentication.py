from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import UntypedToken
from django.contrib.auth.models import AnonymousUser
import jwt
from django.conf import settings

from .models import Admin, User
from apps.merchants.models import Merchant


class CustomJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that works with multiple user models (Admin, Merchant, User)
    """
    
    def get_user(self, validated_token):
        """
        Attempts to find and return a user using the given validated token.
        """
        try:
            user_id = validated_token.get('user_id')
            user_type = validated_token.get('user_type', 'admin')  # default to admin
            
            if user_type == 'admin':
                return Admin.objects.get(id=user_id)
            elif user_type == 'merchant':
                return Merchant.objects.get(id=user_id)
            elif user_type == 'user':
                return User.objects.get(id=user_id)
            else:
                return None
                
        except (Admin.DoesNotExist, Merchant.DoesNotExist, User.DoesNotExist, KeyError):
            return None


def get_tokens_for_user(user):
    """
    Custom token generation that includes user type information
    """
    from rest_framework_simplejwt.tokens import RefreshToken
    
    # Determine user type
    if hasattr(user, '_meta') and user._meta.model_name == 'admin':
        user_type = 'admin'
    elif hasattr(user, '_meta') and user._meta.model_name == 'merchant':
        user_type = 'merchant'
    elif hasattr(user, '_meta') and user._meta.model_name == 'user':
        user_type = 'user'
    else:
        user_type = 'admin'  # default fallback
    
    # Create custom token with user type
    refresh = RefreshToken()
    refresh['user_id'] = str(user.id)
    refresh['user_type'] = user_type
    refresh['username'] = user.username
    refresh['email'] = user.email
    
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }
