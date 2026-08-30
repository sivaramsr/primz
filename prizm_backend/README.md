# Prizm Lights Backend

This is the backend foundation for the Prizm Lights premium catalog, built with Django, Django REST Framework, PostgreSQL, and Cloudinary.

## Prerequisites

- Python 3.10+
- PostgreSQL
- Cloudinary account

## Local Setup

1. **Navigate to the backend folder**
   ```bash
   cd prizm_backend
   ```

2. **Set up the virtual environment**
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables**
   Copy the example environment file and fill in your actual credentials.
   ```bash
   cp .env.example .env
   ```
   *Note: Make sure your PostgreSQL server is running and the database matches `DB_NAME` in your `.env`.*

5. **Run Migrations**
   ```bash
   python manage.py migrate
   ```

6. **Start the Development Server**
   ```bash
   python manage.py runserver
   ```

## Testing the Cloudinary Upload API

Once the server is running, you can test the Cloudinary image upload endpoint using `curl` or Postman.

**Endpoint:** `POST http://localhost:8000/api/test/upload/`

**Using cURL:**
```bash
curl -X POST http://localhost:8000/api/test/upload/ \
  -H "Content-Type: multipart/form-data" \
  -F "image=@/path/to/your/test_image.jpg"
```

You should receive a JSON response containing the uploaded image URL and `public_id`.
