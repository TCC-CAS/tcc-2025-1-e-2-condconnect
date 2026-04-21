document.addEventListener('DOMContentLoaded', async function () {
    const favoritesGrid = document.getElementById('favorites-grid');
    const emptyState = document.getElementById('empty-favorites');

    async function renderFavorites() {
        if (!favoritesGrid) return;

        favoritesGrid.style.display = 'grid';
        favoritesGrid.innerHTML = Array(4).fill(0).map(() => `
            <div class="product-card">
                <div class="product-image-container skeleton" style="height: 280px;"></div>
                <div class="product-info">
                    <div class="skeleton" style="height: 16px; width: 40%; margin-bottom: 12px;"></div>
                    <div class="skeleton" style="height: 24px; width: 80%; margin-bottom: 12px;"></div>
                    <div class="skeleton" style="height: 32px; width: 50%;"></div>
                </div>
            </div>
        `).join('');

        try {
            const favorites = await CondConnect.api('/favoritos/index.php');

            if (favorites.length === 0) {
                favoritesGrid.style.display = 'none';
                if (emptyState) emptyState.style.display = 'flex';
                return;
            }

            if (emptyState) emptyState.style.display = 'none';
            favoritesGrid.style.display = 'grid';

            // Atualizar cache de favoritos
            localStorage.setItem('condconnect_favorites', JSON.stringify(favorites.map(p => p.id)));

            favoritesGrid.innerHTML = favorites.map(produto => {
                const condicaoClass = produto.condicao === 'Novo' ? 'green' : produto.condicao === 'Seminovo' ? 'blue' : 'dark';
                return `
                    <a href="/Templates/detalhes-produto.html?id=${produto.id}" class="product-card" data-id="${produto.id}">
                        <div class="product-image-container">
                            <img src="${produto.foto}" alt="${produto.titulo}" class="product-image">
                            <span class="product-tag ${condicaoClass}">${produto.condicao || 'Usado'}</span>
                            <div class="like-btn" data-id="${produto.id}" style="color: #ef4444;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="product-info">
                            <span class="product-category-tag">${produto.categoria}</span>
                            <h3 class="product-title">${produto.titulo}</h3>
                            <span class="product-price">${produto.preco_fmt}</span>
                            <div class="product-footer">
                                <div class="seller-info">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                    ${produto.vendedor?.nome || ''}
                                </div>
                                <div class="location-info">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    ${produto.vendedor?.localizacao?.split(' - ')[0] || ''}
                                </div>
                            </div>
                        </div>
                    </a>
                `;
            }).join('');

            // Re-render quando favorito for removido via delegação em main.js
            window.addEventListener('storage', () => renderFavorites());

        } catch {
            favoritesGrid.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex';
        }
    }

    renderFavorites();
});
