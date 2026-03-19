document.addEventListener('DOMContentLoaded', function () {
    const productsList = document.getElementById('my-products-list');

    function renderMyProducts() {
        const userProducts = JSON.parse(localStorage.getItem('condconnect_user_products')) || [];

        if (userProducts.length === 0) {
            productsList.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 60px; color: #64748b;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px; opacity: 0.5;">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    </svg>
                    <p style="font-size: 16px; font-weight: 500;">Você ainda não anunciou nenhum produto.</p>
                </div>
            `;
            return;
        }

        productsList.innerHTML = userProducts.map(product => `
            <div class="product-item" data-id="${product.id}">
                <img src="${product.image}" alt="${product.title}" class="product-thumb">
                <div class="product-details">
                    <h3 class="product-title">${product.title}</h3>
                    <span class="product-status tag-disponivel">${product.status || 'Disponível'}</span>
                    <div class="product-price">R$ ${product.price.replace('R$ ', '')}</div>
                    <span class="product-date">Criado em ${product.date}</span>
                </div>
                <div class="product-actions">
                    <button class="actions-btn" title="Opções" data-id="${product.id}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                        </svg>
                    </button>
                    <div class="actions-dropdown">
                        <a href="/Templates/detalhes-produto.html?id=${product.id}" class="dropdown-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            Visualizar
                        </a>
                        <button class="dropdown-item edit-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Editar
                        </button>
                        <hr>
                        <button class="dropdown-item delete-btn danger">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Excluir
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Handle dropdown toggles
        document.querySelectorAll('.actions-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();

                // Close all other dropdowns
                document.querySelectorAll('.actions-dropdown').forEach(d => {
                    if (d !== btn.nextElementSibling) d.classList.remove('show');
                });

                const dropdown = btn.nextElementSibling;
                dropdown.classList.toggle('show');
            });
        });

        // Close dropdowns on click outside
        document.addEventListener('click', () => {
            document.querySelectorAll('.actions-dropdown').forEach(d => d.classList.remove('show'));
        });

        // Delete Logic
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.closest('.product-item').getAttribute('data-id');
                if (confirm('Tem certeza que deseja excluir este anúncio?')) {
                    let userProducts = JSON.parse(localStorage.getItem('condconnect_user_products')) || [];
                    userProducts = userProducts.filter(p => p.id !== id);
                    localStorage.setItem('condconnect_user_products', JSON.stringify(userProducts));
                    renderMyProducts();
                    window.dispatchEvent(new Event('storage'));
                }
            });
        });

        // Edit Logic
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.closest('.product-item').getAttribute('data-id');
                window.location.href = `/Templates/novo-anuncio.html?edit=${id}`;
            });
        });
    }

    renderMyProducts();
});
