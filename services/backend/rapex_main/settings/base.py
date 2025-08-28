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
	# local apps
	'apps.webauth.apps.WebauthConfig',
]

MIDDLEWARE = [
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

# Database: use DATABASE_URL from .env (env.db returns dict with ENGINE/NAME/etc)
DATABASES = {
	'default': env.db('DATABASE_URL', default='postgres://rapex:rapex_pass@db:5432/rapex')
}

# Static files
STATIC_URL = '/static/'

# Minimal password validators for local dev
AUTH_PASSWORD_VALIDATORS = []

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django Rest Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
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

