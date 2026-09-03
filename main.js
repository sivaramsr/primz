/* 
  PRIZM LIGHTS - PREMIUM SHOWROOM WEBSITE 
  Central Client Logic (JavaScript)
*/

document.addEventListener('DOMContentLoaded', async () => {
  // Ensure user always starts session on Home Page (index.html)
  const currentPath = window.location.pathname;
  const isHomePage = currentPath.endsWith('/') || currentPath.endsWith('/index.html') || currentPath.endsWith('/primz') || currentPath.endsWith('/primz/');

  if (isHomePage) {
    sessionStorage.setItem('prizm_home_visited', 'true');
  } else if (currentPath.includes('collections.html') && !sessionStorage.getItem('prizm_home_visited') && !window.location.search) {
    window.location.href = 'index.html';
    return;
  }

  // 1. INJECT REUSABLE MODALS AND LOADING SCREEN INTO BODY
  injectLoadingScreen();
  injectEnquiryModal();
  injectDetailModal();

  // Initialize early features
  initLoadingScreen();
  initNavigation();
  initScrollAnimations();
  initContactForm();

  // Fetch products from API
  const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:8000' 
    : 'https://primz.pythonanywhere.com';

  try {
    const res = await fetch(`${API_BASE_URL}/api/products/`);
    if (res.ok) {
      const data = await res.json();
      
      // Map API response to the format expected by the frontend
      window.PRIZM_PRODUCTS = data.map(p => ({
        id: String(p.id),
        name: p.name,
        category: p.category,
        description: p.description || '',
        image: p.images && p.images.length > 0 ? p.images[0].image_url : 'https://via.placeholder.com/600x600?text=No+Image',
        specs: {
          "Dimensions": p.dimensions || 'N/A',
          "Material": p.material || 'N/A',
          "Light Type": p.light_type || 'N/A',
          "Colour": p.colour || 'N/A'
        }
      }));
    } else {
      console.error("Failed to load products from API", res.status);
      window.PRIZM_PRODUCTS = [];
    }
  } catch (err) {
    console.error("Network error loading products", err);
    window.PRIZM_PRODUCTS = [];
  }

  // Initialize product-dependent features
  initProducts();
  initProductDetail();
});

/* --- GLOBALS --- */
const WHATSAPP_NUMBER = "916382014890"; // Prizm Lights contact

/* --- 1. MODAL INJECTION & SETUP --- */
function injectEnquiryModal() {
  const modalHTML = `
    <div id="enquiry-modal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="enquiry-title">
      <div class="modal-container">
        <button class="modal-close" id="close-enquiry-btn" aria-label="Close modal">
          <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <h2 id="enquiry-title" class="form-title serif-font">Send Product Enquiry</h2>
        <form id="enquiry-form" class="form-group-container">
          <div class="form-group" style="margin-bottom: 1.25rem;">
            <label for="enquiry-product">Selected Product</label>
            <input type="text" id="enquiry-product" class="form-control" readonly>
          </div>
          <div class="form-grid" style="margin-bottom: 1.25rem;">
            <div class="form-group">
              <label for="enquiry-name">Your Name *</label>
              <input type="text" id="enquiry-name" class="form-control" required placeholder="e.g. John Doe">
            </div>
            <div class="form-group">
              <label for="enquiry-phone">Phone / WhatsApp *</label>
              <input type="tel" id="enquiry-phone" class="form-control" required placeholder="e.g. +91 98765 43210">
            </div>
          </div>
          <div class="form-grid" style="margin-bottom: 1.25rem;">
            <div class="form-group form-group-full">
              <label for="enquiry-qty">Quantity</label>
              <input type="number" id="enquiry-qty" class="form-control" min="1" value="1" required>
            </div>
          </div>
          <div class="form-group" style="margin-bottom: 2rem;">
            <label for="enquiry-msg">Additional Requirements</label>
            <textarea id="enquiry-msg" class="form-control" placeholder="Specify finish preferences, height requirements, or installation queries..."></textarea>
          </div>
          <button type="submit" class="btn btn-whatsapp" style="width: 100%;">
            Send Enquiry on WhatsApp
          </button>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function injectDetailModal() {
  const modalHTML = `
    <div id="detail-modal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="detail-name">
      <div class="modal-container modal-container-large">
        <button class="modal-close" id="close-detail-btn" aria-label="Close details">
          <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="product-detail-grid">
          <div class="detail-img-box">
            <img id="detail-img" src="" alt="Product Image">
          </div>
          <div class="detail-info-box">
            <span id="detail-category" class="detail-category">Category</span>
            <h2 id="detail-name" class="detail-name">Product Name</h2>
            <p id="detail-desc" class="detail-desc">Detailed product description.</p>
            
            <table class="detail-specs-table">
              <tbody id="detail-specs-body">
                <!-- Dynamically populated rows -->
              </tbody>
            </table>
            
            <button id="detail-enquire-btn" class="btn btn-primary">Enquire Now</button>
          </div>
        </div>
        <div id="modal-related-container" style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
          <h4 style="font-family: 'Cormorant Garamond', serif; font-size: 1.25rem; color: var(--primary-text); margin-bottom: 1rem;">Recommended in <span id="modal-related-cat-name" style="color: var(--brass);">this Category</span></h4>
          <div id="modal-related-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 0.75rem;">
            <!-- Mini recommended thumbnails -->
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/* --- 2. LOADING SCREEN (HOME PAGE ONLY) --- */
function isHomePage() {
  const path = window.location.pathname;
  return path.endsWith('/') || path.endsWith('/index.html') || path.endsWith('/primz') || path.endsWith('/primz/');
}

function injectLoadingScreen() {
  if (!isHomePage()) return;
  if (document.getElementById('loading-screen')) return;
  const loaderHTML = `
    <div id="loading-screen">
      <div class="loading-content">
        <div class="loader-glowing-back"></div>
        <div class="logo-wordmark logo-dark-bg" style="transform: scale(1.3); transform-origin: center; margin-bottom: 0.5rem; justify-content: center; display: inline-flex; align-items: center; gap: 0.65rem;">
          <img src="logo.png" alt="Prizm Lights Logo" class="logo-icon-img loader-logo-img">
          <div class="logo-text-block">
            <div class="logo-main-text" style="font-size: 2rem;">
              <span class="char-pri animated-letter" style="animation-delay: 0.1s;">P</span>
              <span class="char-pri animated-letter" style="animation-delay: 0.2s;">R</span>
              <span class="char-pri animated-letter" style="animation-delay: 0.3s;">I</span>
              <span class="char-sec animated-letter flicker-char" style="animation-delay: 0.4s;">Z</span>
              <span class="char-pri animated-letter" style="animation-delay: 0.5s;">M</span>
              <span class="logo-space"></span>
              <span class="char-sec logo-l animated-letter flicker-char" style="animation-delay: 0.6s;">L</span>
              <span class="char-pri animated-letter" style="animation-delay: 0.7s;">I</span>
              <span class="char-pri animated-letter" style="animation-delay: 0.8s;">G</span>
              <span class="char-pri animated-letter" style="animation-delay: 0.9s;">H</span>
              <span class="char-pri animated-letter" style="animation-delay: 1.0s;">T</span>
              <span class="char-pri animated-letter" style="animation-delay: 1.1s;">S</span>
            </div>
            <div class="logo-slogan loader-slogan-animate" style="font-size: 0.75rem; margin-top: 0.5rem; text-align: left; width: 100%;">Light makes Better Sight</div>
          </div>
        </div>
        <div class="loader-bar-container">
          <div class="loader-bar-fill"></div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('afterbegin', loaderHTML);
}

function initLoadingScreen() {
  const loader = document.getElementById('loading-screen');
  if (!loader) return;

  if (!isHomePage()) {
    loader.style.display = 'none';
    document.body.style.overflow = '';
    return;
  }

  // Show for 2.6 seconds, then fade out
  setTimeout(() => {
    loader.classList.add('fade-out');
    // Enable scroll on body after load
    document.body.style.overflow = '';
  }, 2600);

  // Temporarily disable scroll on body while loader is active
  document.body.style.overflow = 'hidden';
}

/* --- 3. STICKY NAV & MOBILE MENU --- */
function initNavigation() {
  const header = document.querySelector('header');
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  // Sticky Scroll Class
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Mobile Hamburger Toggle
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      menuToggle.classList.toggle('open');
      navLinks.classList.toggle('open');
    });

    // Close mobile menu when clicking a link
    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('open');
        navLinks.classList.remove('open');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
        menuToggle.classList.remove('open');
        navLinks.classList.remove('open');
      }
    });
  }
}

/* --- 4. SCROLL REVEAL EFFECT --- */
function initScrollAnimations() {
  const reveals = document.querySelectorAll('.reveal');
  
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    });

    reveals.forEach(reveal => observer.observe(reveal));
  } else {
    // Fallback for older browsers
    const revealOnScroll = () => {
      reveals.forEach(reveal => {
        const windowHeight = window.innerHeight;
        const revealTop = reveal.getBoundingClientRect().top;
        const revealPoint = 150;

        if (revealTop < windowHeight - revealPoint) {
          reveal.classList.add('active');
        }
      });
    };
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Trigger initial check
  }
}

/* --- 5. PRODUCTS RENDER & FILTERING --- */
let activeDetailProduct = null;

function initProducts() {
  // Check which page we are on
  const featuredGrid = document.getElementById('featured-products-grid');
  const collectionsGrid = document.getElementById('collections-grid');
  const filterContainer = document.querySelector('.filter-container');

  if (!window.PRIZM_PRODUCTS) return;

  // Render on Homepage
  if (featuredGrid) {
    // Render first 6 products for homepage
    const featuredList = window.PRIZM_PRODUCTS.slice(0, 6);
    renderProductGrid(featuredGrid, featuredList);
  }

  // Render on Collections Page
  if (collectionsGrid) {
    const searchInput = document.getElementById('catalog-search');
    const sortSelect = document.getElementById('catalog-sort');
    const countLabel = document.getElementById('product-count-label');
    const checkboxesList = document.getElementById('categories-checkbox-list');
    const checkboxes = checkboxesList ? checkboxesList.querySelectorAll('.checkbox-input') : [];

    // Filter and Sort function
    function updateCatalog() {
      let filtered = [...window.PRIZM_PRODUCTS];

      // 1. Filter by category checkboxes
      if (checkboxes.length > 0) {
        const checkedValues = Array.from(checkboxes)
          .filter(cb => cb.checked)
          .map(cb => cb.value.toUpperCase());

        if (checkedValues.length > 0) {
          filtered = filtered.filter(p => checkedValues.includes(p.category.toUpperCase()));
        }
      }

      // 2. Filter by search input
      if (searchInput) {
        const query = searchInput.value.trim().toLowerCase();
        if (query) {
          filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.description.toLowerCase().includes(query)
          );
        }
      }

      // 3. Sort products
      if (sortSelect) {
        const sortBy = sortSelect.value;
        if (sortBy === 'name-asc') {
          filtered.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'name-desc') {
          filtered.sort((a, b) => b.name.localeCompare(a.name));
        } else {
          // Default popularity order: reset to original products.js indexing
          const originalIds = window.PRIZM_PRODUCTS.map(p => p.id);
          filtered.sort((a, b) => originalIds.indexOf(a.id) - originalIds.indexOf(b.id));
        }
      }

      // Update product count label
      if (countLabel) {
        countLabel.textContent = `Showing ${filtered.length} of ${window.PRIZM_PRODUCTS.length} products`;
      }

      // Render product grid
      renderProductGrid(collectionsGrid, filtered);
    }

    // Add event listeners for controls
    if (checkboxesList) {
      checkboxesList.addEventListener('change', updateCatalog);
    }
    if (searchInput) {
      searchInput.addEventListener('input', updateCatalog);
    }
    if (sortSelect) {
      sortSelect.addEventListener('change', updateCatalog);
    }

    // Check URL parameters for categories (e.g. ?filter=Ceiling+Lights)
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');
    if (filterParam && checkboxes.length > 0) {
      const matchingCheckbox = Array.from(checkboxes).find(cb => {
        const val = cb.value.toLowerCase().replace(/\s+/g, '');
        const param = filterParam.toLowerCase().replace(/\s+/g, '');
        return val === param || 
               val.replace('celing', 'ceiling') === param || 
               val === param.replace('celing', 'ceiling') ||
               val.replace('celing', 'ceiling') === param.replace('celing', 'ceiling');
      });

      if (matchingCheckbox) {
        matchingCheckbox.checked = true;
      }
    }

    // Run initial catalog render
    updateCatalog();
  }

  // Bind Event Listeners for Product Actions (Bubbled)
  document.addEventListener('click', (e) => {
    // 1. Enquire Button Trigger
    const enquireBtn = e.target.closest('.action-enquire');
    if (enquireBtn) {
      const productId = enquireBtn.getAttribute('data-product-id');
      const product = window.PRIZM_PRODUCTS.find(p => p.id === productId);
      if (product) {
        openEnquiryModal(product.name);
      }
    }

    // 2. Card Detail Click - Redirect to Standalone Detail Page
    const cardImgBox = e.target.closest('.product-img-wrapper');
    const cardTitle = e.target.closest('.product-name');
    if (cardImgBox || cardTitle) {
      const card = e.target.closest('.product-card');
      if (card) {
        const productId = card.getAttribute('data-product-id');
        const product = window.PRIZM_PRODUCTS.find(p => p.id === productId);
        if (product) {
          window.location.href = `product-detail.html?id=${product.id}`;
        }
      }
    }
  });

  // Modal Closures
  const closeEnquiry = document.getElementById('close-enquiry-btn');
  const closeDetail = document.getElementById('close-detail-btn');
  const enquiryOverlay = document.getElementById('enquiry-modal');
  const detailOverlay = document.getElementById('detail-modal');

  if (closeEnquiry && enquiryOverlay) {
    closeEnquiry.addEventListener('click', () => closeAllModals());
    enquiryOverlay.addEventListener('click', (e) => {
      if (e.target === enquiryOverlay) closeAllModals();
    });
  }

  if (closeDetail && detailOverlay) {
    closeDetail.addEventListener('click', () => closeAllModals());
    detailOverlay.addEventListener('click', (e) => {
      if (e.target === detailOverlay) closeAllModals();
    });
  }

  // Detail Modal Enquire Trigger
  const detailEnquireBtn = document.getElementById('detail-enquire-btn');
  if (detailEnquireBtn) {
    detailEnquireBtn.addEventListener('click', () => {
      if (activeDetailProduct) {
        // Close detail modal, then open enquiry modal
        const prodName = activeDetailProduct.name;
        closeAllModals();
        setTimeout(() => {
          openEnquiryModal(prodName);
        }, 150);
      }
    });
  }

  // Form Submission
  const enquiryForm = document.getElementById('enquiry-form');
  if (enquiryForm) {
    enquiryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const productName = document.getElementById('enquiry-product').value;
      const customerName = document.getElementById('enquiry-name').value;
      const phoneNumber = document.getElementById('enquiry-phone').value;
      const quantity = document.getElementById('enquiry-qty').value;
      const message = document.getElementById('enquiry-msg').value;

      sendWhatsAppEnquiry({
        productName,
        customerName,
        phoneNumber,
        quantity,
        message
      });

      closeAllModals();
      enquiryForm.reset();
    });
  }
}

function renderProductGrid(gridContainer, productList) {
  gridContainer.innerHTML = '';
  
  if (productList.length === 0) {
    gridContainer.innerHTML = `
      <div class="text-center" style="grid-column: 1 / -1; padding: 4rem 0; color: var(--stone);">
        <p class="serif-font" style="font-size: 1.5rem; margin-bottom: 0.5rem;">No items found</p>
        <p style="font-size: 0.9rem;">We are constantly expanding our collections. Please contact us for bespoke requests.</p>
      </div>
    `;
    return;
  }

  productList.forEach(prod => {
    // Generate Specs Sublist
    let specsHTML = '';
    const specKeys = Object.keys(prod.specs)
      .filter(key => key.toLowerCase() !== 'wattage')
      .slice(0, 4); // Display first 4 non-wattage specs on card
    specKeys.forEach(key => {
      specsHTML += `
        <div class="product-spec-item">
          <strong>${key}</strong>
          <span>${prod.specs[key]}</span>
        </div>
      `;
    });

    const cardHTML = `
      <article class="product-card reveal active" data-product-id="${prod.id}">
        <div class="product-img-wrapper" title="Click to view details">
          <img src="${prod.image}" alt="${prod.name}" loading="lazy">
        </div>
        <div class="product-info">
          <span class="product-category">${prod.category}</span>
          <h3 class="product-name" style="cursor: pointer;" title="Click to view details">${prod.name}</h3>
          <p class="product-desc">${prod.description}</p>
          <hr class="product-divider">
          <div class="product-specs-list">
            ${specsHTML}
          </div>
          <div class="product-action" style="display: flex; gap: 0.75rem;">
            <a href="product-detail.html?id=${prod.id}" class="btn btn-outline action-details" style="flex: 1; text-align: center; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem; padding: 0.65rem 0.5rem; text-decoration: none;">
              More Details
            </a>
            <button class="btn btn-primary action-enquire" data-product-id="${prod.id}" style="flex: 1; font-size: 0.8rem; padding: 0.65rem 0.5rem;">
              Enquire Now
            </button>
          </div>
        </div>
      </article>
    `;
    gridContainer.insertAdjacentHTML('beforeend', cardHTML);
  });
}

function openEnquiryModal(productName) {
  const modal = document.getElementById('enquiry-modal');
  const input = document.getElementById('enquiry-product');
  if (modal && input) {
    input.value = productName;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function openDetailModal(product) {
  activeDetailProduct = product;
  
  const modal = document.getElementById('detail-modal');
  const img = document.getElementById('detail-img');
  const category = document.getElementById('detail-category');
  const name = document.getElementById('detail-name');
  const desc = document.getElementById('detail-desc');
  const specsBody = document.getElementById('detail-specs-body');

  if (modal && img && category && name && desc && specsBody) {
    img.src = product.image;
    img.alt = product.name;
    category.textContent = product.category;
    name.textContent = product.name;
    desc.textContent = product.description;

    // Load specs
    specsBody.innerHTML = '';
    Object.keys(product.specs).forEach(key => {
      const row = `
        <tr>
          <td>${key}</td>
          <td>${product.specs[key]}</td>
        </tr>
      `;
      specsBody.insertAdjacentHTML('beforeend', row);
    });

    // Render related products in modal
    const modalRelatedCat = document.getElementById('modal-related-cat-name');
    const modalRelatedGrid = document.getElementById('modal-related-grid');
    if (modalRelatedGrid && window.PRIZM_PRODUCTS) {
      if (modalRelatedCat) modalRelatedCat.textContent = product.category;
      const related = window.PRIZM_PRODUCTS
        .filter(p => p.category === product.category && p.id !== product.id)
        .slice(0, 6);
      modalRelatedGrid.innerHTML = related.map(rel => `
        <div class="modal-related-card" data-rel-id="${rel.id}" style="cursor: pointer; text-align: center; background: var(--background); padding: 0.5rem; border-radius: 4px; border: 1px solid var(--border); transition: transform 0.2s;" title="${rel.name}">
          <img src="${rel.image}" alt="${rel.name}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 3px; margin-bottom: 0.25rem;">
          <div style="font-size: 0.7rem; color: var(--primary-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;">${rel.name}</div>
        </div>
      `).join('');

      modalRelatedGrid.querySelectorAll('.modal-related-card').forEach(card => {
        card.addEventListener('click', () => {
          const relId = card.getAttribute('data-rel-id');
          const relProd = window.PRIZM_PRODUCTS.find(p => p.id === relId);
          if (relProd) openDetailModal(relProd);
        });
      });
    }

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.classList.remove('open');
  });
  document.body.style.overflow = '';
  activeDetailProduct = null;
}

/* --- 6. WHATSAPP LINK GENERATOR --- */
function sendWhatsAppEnquiry({ productName, customerName, phoneNumber, quantity, message }) {
  // Built message template
  const textMessage = `Hello Prizm Lights,

I am interested in the following product:

Product: ${productName}
Quantity: ${quantity}

Name: ${customerName}
Phone: ${phoneNumber}
Message: ${message || 'No additional message.'}

I would like to know more about this product and its price.`;

  // Encode message
  const encodedText = encodeURIComponent(textMessage);
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedText}`;

  // Redirect client to WhatsApp (works seamlessly on mobile app / desktop site)
  window.open(waLink, '_blank');
}

/* --- 7. CONTACT PAGE & FORM --- */
function initContactForm() {
  const contactForm = document.getElementById('contact-showroom-form');
  if (!contactForm) return;

  const handleWhatsAppEnquiry = () => {
    const customerName = document.getElementById('contact-name').value;
    const phoneNumber = document.getElementById('contact-phone').value;
    const email = document.getElementById('contact-email').value;
    const reqType = document.getElementById('contact-req').value;
    const message = document.getElementById('contact-msg').value;

    if (!customerName || !phoneNumber || !reqType) {
      contactForm.reportValidity();
      return false;
    }

    const combinedMessage = `Email: ${email || 'N/A'}\nMessage: ${message || 'No additional message.'}`;

    // Reusing the exact central enquiry function
    sendWhatsAppEnquiry({
      productName: reqType,
      customerName: customerName,
      phoneNumber: phoneNumber,
      quantity: "1",
      message: combinedMessage
    });
    
    return true;
  };

  // WhatsApp submit handler on form submit event
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (handleWhatsAppEnquiry()) {
      contactForm.reset();
    }
  });

  // Standard Mock submit handler
  const standardBtn = document.getElementById('btn-standard-submit');
  if (standardBtn) {
    standardBtn.addEventListener('click', () => {
      const customerName = document.getElementById('contact-name').value;
      const phoneNumber = document.getElementById('contact-phone').value;
      const reqType = document.getElementById('contact-req').value;

      if (!customerName || !phoneNumber || !reqType) {
        contactForm.reportValidity();
        return;
      }

      alert("Thank you! Your standard enquiry has been recorded. Our lighting consultants will contact you shortly.");
      contactForm.reset();
    });
  }
}

/* --- 8. STANDALONE PRODUCT DETAIL PAGE BINDING --- */
function initProductDetail() {
  if (!window.location.pathname.includes('product-detail.html')) return;

  const detailImg = document.getElementById('detail-product-img');
  const detailCat = document.getElementById('detail-product-category');
  const detailTitle = document.getElementById('detail-product-title');
  const detailDesc = document.getElementById('detail-product-desc');
  const detailSpecsBody = document.getElementById('detail-product-specs');
  const detailForm = document.getElementById('detail-page-enquiry-form');

  // Verify we are on the product-detail.html page
  if (!detailTitle) return;

  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    window.location.href = 'collections.html';
    return;
  }

  if (!window.PRIZM_PRODUCTS || window.PRIZM_PRODUCTS.length === 0) {
    // Retry shortly if API data is still populating
    setTimeout(initProductDetail, 300);
    return;
  }

  const product = window.PRIZM_PRODUCTS.find(p => p.id === productId);
  if (!product) {
    window.location.href = 'collections.html';
    return;
  }

  // Populate dynamic data
  document.title = `${product.name} | Prizm Lights | Premium Lighting Showroom`;
  if (detailImg) {
    detailImg.src = product.image;
    detailImg.alt = product.name;
  }
  if (detailCat) detailCat.textContent = product.category;
  if (detailTitle) detailTitle.textContent = product.name;
  if (detailDesc) detailDesc.textContent = product.description;

  // Load Specs into Table
  if (detailSpecsBody) {
    detailSpecsBody.innerHTML = '';
    Object.keys(product.specs).forEach(key => {
      if (key.toLowerCase() === 'wattage') return; // Skip Wattage completely
      const row = `
        <tr>
          <td>${key}</td>
          <td>${product.specs[key]}</td>
        </tr>
      `;
      detailSpecsBody.insertAdjacentHTML('beforeend', row);
    });
  }

  // Bind Submit event for WhatsApp enquiry on the detail page
  if (detailForm) {
    detailForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const customerName = document.getElementById('detail-form-name').value;
      const phoneNumber = document.getElementById('detail-form-phone').value;
      const quantity = document.getElementById('detail-form-qty').value;
      const message = document.getElementById('detail-form-msg').value;

      sendWhatsAppEnquiry({
        productName: product.name,
        customerName,
        phoneNumber,
        quantity,
        message
      });

      detailForm.reset();
    });
  }

  // Populate Related Products in this Category (Photo Grid matching Durga Furniture layout)
  const relatedCatName = document.getElementById('related-category-name');
  const relatedGrid = document.getElementById('related-products-grid');
  if (relatedGrid && window.PRIZM_PRODUCTS) {
    if (relatedCatName) relatedCatName.textContent = product.category;
    
    // Filter all other products in the exact same category
    const related = window.PRIZM_PRODUCTS
      .filter(p => p.category === product.category && p.id !== product.id);

    relatedGrid.style.display = 'grid';
    relatedGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(260px, 1fr))';
    relatedGrid.style.gap = '1.5rem';
    relatedGrid.style.marginTop = '1.5rem';

    if (related.length === 0) {
      relatedGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--secondary-text);">No other items in this category currently.</p>`;
    } else {
      relatedGrid.innerHTML = related.map(rel => `
        <div class="related-photo-card" data-id="${rel.id}" style="cursor: pointer; background: #ffffff; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); transition: transform 0.3s ease, box-shadow 0.3s ease;">
          <img src="${rel.image}" alt="${rel.name}" loading="lazy" style="width: 100%; aspect-ratio: 4/5; object-fit: cover; display: block; transition: transform 0.4s ease;">
        </div>
      `).join('');

      // Add click & hover listeners for Durga Furniture style photo cards
      relatedGrid.querySelectorAll('.related-photo-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.getAttribute('data-id');
          window.location.href = `product-detail.html?id=${id}`;
        });
        card.addEventListener('mouseenter', () => {
          card.style.transform = 'translateY(-6px)';
          card.style.boxShadow = '0 12px 30px rgba(0,0,0,0.12)';
          const img = card.querySelector('img');
          if (img) img.style.transform = 'scale(1.05)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.transform = 'translateY(0)';
          card.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)';
          const img = card.querySelector('img');
          if (img) img.style.transform = 'scale(1)';
        });
      });
    }
  }
}

