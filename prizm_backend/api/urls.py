from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.test_upload import TestUploadView
from .views.product_views import CategoryViewSet, ProductViewSet
from .views.staff_views import CustomAuthToken, StaffDashboardView, StaffCategoryViewSet, StaffProductViewSet, StaffProductImageViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')

staff_router = DefaultRouter()
staff_router.register(r'categories', StaffCategoryViewSet, basename='staff-category')
staff_router.register(r'products', StaffProductViewSet, basename='staff-product')
staff_router.register(r'products/(?P<product_slug>[^/.]+)/images', StaffProductImageViewSet, basename='staff-product-images')

urlpatterns = [
    path('test-upload/', TestUploadView.as_view(), name='test-upload'),
    path('staff/login/', CustomAuthToken.as_view(), name='staff-login'),
    path('staff/dashboard/', StaffDashboardView.as_view(), name='staff-dashboard'),
    path('staff/', include(staff_router.urls)),
    path('', include(router.urls)),
]
