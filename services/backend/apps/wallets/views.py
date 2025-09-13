from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from decimal import Decimal

from .models import MerchantWallet, MerchantWalletTransaction, MerchantPaymentMethod
from .serializers import (
    MerchantWalletSerializer, MerchantWalletTransactionSerializer,
    MerchantPaymentMethodSerializer, WalletTransactionCreateSerializer,
    PaymentMethodCreateSerializer
)
from .services import WalletService


class MerchantWalletViewSet(viewsets.ModelViewSet):
    """ViewSet for managing merchant wallets"""
    queryset = MerchantWallet.objects.select_related('merchant').all()
    serializer_class = MerchantWalletSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter wallets based on user permissions"""
        user = self.request.user
        if hasattr(user, 'merchant'):
            # Merchants can only see their own wallet
            return self.queryset.filter(merchant=user.merchant)
        else:
            # Admins can see all wallets
            return self.queryset
    
    @action(detail=True, methods=['post'])
    def process_transaction(self, request, pk=None):
        """Process a wallet transaction"""
        wallet = self.get_object()
        serializer = WalletTransactionCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    transaction_obj = WalletService.process_transaction(
                        wallet_id=wallet.wallet_id,
                        amount=serializer.validated_data['amount'],
                        transaction_type=serializer.validated_data['transaction_type'],
                        description=serializer.validated_data.get('description', ''),
                        reference_id=serializer.validated_data.get('reference_id'),
                        related_order_id=serializer.validated_data.get('related_order_id'),
                        processed_by=request.user.id
                    )
                
                transaction_serializer = MerchantWalletTransactionSerializer(transaction_obj)
                return Response(transaction_serializer.data, status=status.HTTP_201_CREATED)
            
            except Exception as e:
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        """Get transaction history for a wallet"""
        wallet = self.get_object()
        transactions = wallet.transactions.all()
        
        # Filter by transaction type if provided
        transaction_type = request.query_params.get('type')
        if transaction_type:
            transactions = transactions.filter(transaction_type=transaction_type)
        
        # Filter by status if provided
        transaction_status = request.query_params.get('status')
        if transaction_status:
            transactions = transactions.filter(transaction_status=transaction_status)
        
        serializer = MerchantWalletTransactionSerializer(transactions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def balance(self, request, pk=None):
        """Get current wallet balance"""
        wallet = self.get_object()
        return Response({
            'wallet_id': wallet.wallet_id,
            'balance': wallet.balance,
            'status': wallet.status,
            'last_updated': wallet.updated_at
        })


class MerchantWalletTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing wallet transactions (read-only)"""
    queryset = MerchantWalletTransaction.objects.select_related('wallet__merchant').all()
    serializer_class = MerchantWalletTransactionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter transactions based on user permissions"""
        user = self.request.user
        if hasattr(user, 'merchant'):
            # Merchants can only see their own transactions
            return self.queryset.filter(wallet__merchant=user.merchant)
        else:
            # Admins can see all transactions
            return self.queryset


class MerchantPaymentMethodViewSet(viewsets.ModelViewSet):
    """ViewSet for managing merchant payment methods"""
    queryset = MerchantPaymentMethod.objects.select_related('wallet__merchant').all()
    serializer_class = MerchantPaymentMethodSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter payment methods based on user permissions"""
        user = self.request.user
        if hasattr(user, 'merchant'):
            # Merchants can only see their own payment methods
            return self.queryset.filter(wallet__merchant=user.merchant)
        else:
            # Admins can see all payment methods
            return self.queryset
    
    def get_serializer_class(self):
        """Use different serializers for create vs read operations"""
        if self.action == 'create':
            return PaymentMethodCreateSerializer
        return self.serializer_class
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set a payment method as the default"""
        payment_method = self.get_object()
        
        try:
            with transaction.atomic():
                # Unset other default payment methods for this wallet
                MerchantPaymentMethod.objects.filter(
                    wallet=payment_method.wallet,
                    is_default=True
                ).exclude(pk=payment_method.pk).update(is_default=False)
                
                # Set this payment method as default
                payment_method.is_default = True
                payment_method.save()
            
            serializer = self.get_serializer(payment_method)
            return Response(serializer.data)
        
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Mark a payment method as verified (admin only)"""
        payment_method = self.get_object()
        
        # Only admins can verify payment methods
        if not request.user.is_staff:
            return Response(
                {'error': 'Only administrators can verify payment methods'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        payment_method.is_verified = True
        payment_method.verified_at = timezone.now()
        payment_method.save()
        
        serializer = self.get_serializer(payment_method)
        return Response(serializer.data)
