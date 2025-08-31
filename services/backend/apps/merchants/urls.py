from django.urls import path
from . import views

app_name = 'merchants'

urlpatterns = [
    # List and create merchants
    path('', views.MerchantListView.as_view(), name='merchant-list'),
    path('create/', views.MerchantCreateView.as_view(), name='merchant-create'),
    
    # Individual merchant operations
    path('<uuid:id>/', views.MerchantDetailView.as_view(), name='merchant-detail'),
    path('<uuid:id>/update/', views.MerchantUpdateView.as_view(), name='merchant-update'),
    path('<uuid:id>/status/', views.update_merchant_status, name='merchant-status-update'),
    path('<uuid:id>/delete/', views.delete_merchant, name='merchant-delete'),
    
    # Batch operations
    path('batch-action/', views.batch_merchant_action, name='merchant-batch-action'),
    
    # Statistics
    path('statistics/', views.merchant_statistics, name='merchant-statistics'),
]