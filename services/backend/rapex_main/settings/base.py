("""Minimal settings used for local development in Docker Compose.

This file intentionally keeps configuration small so `manage.py migrate`
works inside the container. It relies on django-environ and a
`.env` file at the project root (already provided by infra/docker-compose).
""")
from pathlib import Path
import os

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
	DEBUG=(bool, False),
	SECRET_KEY=(str, "changeme"),
)
# Read .env from backend root
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

SECRET_KEY = env('SECRET_KEY')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = env.list('DJANGO_ALLOWED_HOSTS', default=['localhost', '127.0.0.1', 'backend'])

INSTALLED_APPS = [
	'django.contrib.admin',
	'django.contrib.auth',
	'django.contrib.contenttypes',
	'django.contrib.sessions',
	'django.contrib.messages',
	'django.contrib.staticfiles',
	'rest_framework',
	'rest_framework_simplejwt',
	'corsheaders',
	# local apps
	'apps.webauth.apps.WebauthConfig',
	'apps.merchants.apps.MerchantsConfig',
	'apps.products.apps.ProductsConfig',
    'apps.wallets.apps.WalletsConfig',
]

MIDDLEWARE = [
	'corsheaders.middleware.CorsMiddleware',
	'django.middleware.security.SecurityMiddleware',
	'django.contrib.sessions.middleware.SessionMiddleware',
	'django.middleware.common.CommonMiddleware',
	'django.middleware.csrf.CsrfViewMiddleware',
	'django.contrib.auth.middleware.AuthenticationMiddleware',
	'django.contrib.messages.middleware.MessageMiddleware',
]

ROOT_URLCONF = 'rapex_main.urls'

TEMPLATES = [
	{
		'BACKEND': 'django.template.backends.django.DjangoTemplates',
		'DIRS': [],
		'APP_DIRS': True,
		'OPTIONS': {'context_processors': ['django.template.context_processors.debug','django.template.context_processors.request','django.contrib.auth.context_processors.auth','django.contrib.messages.context_processors.messages']},
	}
]

WSGI_APPLICATION = 'rapex_main.wsgi.application'

# Database configuration with resilient fallback
from urllib.parse import urlparse, parse_qsl, urlunparse

_raw_db_url = env('DATABASE_URL', default='postgres://rapex:rapex_pass@db:5432/rapex')
_db_config = None

def _sanitize_db_url(url: str) -> str:
    """Remove unsupported query parameters that psycopg2 will reject (e.g., MAX_CONNS)."""
    try:
        parsed = urlparse(url)
        if not parsed.query:
            return url
        allowed = {  # Common allowed keys for psycopg2 / Django URL parser
            'sslmode', 'connect_timeout', 'options', 'target_session_attrs'
        }
        filtered = [(k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True) if k.lower() in allowed]
        new_query = '&'.join(f"{k}={v}" for k, v in filtered)
        sanitized = urlunparse(parsed._replace(query=new_query))
        return sanitized
    except Exception:
        return url

_raw_db_url = _sanitize_db_url(_raw_db_url)

try:
    # Try standard dj-database-url style parsing via environ
    _db_config = env.db('DATABASE_URL', default=_raw_db_url)
except Exception:
    # Fallback to discrete variables (works even if DATABASE_URL malformed with extraneous params)
    _db_config = {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DB_NAME', default='rapex'),
        'USER': env('DB_USER', default='rapex'),
        'PASSWORD': env('DB_PASSWORD', default='rapex_pass'),
        'HOST': env('DB_HOST', default='db'),
        'PORT': env('DB_PORT', default='5432'),
    }

DATABASES = { 'default': _db_config }

# Redis Cache Configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://redis:6379/0'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 20,
                'retry_on_timeout': True,
            },
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
        },
        'KEY_PREFIX': 'rapex',
        'TIMEOUT': 300,  # 5 minutes default
    },
    'sessions': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://redis:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'rapex_sessions',
        'TIMEOUT': 86400,  # 1 day
    }
}

# Session Configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'sessions'
SESSION_COOKIE_AGE = 86400  # 1 day
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Minimal password validators for local dev
AUTH_PASSWORD_VALIDATORS = []

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django Rest Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.webauth.authentication.CustomJWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

# JWT Settings
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
}

# Email Settings
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@rapex.com')

# Time Zone
TIME_ZONE = 'Asia/Manila'

# CORS Settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_CREDENTIALS = True

# File Upload Settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
USE_TZ = True

# Google OAuth Settings
GOOGLE_CLIENT_ID = env('GOOGLE_CLIENT_ID', default='')
GOOGLE_CLIENT_SECRET = env('GOOGLE_CLIENT_SECRET', default='')

