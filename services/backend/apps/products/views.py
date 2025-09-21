from django.shortcuts import render
from django.db.models import Q, Avg
from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.core.exceptions import ValidationError

from .models import (
    ShopProduct, PrelovedProduct, ReadyToEatProduct, FreshProduct,
    MerchantCategory, Category, Brand, MerchantBrand,
    ProductImage, ProductVariant, ProductTag, ProductReview
)

# Temporary compatibility - for migration purposes only
# TODO: Update all views to use specific product types
Product = ShopProduct  # Default to ShopProduct for now

# Create a temporary ProductType class for compatibility
class ProductType:
    TYPE_CHOICES = [
        (0, 'Shop'),
        (1, 'Pre-loved'), 
        (2, 'Ready-to-Eat'),
        (3, 'Fresh'),
    ]
    
    class objects:
        @staticmethod
        def all():
            return []
    
    def get_name_display(self):
        return "Shop"
from .serializers import (
    ProductListSerializer, ProductDetailSerializer, ProductCreateUpdateSerializer,
    ShopProductCreateUpdateSerializer,
    ProductTypeSerializer, CategorySerializer, BrandSerializer, MerchantBrandSerializer, ShopSerializer,
    ProductImageSerializer, ProductVariantSerializer, ProductTagSerializer
)
from .permissions import IsMerchant, IsProductOwner, IsShopOwner
from apps.merchants.models import Merchant

# Temporary compatibility alias after import
# Shop = Merchant  # Shop is now just Merchant (commented out for now)


class ProductPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProductListCreateView(generics.ListCreateAPIView):
    """List products for a merchant and create new products"""
    permission_classes = [IsAuthenticated, IsMerchant]
    pagination_class = ProductPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'category', 'type', 'brand']
    search_fields = ['name', 'description', 'sku']
    ordering_fields = ['name', 'price', 'stock', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        # Only return products belonging to the authenticated merchant
        merchant = self.request.user
        return Product.objects.filter(merchant=merchant).select_related(
            'merchant', 'category', 'brand'
        ).prefetch_related('images')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ProductCreateUpdateSerializer
        return ProductListSerializer
    
    def perform_create(self, serializer):
        merchant = self.request.user
        serializer.save(merchant=merchant)


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a specific product"""
    permission_classes = [IsAuthenticated, IsMerchant, IsProductOwner]
    lookup_field = 'product_id'
    
    def get_queryset(self):
        merchant = self.request.user
        return Product.objects.filter(merchant=merchant).select_related(
            'merchant', 'category', 'brand'
        ).prefetch_related('images')
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ProductCreateUpdateSerializer
        return ProductDetailSerializer


class ProductImageListCreateView(generics.ListCreateAPIView):
    """Manage product images"""
    serializer_class = ProductImageSerializer
    permission_classes = [IsAuthenticated, IsMerchant]
    
    def get_queryset(self):
        product_id = self.kwargs['product_id']
        # Ensure the product belongs to the merchant
        merchant = self.request.user
        try:
            product = Product.objects.get(product_id=product_id, merchant=merchant)
            return ProductImage.objects.filter(product=product)
        except Product.DoesNotExist:
            return ProductImage.objects.none()
    
    def perform_create(self, serializer):
        product_id = self.kwargs['product_id']
        merchant = self.request.user
        try:
            product = Product.objects.get(product_id=product_id, merchant=merchant)
            serializer.save(product=product)
        except Product.DoesNotExist:
            raise ValidationError("Product not found or access denied")


class ProductImageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Manage individual product image"""
    serializer_class = ProductImageSerializer
    permission_classes = [IsAuthenticated, IsMerchant]
    lookup_field = 'image_id'
    
    def get_queryset(self):
        merchant = self.request.user
        return ProductImage.objects.filter(product__merchant=merchant)


class ProductVariantListCreateView(generics.ListCreateAPIView):
    """Manage product variants"""
    serializer_class = ProductVariantSerializer
    permission_classes = [IsAuthenticated, IsMerchant]
    
    def get_queryset(self):
        product_id = self.kwargs['product_id']
        merchant = self.request.user
        try:
            product = Product.objects.get(product_id=product_id, merchant=merchant)
            return ProductVariant.objects.filter(product=product)
        except Product.DoesNotExist:
            return ProductVariant.objects.none()
    
    def perform_create(self, serializer):
        product_id = self.kwargs['product_id']
        merchant = self.request.user
        try:
            product = Product.objects.get(product_id=product_id, merchant=merchant)
            serializer.save(product=product)
        except Product.DoesNotExist:
            raise ValidationError("Product not found or access denied")


class ProductVariantDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Manage individual product variant"""
    serializer_class = ProductVariantSerializer
    permission_classes = [IsAuthenticated, IsMerchant]
    lookup_field = 'variant_id'
    
    def get_queryset(self):
        merchant = self.request.user
        return ProductVariant.objects.filter(product__merchant=merchant)


# Supporting data views
class ProductTypeListView(generics.ListAPIView):
    """List all product types"""
    queryset = ProductType.objects.all()
    serializer_class = ProductTypeSerializer
    permission_classes = [IsAuthenticated]


class CategoryListView(generics.ListAPIView):
    """List all categories"""
    queryset = Category.objects.filter(parent=None).prefetch_related('subcategories')
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]


class BrandListView(generics.ListAPIView):
    """List merchant brands - deprecated, use shop-products/brands/ instead"""
    permission_classes = [IsAuthenticated, IsMerchant]
    filter_backends = [filters.SearchFilter]
    search_fields = ['brand_name']
    
    def get_queryset(self):
        # Return merchant-specific brands
        merchant = self.request.user
        return MerchantBrand.objects.filter(merchant=merchant).order_by('brand_name')
    
    def get_serializer_class(self):
        from .serializers import MerchantBrandSerializer
        return MerchantBrandSerializer


class ShopDetailView(generics.RetrieveUpdateAPIView):
    """Manage merchant's shop"""
    serializer_class = ShopSerializer
    permission_classes = [IsAuthenticated, IsMerchant, IsShopOwner]
    
    def get_object(self):
        merchant = self.request.user
        shop, created = Shop.objects.get_or_create(
            merchant=merchant,
            defaults={'shop_name': merchant.merchant_name}
        )
        return shop


# Dashboard views
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsMerchant])
def product_dashboard(request):
    """Get product dashboard statistics for merchant"""
    merchant = request.user
    try:
        products = Product.objects.filter(merchant=merchant)
        
        # Basic stats
        total_products = products.count()
        active_products = products.filter(status='active').count()
        out_of_stock = products.filter(status='out_of_stock').count()
        draft_products = products.filter(status='draft').count()
        
        # Category breakdown
        category_stats = {}
        for product in products.select_related('category'):
            cat_name = product.category.name
            if cat_name not in category_stats:
                category_stats[cat_name] = {'count': 0, 'active': 0}
            category_stats[cat_name]['count'] += 1
            if product.status == 'active':
                category_stats[cat_name]['active'] += 1
        
        # Low stock products (stock <= 5)
        low_stock_products = products.filter(stock__lte=5, status='active')
        
        # Recent products (last 7 days)
        from django.utils import timezone
        from datetime import timedelta
        recent_date = timezone.now() - timedelta(days=7)
        recent_products = products.filter(created_at__gte=recent_date).count()
        
        data = {
            'total_products': total_products,
            'active_products': active_products,
            'out_of_stock': out_of_stock,
            'draft_products': draft_products,
            'recent_products': recent_products,
            'category_stats': category_stats,
            'low_stock_products': ProductListSerializer(low_stock_products, many=True).data,
            'shop': ShopSerializer(shop).data
        }
        
        return Response(data, status=status.HTTP_200_OK)
        
    except Shop.DoesNotExist:
        # Create default shop if doesn't exist
        shop = Shop.objects.create(
            merchant=merchant,
            shop_name=merchant.merchant_name
        )
        return Response({
            'total_products': 0,
            'active_products': 0,
            'out_of_stock': 0,
            'draft_products': 0,
            'recent_products': 0,
            'category_stats': {},
            'low_stock_products': [],
            'shop': ShopSerializer(shop).data
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsMerchant])
def bulk_update_products(request):
    """Bulk update product status or other fields"""
    merchant = request.user
    product_ids = request.data.get('product_ids', [])
    update_data = request.data.get('update_data', {})
    
    if not product_ids or not update_data:
        return Response(
            {'error': 'product_ids and update_data are required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        products = Product.objects.filter(
            product_id__in=product_ids, 
            merchant=merchant
        )
        
        updated_count = products.update(**update_data)
        
        return Response({
            'message': f'Successfully updated {updated_count} products',
            'updated_count': updated_count
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to update products: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsMerchant])
def bulk_upload_products(request):
    """Bulk upload shop products from CSV/Excel file with enhanced validation and performance"""
    import csv
    import io
    import pandas as pd
    from decimal import Decimal, InvalidOperation
    from django.db import transaction
    from django.core.cache import cache
    import uuid
    import time
    
    merchant = request.user
    
    # Check for uploaded file
    uploaded_file = request.FILES.get('file') or request.FILES.get('csv_file')
    
    if not uploaded_file:
        return Response(
            {'error': 'CSV or Excel file is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate file type and size
    allowed_extensions = ['.csv', '.xlsx', '.xls']
    file_extension = uploaded_file.name.lower().split('.')[-1]
    
    if f'.{file_extension}' not in allowed_extensions:
        return Response(
            {'error': 'File must be CSV or Excel (.csv, .xlsx, .xls)'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 20MB limit for better performance
    if uploaded_file.size > 20 * 1024 * 1024:
        return Response(
            {'error': 'File size must be less than 20MB'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Use merchant directly - ShopProduct uses merchant field, not shop field
        # No need to create a separate shop object since ShopProduct.merchant = merchant
        
        # Parse file based on type
        try:
            if file_extension == 'csv':
                # Read CSV file
                csv_data = uploaded_file.read().decode('utf-8')
                df = pd.read_csv(io.StringIO(csv_data))
            else:
                # Read Excel file
                df = pd.read_excel(uploaded_file)
        except Exception as e:
            return Response(
                {'error': f'Failed to parse file: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate required columns
        required_columns = ['name', 'description', 'price', 'stock', 'category']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            return Response(
                {'error': f'Missing required columns: {", ".join(missing_columns)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Clean and prepare data
        df = df.fillna('')  # Replace NaN with empty strings
        df = df.head(1000)  # Limit to 1000 rows for performance
        
        # Pre-fetch all categories and brands for validation (optimized)
        merchant_categories = {cat.name.lower(): cat for cat in MerchantCategory.objects.filter(merchant=merchant)}
        merchant_brands = {brand.brand_name.lower(): brand for brand in MerchantBrand.objects.filter(merchant=merchant)}
        
        # Batch processing variables
        success_count = 0
        error_count = 0
        errors = []
        products_to_create = []
        
        # Process each row
        for index, row in df.iterrows():
            row_num = index + 2  # Account for header row
            
            try:
                # Validate required fields
                name = str(row.get('name', '')).strip()
                description = str(row.get('description', '')).strip()
                price_str = str(row.get('price', '')).strip()
                stock_str = str(row.get('stock', '')).strip()
                category_name = str(row.get('category', '')).strip()
                
                if not all([name, description, price_str, stock_str, category_name]):
                    errors.append({
                        'row': row_num,
                        'error': 'Missing required fields: name, description, price, stock, category'
                    })
                    error_count += 1
                    continue
                
                # Validate and convert price
                try:
                    price = Decimal(price_str.replace('$', '').replace(',', ''))
                    if price <= 0:
                        raise ValueError("Price must be positive")
                except (ValueError, InvalidOperation):
                    errors.append({
                        'row': row_num,
                        'error': f'Invalid price format: {price_str}'
                    })
                    error_count += 1
                    continue
                
                # Validate and convert stock
                try:
                    stock = int(float(stock_str))  # Handle decimal inputs
                    if stock < 0:
                        raise ValueError("Stock cannot be negative")
                except ValueError:
                    errors.append({
                        'row': row_num,
                        'error': f'Invalid stock format: {stock_str}'
                    })
                    error_count += 1
                    continue
                
                # Validate category
                category = merchant_categories.get(category_name.lower())
                if not category:
                    # Auto-create category if it doesn't exist
                    try:
                        category = MerchantCategory.objects.create(
                            merchant=merchant,
                            name=category_name
                        )
                        merchant_categories[category_name.lower()] = category
                    except Exception as e:
                        errors.append({
                            'row': row_num,
                            'error': f'Failed to create category "{category_name}": {str(e)}'
                        })
                        error_count += 1
                        continue
                
                # Optional brand handling
                brand = None
                brand_name = str(row.get('brand', '')).strip()
                if brand_name:
                    brand = merchant_brands.get(brand_name.lower())
                    if not brand:
                        try:
                            brand = MerchantBrand.objects.create(
                                merchant=merchant,
                                brand_name=brand_name
                            )
                            merchant_brands[brand_name.lower()] = brand
                        except Exception:
                            # If brand creation fails, continue without brand
                            pass
                
                # Optional weight validation
                weight = None
                weight_str = str(row.get('weight', '')).strip()
                if weight_str:
                    try:
                        weight = Decimal(weight_str.replace('kg', '').replace('g', ''))
                        if weight < 0:
                            raise ValueError("Weight cannot be negative")
                    except (ValueError, InvalidOperation):
                        errors.append({
                            'row': row_num,
                            'error': f'Invalid weight format: {weight_str}'
                        })
                        error_count += 1
                        continue
                
                # Prepare product data
                product_data = {
                    'merchant': merchant,
                    'name': name,
                    'description': description,
                    'price': price,
                    'stock': stock,
                    'category': category,
                    'brand': brand,
                    'status': str(row.get('status', 'draft')).strip().lower() or 'draft',
                    'sku': str(row.get('sku', '')).strip() or None,
                    'weight': weight,
                }
                
                # Handle dimensions
                dimensions = {}
                for dim in ['length', 'width', 'height']:
                    dim_str = str(row.get(dim, '')).strip()
                    if dim_str:
                        try:
                            dimensions[dim] = float(dim_str.replace('cm', '').replace('m', ''))
                        except ValueError:
                            pass
                
                if dimensions:
                    product_data['dimensions'] = dimensions
                
                products_to_create.append(product_data)
                
            except Exception as e:
                errors.append({
                    'row': row_num,
                    'error': f'Unexpected error: {str(e)}'
                })
                error_count += 1
                continue
        
        # Batch create products for better performance
        if products_to_create:
            try:
                with transaction.atomic():
                    created_products = []
                    for product_data in products_to_create:
                        try:
                            product = ShopProduct.objects.create(**product_data)
                            created_products.append(product)
                            success_count += 1
                        except Exception as e:
                            errors.append({
                                'row': 'unknown',
                                'error': f'Database error: {str(e)}'
                            })
                            error_count += 1
                            
            except Exception as e:
                return Response(
                    {'error': f'Database transaction failed: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Prepare response
        response_data = {
            'message': f'Bulk upload completed. {success_count} products created, {error_count} errors.',
            'success_count': success_count,
            'error_count': error_count,
            'total_rows': len(df),
            'errors': errors[:100],  # Limit errors for response size
            'merchant_id': merchant.id,
            'processing_time': f'{time.time():.2f}s'
        }
        
        # Cache result for potential retry
        cache_key = f'bulk_upload_{merchant.id}_{int(time.time())}'
        cache.set(cache_key, response_data, timeout=300)  # 5 minutes
        
        return Response(
            response_data,
            status=status.HTTP_200_OK if success_count > 0 else status.HTTP_400_BAD_REQUEST
        )
        
    except Exception as e:
        return Response(
            {'error': f'Failed to process file: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsMerchant])
def download_csv_template(request):
    """Download enhanced CSV template for bulk upload with ShopProduct structure"""
    import csv
    from django.http import HttpResponse
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="shop_products_template.csv"'
    
    writer = csv.writer(response)
    
    # Write header with required and optional fields
    writer.writerow([
        # Required fields
        'name', 'description', 'price', 'stock', 'category',
        # Optional fields  
        'brand', 'status', 'sku', 'weight', 'length', 'width', 'height', 'tags'
    ])
    
    # Write sample data rows
    sample_data = [
        [
            'Premium Coffee Beans',
            'High-quality Arabica coffee beans from Ethiopian highlands. Perfect for espresso and drip coffee.',
            '24.99',
            '100',
            'Food & Beverages',
            'Highland Coffee',
            'active',
            'COF-001',
            '1.0',
            '15',
            '10',
            '25',
            'organic,coffee,premium,fair-trade'
        ],
        [
            'Wireless Bluetooth Headphones',
            'Premium wireless headphones with noise cancellation and 30-hour battery life.',
            '149.99',
            '50',
            'Electronics',
            'TechAudio',
            'active',
            'HEAD-002',
            '0.3',
            '20',
            '18',
            '8',
            'wireless,bluetooth,audio,premium'
        ],
        [
            'Cotton T-Shirt',
            'Comfortable 100% cotton t-shirt available in multiple colors.',
            '19.99',
            '200',
            'Clothing',
            'ComfortWear',
            'draft',
            'SHIRT-003',
            '0.2',
            '30',
            '20',
            '2',
            'cotton,comfortable,casual'
        ]
    ]
    
    for row in sample_data:
        writer.writerow(row)
    
    return response
    
    writer = csv.writer(response)
    
    # Write header
    writer.writerow([
        'name', 'description', 'price', 'stock', 'category', 'type', 
        'brand', 'status', 'sku', 'weight', 'length', 'width', 'height',
        'image_url', 'tags'
    ])
    
    # Write sample data
    writer.writerow([
        'Sample Product', 
        'This is a sample product description',
        '99.99',
        '50',
        'Electronics',  # Make sure this category exists in your system
        'Shop',
        'Sample Brand',
        'draft',
        'SKU001',
        '1.5',
        '10',
        '15',
        '5',
        'https://example.com/image1.jpg;https://example.com/image2.jpg',
        'tag1,tag2,tag3'
    ])
    
    return response


# ShopProduct Specific Views
class ShopProductListCreateView(generics.ListCreateAPIView):
    """List and create shop products for the authenticated merchant"""
    permission_classes = [IsAuthenticated, IsMerchant]
    pagination_class = ProductPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'sku']
    ordering_fields = ['name', 'price', 'stock', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Only return shop products belonging to the authenticated merchant"""
        merchant = self.request.user
        return ShopProduct.objects.filter(merchant=merchant).select_related(
            'category', 'brand'
        ).order_by('-created_at')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ShopProductCreateUpdateSerializer
        return ProductListSerializer
    
    def perform_create(self, serializer):
        """Create a shop product for the authenticated merchant"""
        serializer.save()


class ShopProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a specific shop product"""
    permission_classes = [IsAuthenticated, IsMerchant]
    serializer_class = ShopProductCreateUpdateSerializer
    lookup_field = 'product_id'
    
    def get_queryset(self):
        """Only allow access to products belonging to the authenticated merchant"""
        merchant = self.request.user
        return ShopProduct.objects.filter(merchant=merchant).select_related(
            'category', 'brand'
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsMerchant])
def shop_product_categories(request):
    """Get merchant categories for the dropdown"""
    try:
        merchant = request.user
        
        # First try to get merchant-specific categories
        merchant_categories = MerchantCategory.objects.filter(
            merchant=merchant
        ).order_by('name')
        
        category_data = []
        
        if merchant_categories.exists():
            category_data = [
                {
                    'category_id': str(cat.category_id),
                    'name': cat.name,
                    'description': ''  # No description field in current model
                }
                for cat in merchant_categories
            ]
        else:
            # If no merchant categories, provide some default categories
            default_categories = [
                {'category_id': 'general', 'name': 'General', 'description': 'General products'},
                {'category_id': 'electronics', 'name': 'Electronics', 'description': 'Electronic devices and accessories'},
                {'category_id': 'clothing', 'name': 'Clothing', 'description': 'Apparel and fashion items'},
                {'category_id': 'home', 'name': 'Home & Garden', 'description': 'Home improvement and garden supplies'},
                {'category_id': 'health', 'name': 'Health & Beauty', 'description': 'Health and beauty products'},
            ]
            category_data = default_categories
        
        return Response({
            'categories': category_data,
            'count': len(category_data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error fetching categories: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsMerchant])
def shop_product_brands(request):
    """Get merchant-specific brands for the dropdown"""
    try:
        merchant = request.user
        
        # First try to get merchant-specific brands
        from .models import MerchantBrand
        merchant_brands = MerchantBrand.objects.filter(
            merchant=merchant
        ).order_by('brand_name')
        
        brand_data = []
        
        if merchant_brands.exists():
            brand_data = [
                {
                    'brand_id': str(brand.brand_id),
                    'name': brand.brand_name,
                    'description': ''  # Simplified model has no description
                }
                for brand in merchant_brands
            ]
        else:
            # If no merchant brands, provide some default brands
            default_brands = [
                {'brand_id': 'generic', 'name': 'Generic', 'description': 'Generic brand'},
                {'brand_id': 'store-brand', 'name': 'Store Brand', 'description': 'Store or merchant brand'},
                {'brand_id': 'unbranded', 'name': 'Unbranded', 'description': 'No specific brand'},
            ]
            brand_data = default_brands
        
        return Response({
            'brands': brand_data,
            'count': len(brand_data)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error fetching brands: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsMerchant])
def create_merchant_category(request):
    """Create a new merchant category"""
    try:
        merchant = request.user
        category_name = request.data.get('name')
        
        if not category_name:
            return Response(
                {'error': 'Category name is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        category, created = MerchantCategory.objects.get_or_create(
            merchant=merchant,
            name=category_name
        )
        
        return Response({
            'category_id': str(category.category_id),
            'name': category.name,
            'created': created
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error creating category: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsMerchant])
def create_merchant_brand(request):
    """Create a new merchant brand"""
    try:
        merchant = request.user
        brand_name = request.data.get('name')
        
        if not brand_name:
            return Response(
                {'error': 'Brand name is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        brand, created = MerchantBrand.objects.get_or_create(
            merchant=merchant,
            brand_name=brand_name
        )
        
        return Response({
            'brand_id': str(brand.brand_id),
            'name': brand.brand_name,
            'created': created
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error creating brand: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsMerchant])
def upload_product_image(request):
    """Upload a product image with validation"""
    import os
    from django.core.files.storage import default_storage
    from django.core.files.base import ContentFile
    from PIL import Image
    import uuid
    
    try:
        if 'image' not in request.FILES:
            return Response(
                {'error': 'No image file provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        image_file = request.FILES['image']
        
        # Validate file size (2MB limit)
        if image_file.size > 2 * 1024 * 1024:  # 2MB in bytes
            return Response(
                {'error': 'Image file too large. Maximum size is 2MB'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
        if image_file.content_type not in allowed_types:
            return Response(
                {'error': 'Invalid file type. Only JPEG, PNG, and WebP images are allowed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate unique filename
        file_extension = os.path.splitext(image_file.name)[1].lower()
        unique_filename = f"product_{uuid.uuid4().hex}{file_extension}"
        
        # Create directory structure: media/products/merchant_id/
        merchant_id = str(request.user.id)
        upload_path = f"products/{merchant_id}/{unique_filename}"
        
        # Save file
        file_path = default_storage.save(upload_path, ContentFile(image_file.read()))
        
        # Get file URL for frontend preview
        file_url = request.build_absolute_uri(default_storage.url(file_path))
        
        return Response({
            'success': True,
            'filename': unique_filename,
            'file_path': file_path,
            'image_url': file_url,  # Frontend expects 'image_url'
            'file_url': file_url,   # Keep for backward compatibility
            'file_size': image_file.size,
            'message': 'Image uploaded successfully'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': f'Error uploading image: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsMerchant])
def create_merchant_category(request):
    """Create a new merchant category"""
    try:
        merchant = request.user
        name = request.data.get('name', '').strip()
        description = request.data.get('description', '').strip()
        
        if not name:
            return Response(
                {'error': 'Category name is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if category already exists for this merchant
        if MerchantCategory.objects.filter(merchant=merchant, name=name).exists():
            return Response(
                {'error': 'Category with this name already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the category
        category = MerchantCategory.objects.create(
            merchant=merchant,
            name=name,
            description=description
        )
        
        return Response({
            'category_id': category.category_id,
            'name': category.name,
            'description': category.description,
            'message': 'Category created successfully'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': f'Error creating category: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
