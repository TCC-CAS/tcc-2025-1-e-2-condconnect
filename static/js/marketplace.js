document.addEventListener('DOMContentLoaded', function () {
    const productGrid = document.getElementById('product-grid');
    const filterButtons = document.querySelectorAll('.filter-btn');

    function showSkeletons() {
        const skeletonHTML = Array(8).fill(0).map(() => `
            <div class="product-card">
                <div class="product-image-container skeleton" style="height: 280px;"></div>
                <div class="product-info">
                    <div class="skeleton" style="height: 16px; width: 40%; margin-bottom: 12px;"></div>
                    <div class="skeleton" style="height: 24px; width: 80%; margin-bottom: 12px;"></div>
                    <div class="skeleton" style="height: 32px; width: 50%; margin-bottom: 24px;"></div>
                    <div class="product-footer">
                        <div class="skeleton" style="height: 14px; width: 30%;"></div>
                        <div class="skeleton" style="height: 14px; width: 30%;"></div>
                    </div>
                </div>
            </div>
        `).join('');
        productGrid.innerHTML = skeletonHTML;
    }

    function renderProducts(category = 'all', searchTerm = '') {
        showSkeletons();

        // Simulate network delay
        setTimeout(() => {
            let products = CondConnect.getProducts();

            // Filter by category
            if (category !== 'all') {
                products = products.filter(p => p.category === category);
            }

            // Filter by search term
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                products = products.filter(p =>
                    p.title.toLowerCase().includes(term) ||
                    p.description.toLowerCase().includes(term)
                );
            }

            if (products.length === 0) {
                productGrid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: #64748b;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px; opacity: 0.5;">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <p style="font-size: 16px; font-weight: 500;">Nenhum produto encontrado.</p>
                        <p style="font-size: 14px; opacity: 0.7;">Tente mudar os filtros ou o termo de busca.</p>
                    </div>
                `;
                return;
            }

            productGrid.innerHTML = products.map(product => `
                <a href="/Templates/detalhes-produto.html?id=${product.id}" class="product-card" data-category="${product.category}" data-id="${product.id}">
                    <div class="product-image-container">
                        <img src="${product.image}" alt="${product.title}" class="product-image">
                        <span class="product-tag ${product.condition === 'Novo' ? 'green' : (product.condition === 'Seminovo' ? 'blue' : 'dark')}">${product.condition || 'Usado'}</span>
                        <div class="like-btn" data-id="${product.id}">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path
                                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z">
                                </path>
                            </svg>
                        </div>
                    </div>
                    <div class="product-info">
                        <span class="product-category-tag">${product.category.charAt(0).toUpperCase() + product.category.slice(1)}</span>
                        <h3 class="product-title">${product.title}</h3>
                        <span class="product-price">${product.price}</span>
                        <div class="product-footer">
                            <div class="seller-info">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                ${product.seller}
                            </div>
                            <div class="location-info">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                ${product.location.split(' - ')[0]}
                            </div>
                        </div>
                    </div>
                </a>
            `).join('');

            // Initial sync of hearts using the global helper in main.js
            if (window.CondConnect && window.CondConnect.syncHearts) {
                window.CondConnect.syncHearts();
            }
        }, 600);
    }

    // Filter Button Logic
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const category = button.getAttribute('data-category');
            renderProducts(category, document.getElementById('marketplace-search').value);
        });
    });

    // Search Input Logic
    const searchInput = document.getElementById('marketplace-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const activeCategory = document.querySelector('.filter-btn.active').getAttribute('data-category');
            renderProducts(activeCategory, e.target.value);
        });
    }

    // Initial render
    renderProducts();
});
