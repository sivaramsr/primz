import os
from pathlib import Path
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from core.models import Category, Product, ProductImage
from core.services.cloudinary_service import upload_image

class Command(BaseCommand):
    help = 'Import extra images from Products folder to Cloudinary and update Django DB'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting extra product images import...")

        # Locate Products directory (4 levels up from this file)
        backend_dir = Path(__file__).resolve().parent.parent.parent.parent
        products_dir = backend_dir.parent / 'Products'

        if not products_dir.exists():
            self.stdout.write(self.style.ERROR(f"Products directory not found at {products_dir}"))
            return

        category_mapping = {
            'Ceiling Lights': ('CELING LIGHTS', 'celing-lights', 'Ceiling Light'),
            'Commercial Lights': ('ALL COMMERCIAL LIGHTS', 'all-commercial-lights', 'Commercial Light'),
            'Gate Lights': ('GATE LIGHTS', 'gate-lights', 'Gate Light'),
            'hanging lights': ('HANGING LIGHTS', 'hanging-lights', 'Hanging Light'),
            'Heigh Ceiling Lights': ('HIGH CELING LIGHTS', 'high-celing-lights', 'High Ceiling Light'),
            'LED Mirror Lights': ('LED Mirror Lights', 'led-mirror-lights', 'LED Mirror Light'),
            'Mirror lights': ('MIRROR LIGHTS', 'mirror-lights', 'Mirror Light'),
            'Outdoor Lights': ('OUTDOOR LIGHTS', 'outdoor-lights', 'Outdoor Light'),
            'Wall Lights': ('WALL LIGHTS', 'wall-lights', 'Wall Light'),
        }

        total_files = 0
        uploaded_count = 0
        skipped_count = 0
        failed_count = 0

        for folder_name, (cat_name, cat_slug, prefix) in category_mapping.items():
            folder_path = products_dir / folder_name
            if not folder_path.exists():
                self.stdout.write(self.style.WARNING(f"Folder {folder_name} does not exist, skipping."))
                continue

            category, _ = Category.objects.get_or_create(
                slug=cat_slug,
                defaults={'name': cat_name}
            )

            files = sorted([f for f in folder_path.iterdir() if f.is_file()])
            self.stdout.write(f"\n--- Processing '{cat_name}' ({len(files)} files) ---")

            for idx, img_file in enumerate(files, 1):
                total_files += 1

                # Check if it's the original w01..w28 files in Wall Lights
                if folder_name == 'Wall Lights' and img_file.name.startswith('w') and img_file.name[1:3].isdigit():
                    w_num = img_file.name[1:3]
                    wall_slug = f"wall-light-w{w_num}"
                    try:
                        existing_p = Product.objects.get(slug=wall_slug)
                        if existing_p.images.filter(image_url__icontains='cloudinary').exists():
                            skipped_count += 1
                            continue
                    except Product.DoesNotExist:
                        pass

                # Unique slug for extra/new product images
                prod_slug = slugify(f"{cat_slug}-ext-{img_file.stem}")[:250]
                prod_name = f"{prefix} {img_file.stem.replace('WhatsApp Image ', '').replace('at ', '')[:40]}"

                # Check if product with this slug already exists and has a Cloudinary image
                existing_product = Product.objects.filter(slug=prod_slug).first()
                if existing_product and existing_product.images.filter(image_url__icontains='cloudinary').exists():
                    skipped_count += 1
                    continue

                # Upload image to Cloudinary
                folder_cloudinary = f"lighting-products/{cat_slug}"
                try:
                    with open(img_file, 'rb') as f:
                        res = upload_image(f, folder=folder_cloudinary)

                    if not res or 'url' not in res:
                        self.stdout.write(self.style.ERROR(f"Failed upload for {img_file.name}: invalid response"))
                        failed_count += 1
                        continue

                    # Create or update Product
                    product, created = Product.objects.get_or_create(
                        slug=prod_slug,
                        defaults={
                            'name': prod_name,
                            'category': category,
                            'description': f"Premium {prefix} fixture from Prizm Lights collection.",
                            'is_active': True,
                        }
                    )

                    # Check if ProductImage already exists
                    img_obj, img_created = ProductImage.objects.get_or_create(
                        product=product,
                        image_url=res['url'],
                        defaults={
                            'cloudinary_public_id': res['public_id'],
                            'is_primary': True,
                            'display_order': 1
                        }
                    )

                    uploaded_count += 1
                    self.stdout.write(self.style.SUCCESS(f"[{total_files}] Uploaded: {img_file.name} -> Product ID {product.id}"))

                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"[{total_files}] Error uploading {img_file.name}: {e}"))
                    failed_count += 1

        self.stdout.write("\n" + "="*50)
        self.stdout.write(self.style.SUCCESS(f"Import Finished!"))
        self.stdout.write(f"Total files checked: {total_files}")
        self.stdout.write(f"Already present (skipped): {skipped_count}")
        self.stdout.write(f"Newly uploaded: {uploaded_count}")
        self.stdout.write(f"Failed: {failed_count}")
        self.stdout.write("="*50)
