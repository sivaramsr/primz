import cloudinary.uploader
from django.core.exceptions import ValidationError

def upload_image(file_obj, folder="lighting-products/test"):
    """
    Uploads an image file to Cloudinary.
    Returns a dictionary containing the url and public_id.
    """
    try:
        response = cloudinary.uploader.upload(
            file_obj,
            folder=folder
        )
        return {
            'url': response.get('secure_url'),
            'public_id': response.get('public_id')
        }
    except Exception as e:
        raise Exception(f"Failed to upload image to Cloudinary: {str(e)}")

def delete_image(public_id):
    try:
        response = cloudinary.uploader.destroy(public_id)
        return response.get('result')
    except Exception as e:
        raise Exception(f"Failed to delete image from Cloudinary: {str(e)}")
