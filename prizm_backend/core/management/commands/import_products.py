import json
import os
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from core.models import Category, Product, ProductImage
from core.services.cloudinary_service import upload_image

class Command(BaseCommand):
    help = 'Import products from products.json to DB and Cloudinary'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting product import...")
        
        json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))), 'products.json')
        frontend_root = os.path.dirname(json_path)

        if not os.path.exists(json_path):
            self.stdout.write(self.style.ERROR(f"products.json not found at {json_path}"))
            return

        with open(json_path, 'r', encoding='utf-8') as f:
            products_data = json.load(f)

        categories_created = 0
        products_imported = 0
        images_uploaded = 0
        images_failed = 0

        for p_data in products_data:
            cat_name = p_data.get('category', 'Uncategorized').strip()
            cat_slug = slugify(cat_name)

            category, created = Category.objects.get_or_create(
                slug=cat_slug,
                defaults={'name': cat_name}
            )
            if created:
                categories_created += 1

            prod_name = p_data.get('name').strip()
            prod_slug = slugify(prod_name)

            specs = p_data.get('specs', {})

            product, p_created = Product.objects.get_or_create(
                slug=prod_slug,
                defaults={
                    'name': prod_name,
                    'category': category,
                    'description': p_data.get('description'),
                    'dimensions': specs.get('Dimensions'),
                    'material': specs.get('Material'),
                    'light_type': specs.get('Light Type'),
                    'colour': specs.get('Colour'),
                }
            )
            if p_created:
                products_imported += 1

            image_path_or_url = p_data.get('image')
            if not image_path_or_url:
                continue

            # Check if image already imported for this product
            if product.images.exists():
                self.stdout.write(f"Skipping image for {product.name}, already exists.")
                continue

            folder_name = f"lighting-products/{cat_slug}"
            
            try:
                if image_path_or_url.startswith('http://') or image_path_or_url.startswith('https://'):
                    # External URL
                    res = upload_image(image_path_or_url, folder=folder_name)
                else:
                    # Local file
                    local_img_path = os.path.join(frontend_root, image_path_or_url)
                    if not os.path.exists(local_img_path):
                        self.stdout.write(self.style.ERROR(f"Local image not found: {local_img_path}"))
                        images_failed += 1
                        continue
                    
                    with open(local_img_path, 'rb') as img_f:
                        res = upload_image(img_f, folder=folder_name)
                
                ProductImage.objects.create(
                    product=product,
                    image_url=res['url'],
                    cloudinary_public_id=res['public_id'],
                    is_primary=True,
                    display_order=1
                )
                images_uploaded += 1
                self.stdout.write(self.style.SUCCESS(f"Uploaded image for {product.name}"))

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to upload image for {product.name}: {e}"))
                images_failed += 1

        self.stdout.write(self.style.SUCCESS(f"Done! Categories created: {categories_created}"))
        self.stdout.write(self.style.SUCCESS(f"Products imported: {products_imported}"))
        self.stdout.write(self.style.SUCCESS(f"Images uploaded: {images_uploaded}"))
        self.stdout.write(self.style.SUCCESS(f"Images failed: {images_failed}"))
