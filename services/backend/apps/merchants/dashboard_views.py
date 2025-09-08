from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Sum, Avg
from django.utils import timezone
from datetime import timedelta

from .models import Merchant


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def merchant_dashboard(request):
    """
    Get dashboard data for the authenticated merchant
    """
    try:
        # Get the merchant from the authenticated user
        merchant = request.user
        
        if not isinstance(merchant, Merchant):
            return Response(
                {'error': 'User is not a merchant'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get today's date
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # Initialize default statistics
        today_orders = 0
        total_orders = 0
        today_revenue = 0
        total_revenue = 0
        pending_orders = 0
        total_products = 0
        active_products = 0
        
        # Try to get orders statistics if Order model exists
        try:
            from apps.orders.models import Order
            
            today_orders = Order.objects.filter(
                merchant=merchant,
                created_at__date=today
            ).count()
            
            total_orders = Order.objects.filter(merchant=merchant).count()
            
            # Calculate today's revenue
            today_revenue = Order.objects.filter(
                merchant=merchant,
                created_at__date=today,
                status__in=['completed', 'delivered']
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            # Calculate total revenue
            total_revenue = Order.objects.filter(
                merchant=merchant,
                status__in=['completed', 'delivered']
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            # Get pending orders
            pending_orders = Order.objects.filter(
                merchant=merchant,
                status__in=['pending', 'processing', 'ready']
            ).count()
            
        except (ImportError, Exception):
            # If Order model doesn't exist or has issues, use default values
            today_orders = 0
            total_orders = 0
            today_revenue = 0
            total_revenue = 0
            pending_orders = 0
        
        # Try to get products statistics if Product model exists
        try:
            from apps.merchants.models import Product
            
            total_products = Product.objects.filter(merchant=merchant).count()
            active_products = Product.objects.filter(
                merchant=merchant,
                is_active=True
            ).count()
            
        except (ImportError, Exception):
            # If Product model doesn't exist, use default values
            total_products = 0
            active_products = 0
        
        # Get merchant rating (placeholder for now)
        merchant_rating = 4.5  # This would come from reviews/ratings system
        
        # Prepare dashboard data
        dashboard_data = {
            'merchant_info': {
                'id': str(merchant.id),
                'business_name': merchant.merchant_name or 'Unknown Business',
                'owner_name': merchant.owner_name or 'Unknown Owner',
                'email': merchant.email,
                'phone': merchant.phone or '',
                'status': merchant.status,
                'date_joined': merchant.date_joined.isoformat() if merchant.date_joined else None,
            },
            'statistics': {
                'today_orders': today_orders,
                'total_orders': total_orders,
                'pending_orders': pending_orders,
                'today_revenue': float(today_revenue),
                'total_revenue': float(total_revenue),
                'total_products': total_products,
                'active_products': active_products,
                'merchant_rating': merchant_rating,
            },
            'quick_stats': {
                'orders_this_week': 0,  # Can be implemented later
                'revenue_this_week': 0,  # Can be implemented later
                'orders_this_month': 0,  # Can be implemented later
                'revenue_this_month': 0,  # Can be implemented later
            }
        }
        
        return Response(dashboard_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to load dashboard: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
