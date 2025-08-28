#  example

# from django.contrib.auth.models import AbstractUser
# from django.db import models

# class User(AbstractUser):
#     class Roles(models.TextChoices):
#         SUPERADMIN = "SUPERADMIN"
#         ADMIN = "ADMIN"
#         MERCHANT = "MERCHANT"
#         RIDER = "RIDER"
#         USER = "USER"

#     role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.USER)
#     is_verified = models.BooleanField(default=False)
#     id_photo = models.URLField(blank=True, null=True)  # store S3 url
#     # additional fields...
