from django.core.management.base import BaseCommand
from core.models import Product

DEFAULT_SPECS = {
    'wall-lights': {
        'dimensions': 'W 15cm x H 30cm',
        'material': 'Metal Alloy & Frosted Glass',
        'light_type': 'Warm White LED (3000K)',
        'colour': 'Satin Brass & Black',
    },
    'hanging-lights': {
        'dimensions': 'Ø 40cm x Drop Max 120cm',
        'material': 'Brushed Metal & Opal Glass',
        'light_type': 'Integrated Warm LED (3000K)',
        'colour': 'Gold & Clear Glass',
    },
    'celing-lights': {
        'dimensions': 'Ø 50cm x H 12cm',
        'material': 'Anodized Aluminum & Acrylic',
        'light_type': 'Dimmable LED (3000K)',
        'colour': 'Matte White & Brass',
    },
    'gate-lights': {
        'dimensions': 'W 20cm x H 40cm',
        'material': 'Weatherproof Die-Cast Aluminum',
        'light_type': 'Low-Voltage Outdoor LED (3000K)',
        'colour': 'Textured Black',
    },
    'mirror-lights': {
        'dimensions': 'W 50cm x H 15cm',
        'material': 'Stainless Steel & Opal Glass',
        'light_type': 'High-CRI LED (3000K/4000K)',
        'colour': 'Chrome Finish',
    },
    'led-mirror-lights': {
        'dimensions': 'W 60cm x H 80cm',
        'material': 'HD Silver Mirror & Stainless Steel',
        'light_type': 'Dual-Tone Touch LED (3000K-6000K)',
        'colour': 'Frameless / Warm Gold Trim',
    },
    'high-celing-lights': {
        'dimensions': 'Ø 80cm x Drop Max 200cm',
        'material': 'K9 Crystal & Stainless Steel',
        'light_type': 'High-Lumen LED (3000K)',
        'colour': 'Champagne Gold & Clear Crystal',
    },
    'outdoor-lights': {
        'dimensions': 'W 15cm x H 25cm',
        'material': 'IP65 Powder-Coated Aluminum',
        'light_type': 'Outdoor Waterproof LED (3000K)',
        'colour': 'Satin Black',
    },
    'all-commercial-lights': {
        'dimensions': 'Custom / Profile Architectural',
        'material': 'Aluminum Channel & Polycarbonate',
        'light_type': 'High-CRI Commercial LED (4000K)',
        'colour': 'Anodized Silver / Black',
    },
}

class Command(BaseCommand):
    help = 'Populate default technical specifications for products with missing specs'

    def handle(self, *args, **kwargs):
        self.stdout.write("Populating technical specifications for catalog products...")
        updated_count = 0

        for product in Product.objects.select_related('category').all():
            cat_slug = product.category.slug if product.category else ''
            specs = DEFAULT_SPECS.get(cat_slug, {
                'dimensions': 'Standard Dimensions',
                'material': 'Premium Alloy & Glass',
                'light_type': 'Warm LED (3000K)',
                'colour': 'As Shown',
            })

            changed = False
            if not product.dimensions:
                product.dimensions = specs['dimensions']
                changed = True
            if not product.material:
                product.material = specs['material']
                changed = True
            if not product.light_type:
                product.light_type = specs['light_type']
                changed = True
            if not product.colour:
                product.colour = specs['colour']
                changed = True

            if changed:
                product.save()
                updated_count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully populated specifications for {updated_count} products!"))
