document.addEventListener('DOMContentLoaded', function () {
    const cartList = document.getElementById('cart-list');
    const cartItemsCount = document.getElementById('cart-items-count');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartTotal = document.getElementById('cart-total');
    const clearCartBtn = document.getElementById('clear-cart');

    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function parsePrice(priceString) {
        return parseFloat(priceString.replace('R$', '').replace('.', '').replace(',', '.').trim());
    }

    function updateTotals(cart) {
        let subtotal = 0;
        let totalItems = 0;

        cart.forEach(item => {
            const price = parsePrice(item.price);
            subtotal += price * item.quantity;
            totalItems += item.quantity;
        });

        cartItemsCount.textContent = `Itens (${totalItems})`;
        cartSubtotal.textContent = formatCurrency(subtotal);
        cartTotal.textContent = formatCurrency(subtotal);
    }

    function renderCart() {
        const cart = JSON.parse(localStorage.getItem('condconnect_cart')) || [];

        if (cart.length === 0) {
            cartList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6b7280;">
                    <p>Seu carrinho está vazio.</p>
                    <a href="/Templates/marketplace.html" style="color: #2563eb; text-decoration: none; font-weight: 500; display: block; margin-top: 10px;">Ver produtos no Marketplace</a>
                </div>
            `;
            updateTotals([]);
            return;
        }

        cartList.innerHTML = cart.map((item, index) => `
            <div class="cart-item" data-index="${index}">
                <img src="${item.image}" alt="${item.title}" class="cart-item-image">
                <div class="cart-item-details">
                    <div>
                        <h3 class="item-title">${item.title}</h3>
                        <p class="item-subtitle">${item.location}</p>
                        <div class="item-price">${item.price}</div>
                    </div>
                    <div class="item-controls">
                        <div class="quantity-control">
                            <button class="qty-btn minus" data-index="${index}">-</button>
                            <span class="qty-value">${item.quantity}</span>
                            <button class="qty-btn plus" data-index="${index}">+</button>
                        </div>
                        <button class="remove-btn" data-index="${index}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        updateTotals(cart);
        addEventListeners();
    }

    function addEventListeners() {
        // Quantity Plus
        document.querySelectorAll('.qty-btn.plus').forEach(btn => {
            btn.addEventListener('click', function () {
                const index = this.getAttribute('data-index');
                let cart = JSON.parse(localStorage.getItem('condconnect_cart'));
                cart[index].quantity += 1;
                localStorage.setItem('condconnect_cart', JSON.stringify(cart));
                renderCart();
            });
        });

        // Quantity Minus
        document.querySelectorAll('.qty-btn.minus').forEach(btn => {
            btn.addEventListener('click', function () {
                const index = this.getAttribute('data-index');
                let cart = JSON.parse(localStorage.getItem('condconnect_cart'));
                if (cart[index].quantity > 1) {
                    cart[index].quantity -= 1;
                    localStorage.setItem('condconnect_cart', JSON.stringify(cart));
                    renderCart();
                }
            });
        });

        // Remove Item
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const index = this.getAttribute('data-index');
                let cart = JSON.parse(localStorage.getItem('condconnect_cart'));
                cart.splice(index, 1);
                localStorage.setItem('condconnect_cart', JSON.stringify(cart));
                renderCart();
            });
        });
    }

    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', function () {
            if (confirm('Deseja limpar todo o seu carrinho?')) {
                localStorage.removeItem('condconnect_cart');
                renderCart();
            }
        });
    }

    if (cartList) {
        renderCart();
    }
});
