from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from typing import Optional
import uuid

from .models import MerchantWallet, MerchantWalletTransaction, MerchantPaymentMethod
from apps.merchants.models import Merchant


class WalletService:
    """Service class for wallet operations"""
    
    @staticmethod
    def create_merchant_wallet(merchant: Merchant) -> MerchantWallet:
        """Create a wallet for a new merchant"""
        wallet, created = MerchantWallet.objects.get_or_create(
            merchant=merchant,
            defaults={
                'balance': Decimal('0.00'),
                'status': 'active'
            }
        )
        return wallet
    
    @staticmethod
    @transaction.atomic
    def process_transaction(
        wallet_id: uuid.UUID,
        amount: Decimal,
        transaction_type: str,
        description: str = '',
        reference_id: Optional[str] = None,
        related_order_id: Optional[uuid.UUID] = None,
        processed_by: Optional[uuid.UUID] = None
    ) -> MerchantWalletTransaction:
        """
        Process a wallet transaction with balance validation
        """
        # Get and lock the wallet
        wallet = MerchantWallet.objects.select_for_update().get(wallet_id=wallet_id)
        
        # Validate wallet status
        if wallet.status != 'active':
            raise ValueError(f"Wallet is not active. Current status: {wallet.status}")
        
        # Calculate new balance
        new_balance = wallet.balance + amount
        
        # Validate balance constraints
        if new_balance < 0:
            raise ValueError(
                f"Insufficient funds. Current balance: {wallet.balance}, "
                f"Transaction amount: {amount}, Would result in: {new_balance}"
            )
        
        # Create the transaction record
        transaction_obj = MerchantWalletTransaction.objects.create(
            wallet=wallet,
            amount=amount,
            transaction_type=transaction_type,
            transaction_status='completed',
            description=description,
            reference_id=reference_id,
            related_order_id=related_order_id,
            processed_by=processed_by
        )
        
        # Update wallet balance
        wallet.balance = new_balance
        wallet.save()
        
        return transaction_obj
    
    @staticmethod
    def get_wallet_balance(wallet_id: uuid.UUID) -> Decimal:
        """Get current wallet balance"""
        try:
            wallet = MerchantWallet.objects.get(wallet_id=wallet_id)
            return wallet.balance
        except MerchantWallet.DoesNotExist:
            raise ValueError(f"Wallet not found: {wallet_id}")
    
    @staticmethod
    def get_merchant_wallet(merchant_id: uuid.UUID) -> MerchantWallet:
        """Get wallet by merchant ID"""
        try:
            return MerchantWallet.objects.get(merchant_id=merchant_id)
        except MerchantWallet.DoesNotExist:
            raise ValueError(f"Wallet not found for merchant: {merchant_id}")
    
    @staticmethod
    @transaction.atomic
    def transfer_funds(
        from_wallet_id: uuid.UUID,
        to_wallet_id: uuid.UUID,
        amount: Decimal,
        description: str = '',
        reference_id: Optional[str] = None,
        processed_by: Optional[uuid.UUID] = None
    ) -> tuple[MerchantWalletTransaction, MerchantWalletTransaction]:
        """
        Transfer funds between two wallets atomically
        """
        if amount <= 0:
            raise ValueError("Transfer amount must be positive")
        
        if from_wallet_id == to_wallet_id:
            raise ValueError("Cannot transfer to the same wallet")
        
        # Process withdrawal from source wallet
        withdrawal_txn = WalletService.process_transaction(
            wallet_id=from_wallet_id,
            amount=-amount,
            transaction_type='transfer_out',
            description=f"Transfer to wallet {to_wallet_id}: {description}",
            reference_id=reference_id,
            processed_by=processed_by
        )
        
        # Process deposit to destination wallet
        deposit_txn = WalletService.process_transaction(
            wallet_id=to_wallet_id,
            amount=amount,
            transaction_type='transfer_in',
            description=f"Transfer from wallet {from_wallet_id}: {description}",
            reference_id=reference_id,
            processed_by=processed_by
        )
        
        return withdrawal_txn, deposit_txn
    
    @staticmethod
    def get_transaction_history(
        wallet_id: uuid.UUID,
        transaction_type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100
    ) -> list[MerchantWalletTransaction]:
        """Get transaction history for a wallet with optional filters"""
        queryset = MerchantWalletTransaction.objects.filter(wallet_id=wallet_id)
        
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
        
        if status:
            queryset = queryset.filter(transaction_status=status)
        
        return list(queryset.order_by('-timestamp')[:limit])
    
    @staticmethod
    @transaction.atomic
    def suspend_wallet(wallet_id: uuid.UUID, reason: str, processed_by: Optional[uuid.UUID] = None) -> MerchantWallet:
        """Suspend a wallet (admin operation)"""
        wallet = MerchantWallet.objects.select_for_update().get(wallet_id=wallet_id)
        
        if wallet.status == 'suspended':
            raise ValueError("Wallet is already suspended")
        
        # Log the suspension as a transaction
        MerchantWalletTransaction.objects.create(
            wallet=wallet,
            amount=Decimal('0.00'),
            transaction_type='adjustment',
            transaction_status='completed',
            description=f"Wallet suspended: {reason}",
            processed_by=processed_by
        )
        
        wallet.status = 'suspended'
        wallet.save()
        
        return wallet
    
    @staticmethod
    @transaction.atomic
    def reactivate_wallet(wallet_id: uuid.UUID, reason: str, processed_by: Optional[uuid.UUID] = None) -> MerchantWallet:
        """Reactivate a suspended wallet (admin operation)"""
        wallet = MerchantWallet.objects.select_for_update().get(wallet_id=wallet_id)
        
        if wallet.status == 'active':
            raise ValueError("Wallet is already active")
        
        if wallet.status not in ['suspended', 'frozen']:
            raise ValueError(f"Cannot reactivate wallet with status: {wallet.status}")
        
        # Log the reactivation as a transaction
        MerchantWalletTransaction.objects.create(
            wallet=wallet,
            amount=Decimal('0.00'),
            transaction_type='adjustment',
            transaction_status='completed',
            description=f"Wallet reactivated: {reason}",
            processed_by=processed_by
        )
        
        wallet.status = 'active'
        wallet.save()
        
        return wallet


class PaymentMethodService:
    """Service class for payment method operations"""
    
    @staticmethod
    @transaction.atomic
    def add_payment_method(
        wallet_id: uuid.UUID,
        payment_method_type: str,
        payment_details: dict,
        display_name: str = '',
        is_default: bool = False
    ) -> MerchantPaymentMethod:
        """Add a new payment method to a wallet"""
        wallet = MerchantWallet.objects.get(wallet_id=wallet_id)
        
        # If this is being set as default, unset other defaults
        if is_default:
            MerchantPaymentMethod.objects.filter(
                wallet=wallet,
                is_default=True
            ).update(is_default=False)
        
        payment_method = MerchantPaymentMethod.objects.create(
            wallet=wallet,
            payment_method_type=payment_method_type,
            payment_details=payment_details,
            display_name=display_name,
            is_default=is_default,
            status='active'
        )
        
        return payment_method
    
    @staticmethod
    def get_wallet_payment_methods(wallet_id: uuid.UUID) -> list[MerchantPaymentMethod]:
        """Get all payment methods for a wallet"""
        return list(
            MerchantPaymentMethod.objects.filter(wallet_id=wallet_id)
            .order_by('-is_default', 'payment_method_type', 'created_at')
        )
    
    @staticmethod
    def get_default_payment_method(wallet_id: uuid.UUID) -> Optional[MerchantPaymentMethod]:
        """Get the default payment method for a wallet"""
        try:
            return MerchantPaymentMethod.objects.get(
                wallet_id=wallet_id,
                is_default=True,
                status='active'
            )
        except MerchantPaymentMethod.DoesNotExist:
            return None
    
    @staticmethod
    @transaction.atomic
    def set_default_payment_method(payment_method_id: uuid.UUID) -> MerchantPaymentMethod:
        """Set a payment method as the default for its wallet"""
        payment_method = MerchantPaymentMethod.objects.get(
            payment_method_id=payment_method_id
        )
        
        # Unset other defaults for the same wallet
        MerchantPaymentMethod.objects.filter(
            wallet=payment_method.wallet,
            is_default=True
        ).exclude(payment_method_id=payment_method_id).update(is_default=False)
        
        # Set this as default
        payment_method.is_default = True
        payment_method.save()
        
        return payment_method
    
    @staticmethod
    def deactivate_payment_method(payment_method_id: uuid.UUID) -> MerchantPaymentMethod:
        """Deactivate a payment method"""
        payment_method = MerchantPaymentMethod.objects.get(
            payment_method_id=payment_method_id
        )
        
        payment_method.status = 'inactive'
        payment_method.is_default = False
        payment_method.save()
        
        return payment_method