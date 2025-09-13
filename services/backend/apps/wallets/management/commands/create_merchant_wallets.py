from django.core.management.base import BaseCommand
from django.db import transaction
from apps.merchants.models import Merchant
from apps.wallets.services import WalletService


class Command(BaseCommand):
    help = 'Create wallets for existing merchants who do not have wallets yet'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating wallets',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Find merchants without wallets
        merchants_without_wallets = Merchant.objects.filter(wallet__isnull=True)
        
        if not merchants_without_wallets.exists():
            self.stdout.write(
                self.style.SUCCESS('All merchants already have wallets.')
            )
            return
        
        self.stdout.write(
            f'Found {merchants_without_wallets.count()} merchants without wallets:'
        )
        
        created_count = 0
        
        for merchant in merchants_without_wallets:
            self.stdout.write(
                f'  - {merchant.merchant_name} (ID: {merchant.id})'
            )
            
            if not dry_run:
                try:
                    with transaction.atomic():
                        wallet = WalletService.create_merchant_wallet(merchant)
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'    Created wallet {wallet.wallet_id} for {merchant.merchant_name}'
                            )
                        )
                        created_count += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f'    Failed to create wallet for {merchant.merchant_name}: {str(e)}'
                        )
                    )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would create {merchants_without_wallets.count()} wallets. '
                    'Run without --dry-run to actually create them.'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created {created_count} wallets.'
                )
            )
