document.addEventListener('DOMContentLoaded', function () {
    const favoritesGrid = document.getElementById('favorites-grid');
    const emptyState = document.getElementById('empty-favorites');

    function renderFavorites() {
        const favorites = JSON.parse(localStorage.getItem('condconnect_favorites')) || [];

        if (favorites.length === 0) {
            favoritesGrid.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        favoritesGrid.style.display = 'grid';

        favoritesGrid.innerHTML = favorites.map(product => `
            <a href="/Templates/detalhes-produto.html?id=${product.id}" class="product-card" data-id="${product.id}">
                <div class="product-image-container">
                    <img src="${product.image}" alt="${product.title}" class="product-image">
                    <span class="product-tag ${product.condition === 'Novo' ? 'green' : (product.condition === 'Seminovo' ? 'blue' : 'dark')}">${product.condition || 'Usado'}</span>
                    <div class="like-btn" data-id="${product.id}" style="color: #ef4444;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
    }

    // Listen for storage changes to update if a favorite is removed from another tab or via delegation
    window.addEventListener('storage', renderFavorites);

    // Initial render
    renderFavorites();
});
