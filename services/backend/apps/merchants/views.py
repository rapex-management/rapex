from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count
from django.utils import timezone
from django.core.paginator import Paginator
from django.db import transaction
import uuid

from apps.webauth.models import Merchant, Admin, MerchantDocument
from .serializers import (
    MerchantListSerializer, MerchantDetailSerializer, MerchantUpdateSerializer,
    MerchantStatusUpdateSerializer, MerchantBatchActionSerializer, MerchantCreateSerializer
)
from apps.webauth.permissions import IsAdminUser


class MerchantPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class MerchantListView(generics.ListAPIView):
    serializer_class = MerchantListSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['merchant_name', 'owner_name', 'email', 'username', 'phone']
    ordering_fields = ['date_joined', 'merchant_name', 'status']
    ordering = ['-date_joined']
    pagination_class = MerchantPagination
    
    def get_queryset(self):
        queryset = Merchant.objects.select_related('business_category', 'business_type').prefetch_related('merchant_documents')
        
        # Additional filtering
        status_filter = self.request.query_params.get('status_filter', None)
        if status_filter == 'pending':
            queryset = queryset.filter(status=5)
        elif status_filter == 'active':
            queryset = queryset.filter(status=0)
        elif status_filter == 'rejected':
            queryset = queryset.filter(status=6)
        elif status_filter == 'inactive':
            queryset = queryset.filter(status__in=[1, 2, 3, 4, 6])
            
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        if date_from:
            queryset = queryset.filter(date_joined__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date_joined__date__lte=date_to)
            
        return queryset

    def filter_queryset(self, queryset):
        """Override to prevent automatic filtering by unwanted query parameters"""
        # Create a filtered copy of query parameters to exclude problematic ones
        filtered_params = self.request.query_params.copy()
        # Remove parameters that might cause issues with UUID vs integer ID conflicts
        if 'id' in filtered_params:
            del filtered_params['id']
        if 'vscodeB rowserReqId' in filtered_params:
            del filtered_params['vscodeB rowserReqId']
        
        # Temporarily replace query_params to prevent automatic filtering
        original_params = self.request.query_params
        self.request._query_params = filtered_params
        
        try:
            return super().filter_queryset(queryset)
        finally:
            # Restore original query_params
            self.request._query_params = original_params
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Get statistics
        stats = {
            'total': queryset.count(),
            'active': queryset.filter(status=0).count(),
            'pending': queryset.filter(status=5).count(),
            'rejected': queryset.filter(status=6).count(),
            'banned': queryset.filter(status=1).count(),
            'frozen': queryset.filter(status=2).count(),
            'deleted': queryset.filter(status=3).count(),
        }
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data['stats'] = stats
            return response
            
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'stats': stats
        })


class MerchantDetailView(generics.RetrieveAPIView):
    queryset = Merchant.objects.select_related('business_category', 'business_type').prefetch_related('merchant_documents')
    serializer_class = MerchantDetailSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    lookup_field = 'id'


class MerchantUpdateView(generics.UpdateAPIView):
    queryset = Merchant.objects.all()
    serializer_class = MerchantUpdateSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    lookup_field = 'id'
    
    def perform_update(self, serializer):
        serializer.save()


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def update_merchant_status(request, id):
    try:
        merchant = Merchant.objects.get(id=id)
    except Merchant.DoesNotExist:
        return Response({'error': 'Merchant not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = MerchantStatusUpdateSerializer(data=request.data)
    if serializer.is_valid():
        new_status = serializer.validated_data['status']
        reason = serializer.validated_data.get('reason', '')
        
        # Get admin from request
        admin = request.user
        
        with transaction.atomic():
            merchant.status = new_status
            
            # Set verification fields for approval/rejection
            if new_status == 0:  # Approved/Active
                merchant.verified_at = timezone.now()
                merchant.verified_by = admin.id
            elif new_status == 6:  # Rejected
                merchant.verified_at = timezone.now()
                merchant.verified_by = admin.id
                # Store rejection reason in additional_info
                if not merchant.additional_info:
                    merchant.additional_info = {}
                merchant.additional_info['rejection_reason'] = reason
                merchant.additional_info['rejected_at'] = timezone.now().isoformat()
                merchant.additional_info['rejected_by'] = str(admin.id)
            
            # Store action in additional_info for audit trail
            if not merchant.additional_info:
                merchant.additional_info = {}
            
            action_log = merchant.additional_info.get('action_log', [])
            action_log.append({
                'action': f"Status changed to {merchant.get_status_display()}",
                'reason': reason,
                'admin_id': str(admin.id),
                'admin_name': f"{admin.first_name} {admin.last_name}",
                'timestamp': timezone.now().isoformat()
            })
            merchant.additional_info['action_log'] = action_log
            
            merchant.save()
        
        return Response({'message': 'Merchant status updated successfully'})
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def batch_merchant_action(request):
    serializer = MerchantBatchActionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    merchant_ids = serializer.validated_data['merchant_ids']
    action = serializer.validated_data['action']
    reason = serializer.validated_data.get('reason', '')
    
    admin = request.user
    
    # Map actions to status codes
    action_status_map = {
        'approve': 0,
        'reject': 6,
        'ban': 1,
        'freeze': 2,
        'delete': 3,
        'activate': 0
    }
    
    new_status = action_status_map.get(action)
    if new_status is None:
        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        with transaction.atomic():
            merchants = Merchant.objects.filter(id__in=merchant_ids)
            updated_count = 0
            
            if not merchants.exists():
                return Response({'error': 'No valid merchants found'}, status=status.HTTP_404_NOT_FOUND)
            
            for merchant in merchants:
                merchant.status = new_status
                
                # Set verification fields for approval/rejection
                if new_status == 0:  # Approved/Active
                    merchant.verified_at = timezone.now()
                    merchant.verified_by = admin.id
                elif new_status == 6:  # Rejected
                    merchant.verified_at = timezone.now()
                    merchant.verified_by = admin.id
                    if not merchant.additional_info:
                        merchant.additional_info = {}
                    merchant.additional_info['rejection_reason'] = reason
                    merchant.additional_info['rejected_at'] = timezone.now().isoformat()
                    merchant.additional_info['rejected_by'] = str(admin.id)
                
                # Store action in additional_info for audit trail
                if not merchant.additional_info:
                    merchant.additional_info = {}
                
                action_log = merchant.additional_info.get('action_log', [])
                action_log.append({
                    'action': f"Batch {action} - Status changed to {merchant.get_status_display()}",
                    'reason': reason,
                    'admin_id': str(admin.id),
                    'admin_name': f"{admin.first_name} {admin.last_name}",
                    'timestamp': timezone.now().isoformat()
                })
                merchant.additional_info['action_log'] = action_log
                
                merchant.save()
                updated_count += 1
        
        return Response({
            'message': f'Successfully {action}ed {updated_count} merchants',
            'updated_count': updated_count
        })
    except Exception as e:
        return Response({'error': f'Batch action failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MerchantCreateView(generics.CreateAPIView):
    queryset = Merchant.objects.all()
    serializer_class = MerchantCreateSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def perform_create(self, serializer):
        # Generate unique merchant_id
        merchant_id = f"M{uuid.uuid4().hex[:8].upper()}"
        while Merchant.objects.filter(merchant_id=merchant_id).exists():
            merchant_id = f"M{uuid.uuid4().hex[:8].upper()}"
        
        merchant = serializer.save(
            merchant_id=merchant_id,
            status=0,  # Active by default when created by admin
            verified_at=timezone.now(),  # Mark as verified since created by admin
            verified_by=self.request.user.id  # Set the admin who created it
        )
        
        # Log creation in additional_info
        admin = self.request.user
        merchant.additional_info = {
            'created_by_admin': True,
            'created_by': str(admin.id),
            'created_by_name': f"{admin.first_name} {admin.last_name}",
            'action_log': [{
                'action': 'Merchant created by admin',
                'admin_id': str(admin.id),
                'admin_name': f"{admin.first_name} {admin.last_name}",
                'timestamp': timezone.now().isoformat()
            }]
        }
        merchant.save()


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdminUser])
def delete_merchant(request, id):
    try:
        merchant = Merchant.objects.get(id=id)
    except Merchant.DoesNotExist:
        return Response({'error': 'Merchant not found'}, status=status.HTTP_404_NOT_FOUND)
    
    admin = request.user
    reason = request.data.get('reason', 'Deleted by admin')
    
    with transaction.atomic():
        # Archive instead of delete
        merchant.status = 3  # Deleted
        
        # Store deletion info
        if not merchant.additional_info:
            merchant.additional_info = {}
        
        merchant.additional_info.update({
            'deleted_at': timezone.now().isoformat(),
            'deleted_by': str(admin.id),
            'deleted_by_name': f"{admin.first_name} {admin.last_name}",
            'deletion_reason': reason
        })
        
        action_log = merchant.additional_info.get('action_log', [])
        action_log.append({
            'action': 'Merchant deleted/archived',
            'reason': reason,
            'admin_id': str(admin.id),
            'admin_name': f"{admin.first_name} {admin.last_name}",
            'timestamp': timezone.now().isoformat()
        })
        merchant.additional_info['action_log'] = action_log
        
        merchant.save()
    
    return Response({'message': 'Merchant archived successfully'})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def merchant_statistics(request):
    """Get comprehensive merchant statistics"""
    stats = {
        'total_merchants': Merchant.objects.count(),
        'by_status': {
            'active': Merchant.objects.filter(status=0).count(),
            'banned': Merchant.objects.filter(status=1).count(),
            'frozen': Merchant.objects.filter(status=2).count(),
            'deleted': Merchant.objects.filter(status=3).count(),
            'unverified': Merchant.objects.filter(status=4).count(),
            'pending': Merchant.objects.filter(status=5).count(),
            'rejected': Merchant.objects.filter(status=6).count(),
        },
        'by_business_registration': {
            'vat_included': Merchant.objects.filter(business_registration=0).count(),
            'non_vat': Merchant.objects.filter(business_registration=1).count(),
            'unregistered': Merchant.objects.filter(business_registration=2).count(),
        },
        'recent_registrations': Merchant.objects.filter(
            date_joined__gte=timezone.now() - timezone.timedelta(days=30)
        ).count(),
        'pending_verification': Merchant.objects.filter(status=5).count(),
    }
    
    # Top provinces by merchant count
    top_provinces = Merchant.objects.filter(status=0).values('province').annotate(
        count=Count('id')
    ).order_by('-count')[:10]
    
    stats['top_provinces'] = list(top_provinces)
    
    return Response(stats)
