const API_HOST = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:8000' 
    : 'https://primz.pythonanywhere.com';
const API_BASE = `${API_HOST}/api/staff`;

function showToast(msg) {
    const toast = document.getElementById("toast");
    if(!toast) return;
    toast.textContent = msg;
    toast.className = "show";
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

function getHeaders(isFormData=false) {
    const token = localStorage.getItem('staff_token');
    const headers = { 'Authorization': `Token ${token}` };
    if (!isFormData) headers['Content-Type'] = 'application/json';
    return headers;
}

function checkAuth() {
    if (!localStorage.getItem('staff_token')) {
        window.location.href = 'staff-login.html';
    }
}

function logout() {
    localStorage.removeItem('staff_token');
    window.location.href = 'staff-login.html';
}

if(document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        try {
            const res = await fetch(`${API_BASE}/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('staff_token', data.token);
                window.location.href = 'staff-dashboard.html';
            } else {
                showToast(data.error || 'Login failed');
            }
        } catch(err) {
            showToast('Error connecting to server');
        }
    });
}

async function loadDashboard() {
    try {
        const res = await fetch(`${API_BASE}/dashboard/`, { headers: getHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        
        const stats = document.getElementById('statsContainer');
        if(stats) {
            stats.innerHTML = `
                <div class="card stat-card"><h3>Products</h3><p class="value">${data.total_products}</p></div>
                <div class="card stat-card"><h3>Categories</h3><p class="value">${data.total_categories}</p></div>
                <div class="card stat-card"><h3>Images</h3><p class="value">${data.total_images}</p></div>
            `;
        }

        const tbody = document.getElementById('recentProductsTable');
        if(tbody) {
            tbody.innerHTML = data.recent_products.map(p => `
                <tr>
                    <td><img src="${p.images[0]?.image_url || 'https://via.placeholder.com/50'}" class="thumbnail"></td>
                    <td>${p.name}</td>
                    <td>${p.category}</td>
                    <td><span class="status-badge ${p.is_active ? 'status-active' : 'status-inactive'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
                </tr>
            `).join('');
        }
    } catch(e) {
        console.error("Dashboard error", e);
    }
}

async function loadCategoriesPage() {
    try {
        const res = await fetch(`${API_BASE}/categories/`, { headers: getHeaders() });
        if (!res.ok) return;
        const categories = await res.json();
        const grid = document.getElementById('categoriesGrid');
        if(!grid) return;

        grid.innerHTML = categories.map(cat => `
            <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; position:relative;">
                <div style="position:absolute; top:1rem; right:1rem; display:flex; gap:0.5rem;">
                    <button onclick="openCategoryModal(${cat.id}, '${cat.name.replace(/'/g, "\\'")}')" style="background:none; border:none; color:var(--secondary-text); cursor:pointer; font-size:0.8rem; text-decoration:underline;">Edit</button>
                    <button onclick="deleteCategory(${cat.id}, ${cat.product_count})" style="background:none; border:none; color:#dc3545; cursor:pointer; font-size:0.8rem; text-decoration:underline;">Delete</button>
                </div>
                <div>
                    <h3 style="font-family:'Cormorant Garamond', serif; font-size:1.5rem; color:var(--primary-text); margin-bottom:0.5rem; padding-right:4rem;">${cat.name}</h3>
                    <p style="color:var(--secondary-text); font-size:0.9rem; margin-bottom:1.5rem;">${cat.product_count} Products</p>
                </div>
                <a href="staff-products.html?category=${cat.slug}" class="btn-primary" style="text-align:center; display:block;">Manage Products &rarr;</a>
            </div>
        `).join('');
    } catch(e) {
        console.error("Categories error", e);
    }
}

function openCategoryModal(id = null, name = '') {
    document.getElementById('categoryId').value = id || '';
    document.getElementById('categoryName').value = name;
    document.getElementById('categoryModalTitle').innerText = id ? 'Edit Category' : 'Add Category';
    document.getElementById('categorySubmitBtn').innerText = id ? 'Save Changes' : 'Create Category';
    document.getElementById('categoryModal').style.display = 'flex';
}

function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
    document.getElementById('categoryForm').reset();
}

async function saveCategory(e) {
    e.preventDefault();
    const id = document.getElementById('categoryId').value;
    const name = document.getElementById('categoryName').value;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const method = id ? 'PATCH' : 'POST';
    const url = id ? `${API_BASE}/categories/${id}/` : `${API_BASE}/categories/`;

    try {
        const res = await fetch(url, {
            method: method,
            headers: getHeaders(),
            body: JSON.stringify({ name, slug })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(id ? 'Category updated' : 'Category created');
            closeCategoryModal();
            loadCategoriesPage();
        } else {
            showToast(data.slug ? 'Error: Category name might already exist' : (data.error || 'Error saving category'));
        }
    } catch(e) {
        showToast('Network error');
    }
}

async function deleteCategory(id, productCount) {
    if (productCount > 0) {
        showToast("Cannot delete category containing products. Please move or delete them first.");
        return;
    }
    if (!confirm("Are you sure you want to delete this empty category?")) return;

    try {
        const res = await fetch(`${API_BASE}/categories/${id}/`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (res.ok || res.status === 204) {
            showToast("Category deleted successfully.");
            loadCategoriesPage();
        } else {
            const data = await res.json();
            showToast(data.error || 'Failed to delete category');
        }
    } catch(e) {
        showToast('Network error');
    }
}

async function loadProducts() {
    const urlParams = new URLSearchParams(window.location.search);
    const categorySlug = urlParams.get('category');
    
    if (!categorySlug) {
        window.location.href = 'staff-categories.html';
        return;
    }

    try {
        // Load categories for sidebar
        const catRes = await fetch(`${API_BASE}/categories/`, { headers: getHeaders() });
        if (!catRes.ok) return;
        const categories = await catRes.json();
        
        const sidebar = document.getElementById('categorySidebar');
        let currentCategoryName = "Products";
        
        sidebar.innerHTML = categories.map(cat => {
            const isActive = cat.slug === categorySlug;
            if(isActive) currentCategoryName = cat.name;
            return `
                <li>
                    <a href="staff-products.html?category=${cat.slug}" 
                       style="display:block; padding:0.5rem; text-decoration:none; color: ${isActive ? 'var(--brass)' : 'var(--primary-text)'}; font-weight: ${isActive ? '500' : '400'}; border-left: 3px solid ${isActive ? 'var(--brass)' : 'transparent'}; background-color: ${isActive ? 'var(--background)' : 'transparent'};">
                        ${cat.name}
                    </a>
                </li>
            `;
        }).join('');

        // Update UI headers
        document.getElementById('pageTitle').innerText = currentCategoryName;
        document.title = `${currentCategoryName} - Prizm Lights`;
        
        const navCatName = document.getElementById('navCategoryName');
        navCatName.innerText = currentCategoryName;
        navCatName.href = `staff-products.html?category=${categorySlug}`;
        
        // Ensure singular add button text roughly
        let singularName = currentCategoryName;
        if(singularName.endsWith('s')) singularName = singularName.slice(0, -1);
        
        const addBtn = document.getElementById('addProductBtn');
        addBtn.innerText = `+ Add New ${singularName}`;
        addBtn.href = `staff-product-edit.html?category=${categorySlug}`;

        // Load filtered products
        const res = await fetch(`${API_BASE}/products/?category=${categorySlug}`, { headers: getHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        
        document.getElementById('productCountLabel').innerText = `Showing ${data.length} products in ${currentCategoryName}`;

        const tbody = document.getElementById('productsTable');
        tbody.innerHTML = data.map(p => `
            <tr>
                <td><img src="${p.images[0]?.image_url || 'https://via.placeholder.com/50'}" class="thumbnail"></td>
                <td>${p.name}</td>
                <td><span class="status-badge ${p.is_active ? 'status-active' : 'status-inactive'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <a href="staff-product-edit.html?slug=${p.slug}&category=${categorySlug}" class="btn-secondary" style="padding: 0.25rem 0.75rem;">Edit</a>
                    <button class="btn-danger" style="padding: 0.25rem 0.75rem; margin-left:0.5rem;" onclick="deleteProductDirectly('${p.slug}', '${categorySlug}')">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch(e) {
        console.error("Products error", e);
    }
}

let currentProductSlug = new URLSearchParams(window.location.search).get('slug');
let currentCategorySlug = new URLSearchParams(window.location.search).get('category');

async function initProductEdit() {
    try {
        // Fetch categories to populate dropdown
        const catRes = await fetch(`${API_BASE}/categories/`, { headers: getHeaders() });
        if (!catRes.ok) return;
        const cats = await catRes.json();
        const select = document.getElementById('category_id');
        select.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        let currentCategory = null;

        if (currentProductSlug) {
            // Editing existing
            document.getElementById('pageTitle').innerText = 'Edit Product';
            document.getElementById('navActionName').innerText = 'Edit Product';
            document.getElementById('imageSection').style.display = 'block';
            document.getElementById('deleteBtn').style.display = 'inline-block';
            
            const res = await fetch(`${API_BASE}/products/${currentProductSlug}/`, { headers: getHeaders() });
            if (res.ok) {
                const p = await res.json();
                document.getElementById('name').value = p.name;
                document.getElementById('description').value = p.description || '';
                document.getElementById('dimensions').value = p.dimensions || '';
                document.getElementById('material').value = p.material || '';
                document.getElementById('light_type').value = p.light_type || '';
                document.getElementById('colour').value = p.colour || '';
                document.getElementById('is_active').checked = p.is_active;
                
                // set category in select
                for(let i=0; i<select.options.length; i++){
                    if(select.options[i].text === p.category){
                        select.selectedIndex = i;
                        currentCategory = cats.find(c => c.id == select.options[i].value);
                        break;
                    }
                }
                renderImages(p.images);
            }
        } else if (currentCategorySlug) {
            // New product, pre-select category
            currentCategory = cats.find(c => c.slug === currentCategorySlug);
            if(currentCategory) {
                select.value = currentCategory.id;
            }
        }

        if(currentCategory) {
            document.getElementById('categoryNameDisplay').innerText = currentCategory.name;
            const navCat = document.getElementById('navCategoryName');
            navCat.innerText = currentCategory.name;
            navCat.href = `staff-products.html?category=${currentCategory.slug}`;
            currentCategorySlug = currentCategory.slug; // ensure it's set
        } else {
            // fallback if no category context
            window.location.href = 'staff-categories.html';
        }

    } catch(e) {
        console.error("Edit init error", e);
    }
}

async function saveProduct() {
    const data = {
        name: document.getElementById('name').value,
        category_id: document.getElementById('category_id').value,
        description: document.getElementById('description').value,
        dimensions: document.getElementById('dimensions').value,
        material: document.getElementById('material').value,
        light_type: document.getElementById('light_type').value,
        colour: document.getElementById('colour').value,
        is_active: document.getElementById('is_active').checked,
    };
    
    // Slugify name roughly
    data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const method = currentProductSlug ? 'PATCH' : 'POST';
    const url = currentProductSlug ? `${API_BASE}/products/${currentProductSlug}/` : `${API_BASE}/products/`;
    
    try {
        const res = await fetch(url, {
            method: method,
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (res.ok) {
            showToast('Product saved successfully!');
            if (!currentProductSlug) {
                setTimeout(() => window.location.href = `staff-product-edit.html?slug=${result.slug}&category=${currentCategorySlug}`, 1000);
            }
        } else {
            showToast('Error saving product');
        }
    } catch (e) {
        showToast('Network error');
    }
}

// from edit page
async function deleteProduct() {
    if(!confirm("Are you sure you want to delete this product? All its Cloudinary images will also be permanently deleted. This cannot be undone.")) return;
    await performProductDelete(currentProductSlug, currentCategorySlug);
}

// from list page
async function deleteProductDirectly(slug, catSlug) {
    if(!confirm("Are you sure you want to delete this product? All its Cloudinary images will also be permanently deleted. This cannot be undone.")) return;
    await performProductDelete(slug, catSlug, true);
}

async function performProductDelete(slug, catSlug, reloadList=false) {
    try {
        const res = await fetch(`${API_BASE}/products/${slug}/`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (res.ok || res.status === 204) {
            showToast('Product and its images deleted safely.');
            if(reloadList) {
                loadProducts();
            } else {
                setTimeout(() => window.location.href = `staff-products.html?category=${catSlug}`, 1500);
            }
        } else {
            const data = await res.json();
            showToast('Failed to delete: ' + (data.error || 'Unknown error'));
        }
    } catch(e) {
        showToast('Network error');
    }
}

function renderImages(images) {
    const grid = document.getElementById('imageGrid');
    if(!grid) return;
    grid.innerHTML = images.map(img => `
        <div class="image-item">
            ${img.is_primary ? '<span class="primary-badge">Primary</span>' : ''}
            <img src="${img.image_url}">
            <div class="image-actions">
                <button class="btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;" onclick="deleteImage(${img.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

async function uploadImage() {
    const fileInput = document.getElementById('imageUpload');
    if (fileInput.files.length === 0) return showToast("Select an image first");

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    showToast("Uploading to Cloudinary...");
    
    try {
        const res = await fetch(`${API_BASE}/products/${currentProductSlug}/images/`, {
            method: 'POST',
            headers: getHeaders(true),
            body: formData
        });
        if (res.ok) {
            showToast("Upload successful!");
            fileInput.value = '';
            initProductEdit(); // reload product to update images
        } else {
            const data = await res.json();
            showToast("Upload failed: " + (data.error || ""));
        }
    } catch(e) {
        showToast('Network error');
    }
}

async function deleteImage(imageId) {
    if(!confirm("Delete this image permanently from Cloudinary and the database?")) return;
    
    try {
        const res = await fetch(`${API_BASE}/products/${currentProductSlug}/images/${imageId}/`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (res.ok || res.status === 204) {
            showToast("Image deleted successfully");
            initProductEdit();
        } else {
            const data = await res.json();
            showToast("Failed to delete: " + (data.error || ""));
        }
    } catch (e) {
        showToast('Network error');
    }
}
