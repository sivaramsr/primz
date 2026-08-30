from rest_framework import viewsets, mixins
from django.db import models
from core.models import Category, Product
from api.serializers import CategorySerializer, ProductSerializer

class CategoryViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Category.objects.annotate(product_count=models.Count('products')).order_by('name')
    serializer_class = CategorySerializer

class ProductViewSet(mixins.RetrieveModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Product.objects.filter(is_active=True).prefetch_related('images', 'category')
    serializer_class = ProductSerializer
    lookup_field = 'slug'
