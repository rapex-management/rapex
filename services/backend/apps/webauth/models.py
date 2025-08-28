import uuid
from django.db import models
from django.contrib.auth.hashers import make_password, check_password


class BaseUser(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def set_password(self, raw):
        self.password = make_password(raw)

    def check_password(self, raw):
        return check_password(raw, self.password)


class Admin(BaseUser):
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    status = models.IntegerField(choices=[(0, 'Active'), (1, 'Banned'), (2, 'Frozen'), (3, 'Deleted'), (4, 'Unverified')], default=0)
    profile_picture = models.URLField(blank=True)
    is_superuser = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)


class Merchant(BaseUser):
    merchant_name = models.CharField(max_length=200)
    owner_name = models.CharField(max_length=200)
    merchant_host_id = models.CharField(max_length=100, blank=True)
    status = models.IntegerField(choices=[(0, 'Active'), (1, 'Banned'), (2, 'Frozen'), (3, 'Deleted'), (4, 'Unverified')], default=4)
    mcc = models.IntegerField(choices=[
        (0, 'Food Stall'), (1, 'Pre-loved'), (2, 'Fresh Market'), (3, 'Hardware'),
        (4, 'Grocery Store'), (5, 'Sari-Sari Store'), (6, 'Pharmacy'), (7, 'Online Seller'),
        (8, 'Bakery'), (9, 'Coffee Shop'), (10, 'Restaurant'), (11, 'Fast Food'),
        (12, 'Meat Shop'), (13, 'Fish Vendor'), (14, 'Street Food'), (15, 'Clothing/Apparel'),
        (16, 'Electronics'), (17, 'General Merchandise'), (18, 'Laundry Products'),
        (19, 'Water Refilling Station'), (20, 'Computer Shop'), (21, 'Appliance Store'),
        (22, 'Mobile Store'), (23, 'Pet Supplies'), (24, 'Motor Parts'), (25, 'Rice Retailer'),
        (26, 'Furniture'), (27, 'School Supplies'), (28, 'Vegetable & Fruit Vendor'),
        (29, 'Mall'), (30, 'Toy Store'), (31, 'Bookstore'), (32, 'Sporting Goods'),
        (33, 'Jewelry Store'), (34, 'Home Decor / Furnishing'), (35, 'Cosmetic & Beauty Products'),
        (36, 'Automotive Supplies'), (37, 'Baby Products')
    ])
    phone = models.CharField(max_length=20)
    zipcode = models.CharField(max_length=10)
    province = models.CharField(max_length=100)
    city_municipality = models.CharField(max_length=100)
    barangay = models.CharField(max_length=100)
    street_name = models.CharField(max_length=200)
    house_number = models.CharField(max_length=50)
    settlement_emails = models.JSONField(default=list, blank=True)
    withdrawal_option = models.CharField(max_length=100, blank=True)
    profile_picture = models.URLField(blank=True)
    documents = models.JSONField(default=list, blank=True)  # URLs of documents
    documents_info = models.JSONField(default=dict, blank=True)  # DTI/SEC, BIR TIN, etc.
    additional_info = models.JSONField(default=dict, blank=True)  # comments/remarks
    date_joined = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.UUIDField(null=True, blank=True)  # Admin who verified


class Rider(BaseUser):
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    phone = models.CharField(max_length=20)
    status = models.IntegerField(choices=[(0, 'Active'), (1, 'Banned'), (2, 'Frozen'), (3, 'Deleted'), (4, 'Unverified')], default=4)
    profile_picture = models.URLField(blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)


class User(BaseUser):
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    phone = models.CharField(max_length=20)
    status = models.IntegerField(choices=[(0, 'Active'), (1, 'Banned'), (2, 'Frozen'), (3, 'Deleted'), (4, 'Unverified')], default=4)
    profile_picture = models.URLField(blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)
