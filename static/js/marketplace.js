document.addEventListener('DOMContentLoaded', function () {
    const productGrid = document.getElementById('product-grid');
    const filterButtons = document.querySelectorAll('.filter-btn');

    let currentCategory = 'all';
    let searchTerm = '';
    let precoMin = null;
    let precoMax = null;
    let debounceTimer = null;

    function showSkeletons() {
        productGrid.innerHTML = Array(8).fill(0).map(() => `
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
    }

    async function renderProducts() {
        showSkeletons();

        const params = new URLSearchParams();
        if (currentCategory !== 'all') params.set('categoria', currentCategory);
        if (searchTerm) params.set('busca', searchTerm);
        if (precoMin !== null) params.set('preco_min', precoMin);
        if (precoMax !== null) params.set('preco_max', precoMax);

        try {
            const produtos = await CondConnect.api(`/produtos?${params}`);

            / Sincronizar favoritos do servidor
            const favIds = produtos.filter(p => p.favorito).map(p => p.id);
            localStorage.setItem('condconnect_favorites', JSON.stringify(favIds));

            if (produtos.length === 0) {
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

            productGrid.innerHTML = produtos.map(p => CondConnect.renderProdutoCard(p)).join('');
            CondConnect.syncHearts();
        } catch (err) {
            productGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#64748b;">Erro ao carregar produtos. Tente novamente.</div>`;
        }
    }

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentCategory = button.getAttribute('data-category');
            renderProducts();
        });
    });

    const searchInput = document.getElementById('marketplace-search');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            searchTerm = e.target.value;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(renderProducts, 400);
        });
    }

    const minInput = document.getElementById('price-min');
    const maxInput = document.getElementById('price-max');

    [minInput, maxInput].forEach(input => {
        if (!input) return;
        input.addEventListener('input', () => {
            precoMin = minInput?.value ? parseFloat(minInput.value) : null;
            precoMax = maxInput?.value ? parseFloat(maxInput.value) : null;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(renderProducts, 400);
        });
    });

    renderProducts();
});
