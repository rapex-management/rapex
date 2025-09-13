from django.test import TestCase
from django.db import IntegrityError, transaction
from decimal import Decimal
import uuid

from apps.merchants.models import Merchant
from .models import MerchantWallet, MerchantWalletTransaction, MerchantPaymentMethod
from .services import WalletService, PaymentMethodService


class MerchantWalletTestCase(TestCase):
    def setUp(self):
        # Create a test merchant
        self.merchant = Merchant.objects.create(
            email='test@example.com',
            merchant_name='Test Merchant',
            owner_name='Test Owner',
            phone='1234567890',
            zipcode='12345',
            province='Test Province',
            city_municipality='Test City',
            barangay='Test Barangay',
            street_name='Test Street',
            house_number='123'
        )
        
        # Create a wallet for the merchant
        self.wallet = MerchantWallet.objects.create(
            merchant=self.merchant,
            balance=Decimal('1000.00'),
            status='active'
        )
    
    def test_wallet_creation(self):
        """Test wallet creation and constraints"""
        self.assertEqual(self.wallet.merchant, self.merchant)
        self.assertEqual(self.wallet.balance, Decimal('1000.00'))
        self.assertEqual(self.wallet.status, 'active')
    
    def test_wallet_unique_constraint(self):
        """Test that one merchant can have only one wallet"""
        with self.assertRaises(IntegrityError):
            MerchantWallet.objects.create(
                merchant=self.merchant,
                balance=Decimal('500.00')
            )
    
    def test_negative_balance_constraint(self):
        """Test that wallet balance cannot be negative"""
        with self.assertRaises(ValueError):
            self.wallet.balance = Decimal('-100.00')
            self.wallet.save()


class WalletTransactionTestCase(TestCase):
    def setUp(self):
        self.merchant = Merchant.objects.create(
            email='test@example.com',
            merchant_name='Test Merchant',
            owner_name='Test Owner',
            phone='1234567890',
            zipcode='12345',
            province='Test Province',
            city_municipality='Test City',
            barangay='Test Barangay',
            street_name='Test Street',
            house_number='123'
        )
        
        self.wallet = MerchantWallet.objects.create(
            merchant=self.merchant,
            balance=Decimal('1000.00'),
            status='active'
        )
    
    def test_deposit_transaction(self):
        """Test deposit transaction processing"""
        initial_balance = self.wallet.balance
        deposit_amount = Decimal('500.00')
        
        transaction_obj = WalletService.process_transaction(
            wallet_id=self.wallet.wallet_id,
            amount=deposit_amount,
            transaction_type='deposit',
            description='Test deposit'
        )
        
        # Refresh wallet from database
        self.wallet.refresh_from_db()
        
        self.assertEqual(transaction_obj.transaction_type, 'deposit')
        self.assertEqual(transaction_obj.amount, deposit_amount)
        self.assertEqual(transaction_obj.transaction_status, 'completed')
        self.assertEqual(self.wallet.balance, initial_balance + deposit_amount)
    
    def test_withdrawal_transaction(self):
        """Test withdrawal transaction processing"""
        initial_balance = self.wallet.balance
        withdrawal_amount = Decimal('-200.00')
        
        transaction_obj = WalletService.process_transaction(
            wallet_id=self.wallet.wallet_id,
            amount=withdrawal_amount,
            transaction_type='withdrawal',
            description='Test withdrawal'
        )
        
        # Refresh wallet from database
        self.wallet.refresh_from_db()
        
        self.assertEqual(transaction_obj.transaction_type, 'withdrawal')
        self.assertEqual(transaction_obj.amount, withdrawal_amount)
        self.assertEqual(transaction_obj.transaction_status, 'completed')
        self.assertEqual(self.wallet.balance, initial_balance + withdrawal_amount)
    
    def test_insufficient_funds_error(self):
        """Test that withdrawal fails with insufficient funds"""
        withdrawal_amount = Decimal('-2000.00')  # More than balance
        
        with self.assertRaises(ValueError) as context:
            WalletService.process_transaction(
                wallet_id=self.wallet.wallet_id,
                amount=withdrawal_amount,
                transaction_type='withdrawal',
                description='Test overdraft'
            )
        
        self.assertIn('Insufficient funds', str(context.exception))
        
        # Balance should remain unchanged
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal('1000.00'))
    
    def test_suspended_wallet_transaction(self):
        """Test that transactions fail on suspended wallets"""
        self.wallet.status = 'suspended'
        self.wallet.save()
        
        with self.assertRaises(ValueError) as context:
            WalletService.process_transaction(
                wallet_id=self.wallet.wallet_id,
                amount=Decimal('100.00'),
                transaction_type='deposit',
                description='Test on suspended wallet'
            )
        
        self.assertIn('Wallet is not active', str(context.exception))


class WalletTransferTestCase(TestCase):
    def setUp(self):
        # Create two merchants and wallets
        self.merchant1 = Merchant.objects.create(
            email='merchant1@example.com',
            merchant_name='Merchant 1',
            owner_name='Owner 1',
            phone='1111111111',
            zipcode='11111',
            province='Province 1',
            city_municipality='City 1',
            barangay='Barangay 1',
            street_name='Street 1',
            house_number='111'
        )
        
        self.merchant2 = Merchant.objects.create(
            email='merchant2@example.com',
            merchant_name='Merchant 2',
            owner_name='Owner 2',
            phone='2222222222',
            zipcode='22222',
            province='Province 2',
            city_municipality='City 2',
            barangay='Barangay 2',
            street_name='Street 2',
            house_number='222'
        )
        
        self.wallet1 = MerchantWallet.objects.create(
            merchant=self.merchant1,
            balance=Decimal('1000.00')
        )
        
        self.wallet2 = MerchantWallet.objects.create(
            merchant=self.merchant2,
            balance=Decimal('500.00')
        )
    
    def test_successful_transfer(self):
        """Test successful fund transfer between wallets"""
        transfer_amount = Decimal('300.00')
        initial_balance1 = self.wallet1.balance
        initial_balance2 = self.wallet2.balance
        
        withdrawal_txn, deposit_txn = WalletService.transfer_funds(
            from_wallet_id=self.wallet1.wallet_id,
            to_wallet_id=self.wallet2.wallet_id,
            amount=transfer_amount,
            description='Test transfer'
        )
        
        # Refresh wallets from database
        self.wallet1.refresh_from_db()
        self.wallet2.refresh_from_db()
        
        # Check balances
        self.assertEqual(self.wallet1.balance, initial_balance1 - transfer_amount)
        self.assertEqual(self.wallet2.balance, initial_balance2 + transfer_amount)
        
        # Check transaction records
        self.assertEqual(withdrawal_txn.transaction_type, 'transfer_out')
        self.assertEqual(withdrawal_txn.amount, -transfer_amount)
        self.assertEqual(deposit_txn.transaction_type, 'transfer_in')
        self.assertEqual(deposit_txn.amount, transfer_amount)


class PaymentMethodTestCase(TestCase):
    def setUp(self):
        self.merchant = Merchant.objects.create(
            email='test@example.com',
            merchant_name='Test Merchant',
            owner_name='Test Owner',
            phone='1234567890',
            zipcode='12345',
            province='Test Province',
            city_municipality='Test City',
            barangay='Test Barangay',
            street_name='Test Street',
            house_number='123'
        )
        
        self.wallet = MerchantWallet.objects.create(
            merchant=self.merchant,
            balance=Decimal('1000.00')
        )
    
    def test_payment_method_creation(self):
        """Test payment method creation"""
        payment_details = {
            'phone_number': '09123456789',
            'account_name': 'Test User'
        }
        
        payment_method = PaymentMethodService.add_payment_method(
            wallet_id=self.wallet.wallet_id,
            payment_method_type='gcash',
            payment_details=payment_details,
            display_name='GCash - 09xx xxx x789',
            is_default=True
        )
        
        self.assertEqual(payment_method.wallet, self.wallet)
        self.assertEqual(payment_method.payment_method_type, 'gcash')
        self.assertEqual(payment_method.payment_details, payment_details)
        self.assertTrue(payment_method.is_default)
        self.assertEqual(payment_method.status, 'active')
    
    def test_single_default_payment_method(self):
        """Test that only one payment method can be default per wallet"""
        # Create first payment method as default
        payment_method1 = PaymentMethodService.add_payment_method(
            wallet_id=self.wallet.wallet_id,
            payment_method_type='gcash',
            payment_details={'phone_number': '09111111111'},
            is_default=True
        )
        
        # Create second payment method as default
        payment_method2 = PaymentMethodService.add_payment_method(
            wallet_id=self.wallet.wallet_id,
            payment_method_type='paymaya',
            payment_details={'phone_number': '09222222222'},
            is_default=True
        )
        
        # Refresh first payment method from database
        payment_method1.refresh_from_db()
        
        # First should no longer be default
        self.assertFalse(payment_method1.is_default)
        self.assertTrue(payment_method2.is_default)
