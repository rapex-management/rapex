from django.shortcuts import render
from django.db.models import Q, Avg
from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.core.exceptions import ValidationError

from .models import (
    Product, ProductType, Category, Brand, Shop, 
    ProductImage, ProductVariant, ProductTag, ProductReview
)
from .serializers import (
    ProductListSerializer, ProductDetailSerializer, ProductCreateUpdateSerializer,
    ProductTypeSerializer, CategorySerializer, BrandSerializer, ShopSerializer,
    ProductImageSerializer, ProductVariantSerializer, ProductTagSerializer
)
from .permissions import IsMerchant, IsProductOwner, IsShopOwner
from apps.merchants.models import Merchant


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
        try:
            shop = Shop.objects.get(merchant=merchant)
            return Product.objects.filter(shop=shop).select_related(
                'shop', 'category', 'brand', 'type'
            ).prefetch_related('images', 'reviews')
        except Shop.DoesNotExist:
            return Product.objects.none()
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ProductCreateUpdateSerializer
        return ProductListSerializer
    
    def perform_create(self, serializer):
        merchant = self.request.user
        # Get or create shop for merchant
        shop, created = Shop.objects.get_or_create(
            merchant=merchant,
            defaults={'shop_name': merchant.merchant_name}
        )
        serializer.save(shop=shop)


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a specific product"""
    permission_classes = [IsAuthenticated, IsMerchant, IsProductOwner]
    lookup_field = 'product_id'
    
    def get_queryset(self):
        merchant = self.request.user
        try:
            shop = Shop.objects.get(merchant=merchant)
            return Product.objects.filter(shop=shop).select_related(
                'shop', 'category', 'brand', 'type'
            ).prefetch_related('images', 'variants', 'tags', 'reviews')
        except Shop.DoesNotExist:
            return Product.objects.none()
    
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
            shop = Shop.objects.get(merchant=merchant)
            product = Product.objects.get(product_id=product_id, shop=shop)
            return ProductImage.objects.filter(product=product)
        except (Shop.DoesNotExist, Product.DoesNotExist):
            return ProductImage.objects.none()
    
    def perform_create(self, serializer):
        product_id = self.kwargs['product_id']
        merchant = self.request.user
        try:
            shop = Shop.objects.get(merchant=merchant)
            product = Product.objects.get(product_id=product_id, shop=shop)
            serializer.save(product=product)
        except (Shop.DoesNotExist, Product.DoesNotExist):
            raise ValidationError("Product not found or access denied")


class ProductImageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Manage individual product image"""
    serializer_class = ProductImageSerializer
    permission_classes = [IsAuthenticated, IsMerchant]
    lookup_field = 'image_id'
    
    def get_queryset(self):
        merchant = self.request.user
        try:
            shop = Shop.objects.get(merchant=merchant)
            return ProductImage.objects.filter(product__shop=shop)
        except Shop.DoesNotExist:
            return ProductImage.objects.none()


class ProductVariantListCreateView(generics.ListCreateAPIView):
    """Manage product variants"""
    serializer_class = ProductVariantSerializer
    permission_classes = [IsAuthenticated, IsMerchant]
    
    def get_queryset(self):
        product_id = self.kwargs['product_id']
        merchant = self.request.user
        try:
            shop = Shop.objects.get(merchant=merchant)
            product = Product.objects.get(product_id=product_id, shop=shop)
            return ProductVariant.objects.filter(product=product)
        except (Shop.DoesNotExist, Product.DoesNotExist):
            return ProductVariant.objects.none()
    
    def perform_create(self, serializer):
        product_id = self.kwargs['product_id']
        merchant = self.request.user
        try:
            shop = Shop.objects.get(merchant=merchant)
            product = Product.objects.get(product_id=product_id, shop=shop)
            serializer.save(product=product)
        except (Shop.DoesNotExist, Product.DoesNotExist):
            raise ValidationError("Product not found or access denied")


class ProductVariantDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Manage individual product variant"""
    serializer_class = ProductVariantSerializer
    permission_classes = [IsAuthenticated, IsMerchant]
    lookup_field = 'variant_id'
    
    def get_queryset(self):
        merchant = self.request.user
        try:
            shop = Shop.objects.get(merchant=merchant)
            return ProductVariant.objects.filter(product__shop=shop)
        except Shop.DoesNotExist:
            return ProductVariant.objects.none()


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
    """List all brands"""
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


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
        shop = Shop.objects.get(merchant=merchant)
        products = Product.objects.filter(shop=shop)
        
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
        shop = Shop.objects.get(merchant=merchant)
        products = Product.objects.filter(
            product_id__in=product_ids, 
            shop=shop
        )
        
        updated_count = products.update(**update_data)
        
        return Response({
            'message': f'Successfully updated {updated_count} products',
            'updated_count': updated_count
        }, status=status.HTTP_200_OK)
        
    except Shop.DoesNotExist:
        return Response(
            {'error': 'Shop not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsMerchant])
def bulk_upload_products(request):
    """Bulk upload products from CSV file"""
    import csv
    import io
    from decimal import Decimal, InvalidOperation
    
    merchant = request.user
    csv_file = request.FILES.get('csv_file')
    
    if not csv_file:
        return Response(
            {'error': 'CSV file is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not csv_file.name.endswith('.csv'):
        return Response(
            {'error': 'File must be a CSV file'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Get or create shop for merchant
        shop, created = Shop.objects.get_or_create(
            merchant=merchant,
            defaults={'shop_name': merchant.merchant_name}
        )
        
        # Read CSV file
        csv_data = csv_file.read().decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_data))
        
        success_count = 0
        error_count = 0
        errors = []
        
        # Get all categories, brands, and product types for validation
        categories = {cat.name: cat for cat in Category.objects.all()}
        brands = {brand.name: brand for brand in Brand.objects.all()}
        product_types = {pt.get_name_display(): pt for pt in ProductType.objects.all()}
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 because of header
            try:
                # Validate required fields
                required_fields = ['name', 'description', 'price', 'stock', 'category', 'type']
                missing_fields = [field for field in required_fields if not row.get(field, '').strip()]
                
                if missing_fields:
                    errors.append({
                        'row': row_num,
                        'error': f"Missing required fields: {', '.join(missing_fields)}"
                    })
                    error_count += 1
                    continue
                
                # Validate price and stock
                try:
                    price = Decimal(row['price'].strip())
                    if price <= 0:
                        raise ValueError("Price must be positive")
                except (ValueError, InvalidOperation):
                    errors.append({
                        'row': row_num,
                        'error': 'Invalid price format'
                    })
                    error_count += 1
                    continue
                
                try:
                    stock = int(row['stock'].strip())
                    if stock < 0:
                        raise ValueError("Stock cannot be negative")
                except ValueError:
                    errors.append({
                        'row': row_num,
                        'error': 'Invalid stock format'
                    })
                    error_count += 1
                    continue
                
                # Validate category
                category_name = row['category'].strip()
                category = categories.get(category_name)
                if not category:
                    errors.append({
                        'row': row_num,
                        'error': f'Category "{category_name}" not found'
                    })
                    error_count += 1
                    continue
                
                # Validate product type
                type_name = row['type'].strip()
                product_type = product_types.get(type_name)
                if not product_type:
                    errors.append({
                        'row': row_num,
                        'error': f'Product type "{type_name}" not found'
                    })
                    error_count += 1
                    continue
                
                # Optional brand validation
                brand = None
                if row.get('brand', '').strip():
                    brand_name = row['brand'].strip()
                    brand = brands.get(brand_name)
                    if not brand:
                        # Create new brand if it doesn't exist
                        brand = Brand.objects.create(name=brand_name)
                        brands[brand_name] = brand
                
                # Optional weight validation
                weight = None
                if row.get('weight', '').strip():
                    try:
                        weight = Decimal(row['weight'].strip())
                        if weight < 0:
                            raise ValueError("Weight cannot be negative")
                    except (ValueError, InvalidOperation):
                        errors.append({
                            'row': row_num,
                            'error': 'Invalid weight format'
                        })
                        error_count += 1
                        continue
                
                # Create product
                product_data = {
                    'shop': shop,
                    'type': product_type,
                    'name': row['name'].strip(),
                    'description': row['description'].strip(),
                    'price': price,
                    'stock': stock,
                    'category': category,
                    'brand': brand,
                    'status': row.get('status', 'draft').strip() or 'draft',
                    'sku': row.get('sku', '').strip(),
                    'weight': weight,
                }
                
                # Handle dimensions
                dimensions = {}
                if row.get('length', '').strip():
                    try:
                        dimensions['length'] = float(row['length'].strip())
                    except ValueError:
                        pass
                if row.get('width', '').strip():
                    try:
                        dimensions['width'] = float(row['width'].strip())
                    except ValueError:
                        pass
                if row.get('height', '').strip():
                    try:
                        dimensions['height'] = float(row['height'].strip())
                    except ValueError:
                        pass
                
                if dimensions:
                    product_data['dimensions'] = dimensions
                
                # Create the product
                product = Product.objects.create(**product_data)
                
                # Handle product images if image_url is provided
                if row.get('image_url', '').strip():
                    image_urls = [url.strip() for url in row['image_url'].split(';') if url.strip()]
                    for i, image_url in enumerate(image_urls):
                        ProductImage.objects.create(
                            product=product,
                            image_url=image_url,
                            is_primary=(i == 0),  # First image is primary
                            order=i
                        )
                
                # Handle product tags if provided
                if row.get('tags', '').strip():
                    tags = [tag.strip() for tag in row['tags'].split(',') if tag.strip()]
                    for tag_name in tags:
                        ProductTag.objects.create(
                            product=product,
                            tag_name=tag_name
                        )
                
                success_count += 1
                
            except Exception as e:
                errors.append({
                    'row': row_num,
                    'error': f'Unexpected error: {str(e)}'
                })
                error_count += 1
                continue
        
        return Response({
            'message': f'Bulk upload completed. {success_count} products created, {error_count} errors.',
            'success_count': success_count,
            'error_count': error_count,
            'errors': errors[:50]  # Limit errors to first 50 for response size
        }, status=status.HTTP_200_OK if success_count > 0 else status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to process CSV file: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsMerchant])
def download_csv_template(request):
    """Download CSV template for bulk upload"""
    import csv
    from django.http import HttpResponse
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="product_upload_template.csv"'
    
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
