from rest_framework import viewsets, mixins, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.db import transaction, models

from core.models import Category, Product, ProductImage
from api.serializers import CategorySerializer, ProductSerializer, ProductImageSerializer
from core.services.cloudinary_service import delete_image, upload_image

class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        if not user.is_staff:
            return Response({"error": "Unauthorized. Staff access required."}, status=status.HTTP_403_FORBIDDEN)
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'email': user.email,
            'username': user.username
        })

class StaffDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        products_count = Product.objects.count()
        categories_count = Category.objects.count()
        images_count = ProductImage.objects.count()
        
        recent_products = ProductSerializer(
            Product.objects.order_by('-created_at')[:5], many=True
        ).data

        return Response({
            "total_products": products_count,
            "total_categories": categories_count,
            "total_images": images_count,
            "recent_products": recent_products
        })

class StaffCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Category.objects.annotate(product_count=models.Count('products')).order_by('name')
    serializer_class = CategorySerializer

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        if category.products.exists():
            return Response(
                {"error": "Cannot delete category containing products. Please move or delete the products first."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

class StaffProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        queryset = Product.objects.all().prefetch_related('images', 'category').order_by('-created_at')
        category_slug = self.request.query_params.get('category')
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        return queryset

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        # Delete all images from Cloudinary first
        for image in product.images.all():
            try:
                res = delete_image(image.cloudinary_public_id)
                if res not in ['ok', 'not found']:
                    return Response(
                        {"error": f"Cloudinary deletion failed for image {image.id}"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        # Cloudinary images deleted, now safe to delete product from DB
        return super().destroy(request, *args, **kwargs)

class StaffProductImageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ProductImageSerializer

    def get_queryset(self):
        return ProductImage.objects.filter(product__slug=self.kwargs['product_slug'])

    def create(self, request, *args, **kwargs):
        try:
            product = Product.objects.get(slug=self.kwargs['product_slug'])
        except Product.DoesNotExist:
            return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

        if 'image' not in request.FILES:
            return Response({"error": "No image provided."}, status=status.HTTP_400_BAD_REQUEST)

        image_file = request.FILES['image']
        folder_name = f"lighting-products/{product.category.slug}" if product.category else "lighting-products/uncategorized"
        
        try:
            res = upload_image(image_file, folder=folder_name)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        is_primary = not product.images.exists()
        
        image_obj = ProductImage.objects.create(
            product=product,
            image_url=res['url'],
            cloudinary_public_id=res['public_id'],
            is_primary=is_primary,
            display_order=product.images.count() + 1
        )
        
        return Response(ProductImageSerializer(image_obj).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        image = self.get_object()
        product = image.product
        
        try:
            res = delete_image(image.cloudinary_public_id)
            if res not in ['ok', 'not found']:
                return Response(
                    {"error": f"Cloudinary deletion failed. Result: {res}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
            
        is_primary_deleted = image.is_primary
        image.delete()
        
        if is_primary_deleted:
            next_image = product.images.first()
            if next_image:
                next_image.is_primary = True
                next_image.save()
                
        return Response(status=status.HTTP_204_NO_CONTENT)
