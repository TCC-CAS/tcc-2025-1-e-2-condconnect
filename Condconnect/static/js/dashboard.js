document.addEventListener('DOMContentLoaded', function () {
    // Render Recent Products
    function renderRecentProducts() {
        const recentGrid = document.getElementById('recent-products-grid');
        if (!recentGrid) return;

        // Show skeletons first
        recentGrid.innerHTML = Array(4).fill(0).map(() => `
            <div class="product-card">
                <div class="product-image-container skeleton" style="height: 220px;"></div>
                <div class="product-info">
                    <div class="skeleton" style="height: 12px; width: 30%; margin-bottom: 8px;"></div>
                    <div class="skeleton" style="height: 18px; width: 70%; margin-bottom: 8px;"></div>
                    <div class="skeleton" style="height: 24px; width: 40%; margin-bottom: 16px;"></div>
                    <div class="product-footer">
                        <div class="skeleton" style="height: 12px; width: 40%;"></div>
                    </div>
                </div>
            </div>
        `).join('');

        setTimeout(() => {
            const products = CondConnect.getProducts().slice(0, 4);

            if (products.length === 0) {
                recentGrid.innerHTML = '<p class="empty-state">Nenhum produto anunciado ainda.</p>';
                return;
            }

            recentGrid.innerHTML = products.map(product => `
                <a href="/Templates/detalhes-produto.html?id=${product.id}" class="product-card">
                    <div class="product-image-container">
                        <img src="${product.image}" alt="${product.title}" class="product-image">
                        <span class="product-tag ${product.condition === 'Novo' ? 'green' : (product.condition === 'Seminovo' ? 'blue' : 'dark')}">${product.condition || 'Usado'}</span>
                        <div class="like-btn" data-id="${product.id}">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path
                                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 0 0 0 0-7.78z">
                                </path>
                            </svg>
                        </div>
                    </div>
                    <div class="product-info">
                        <span class="product-category">${product.category.charAt(0).toUpperCase() + product.category.slice(1)}</span>
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
                        </div>
                    </div>
                </a>
            `).join('');

            // Sync hearts if main.js is loaded
            if (CondConnect.syncHearts) {
                CondConnect.syncHearts();
            }
        }, 800);
    }

    renderRecentProducts();
});
