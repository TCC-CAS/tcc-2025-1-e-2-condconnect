document.addEventListener('DOMContentLoaded', async function () {
    const cartList = document.getElementById('cart-list');
    const cartItemsCount = document.getElementById('cart-items-count');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartTotal = document.getElementById('cart-total');
    const clearCartBtn = document.getElementById('clear-cart');
    const checkoutBtn = document.querySelector('.checkout-btn, [data-action="checkout"]');

    function fmt(val) {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    async function renderCart() {
        if (!cartList) return;
        cartList.innerHTML = '<div style="text-align:center;padding:40px;color:#6b7280">Carregando...</div>';

        try {
            const data = await CondConnect.api('/carrinho/index.php');
            const { itens, subtotal, total_fmt } = data;

            if (!itens || itens.length === 0) {
                cartList.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                        <p>Seu carrinho está vazio.</p>
                        <a href="/Templates/marketplace.html" style="color: #2563eb; text-decoration: none; font-weight: 500; display: block; margin-top: 10px;">Ver produtos no Marketplace</a>
                    </div>`;
                if (cartItemsCount) cartItemsCount.textContent = 'Itens (0)';
                if (cartSubtotal) cartSubtotal.textContent = fmt(0);
                if (cartTotal) cartTotal.textContent = fmt(0);
                return;
            }

            const totalItens = itens.reduce((s, i) => s + i.quantidade, 0);
            if (cartItemsCount) cartItemsCount.textContent = `Itens (${totalItens})`;
            if (cartSubtotal) cartSubtotal.textContent = fmt(subtotal);
            if (cartTotal) cartTotal.textContent = fmt(subtotal);

            cartList.innerHTML = itens.map(item => `
                <div class="cart-item" data-id="${item.id}" data-produto-id="${item.produto.id}">
                    <img src="${item.produto.foto}" alt="${item.produto.titulo}" class="cart-item-image">
                    <div class="cart-item-details">
                        <div>
                            <h3 class="item-title">${item.produto.titulo}</h3>
                            <p class="item-subtitle">${item.produto.localizacao}</p>
                            <div class="item-price">${item.produto.preco_fmt}</div>
                        </div>
                        <div class="item-controls">
                            <div class="quantity-control">
                                <button class="qty-btn minus" data-id="${item.id}">-</button>
                                <span class="qty-value">${item.quantidade}</span>
                                <button class="qty-btn plus" data-id="${item.id}" data-qty="${item.quantidade}">+</button>
                            </div>
                            <button class="remove-btn" data-id="${item.id}">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            addEventListeners();
        } catch (err) {
            cartList.innerHTML = '<div style="text-align:center;padding:40px;color:#dc2626">Erro ao carregar carrinho.</div>';
        }
    }

    function addEventListeners() {
        document.querySelectorAll('.qty-btn.plus').forEach(btn => {
            btn.addEventListener('click', async function () {
                const id  = parseInt(this.getAttribute('data-id'));
                const qty = parseInt(this.getAttribute('data-qty')) + 1;
                try {
                    await CondConnect.api('/carrinho/index.php', { method: 'PUT', body: { item_id: id, quantidade: qty } });
                    renderCart();
                } catch {}
            });
        });

        document.querySelectorAll('.qty-btn.minus').forEach(btn => {
            btn.addEventListener('click', async function () {
                const id  = parseInt(this.getAttribute('data-id'));
                const qtyEl = this.nextElementSibling;
                const qty = parseInt(qtyEl?.textContent || '1') - 1;
                try {
                    await CondConnect.api('/carrinho/index.php', { method: 'PUT', body: { item_id: id, quantidade: qty } });
                    renderCart();
                } catch {}
            });
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', async function () {
                const id = parseInt(this.getAttribute('data-id'));
                try {
                    await CondConnect.api(`/carrinho/index.php?item_id=${id}`, { method: 'DELETE' });
                    renderCart();
                } catch {}
            });
        });
    }

    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', async function () {
            if (!confirm('Deseja limpar todo o seu carrinho?')) return;
            try {
                await CondConnect.api('/carrinho/index.php', { method: 'DELETE' });
                renderCart();
            } catch {}
        });
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async function () {
            if (!confirm('Confirmar a compra?')) return;
            this.disabled = true;
            this.textContent = 'Processando...';
            try {
                await CondConnect.api('/pedidos/index.php', { method: 'POST', body: {} });
                alert('Pedido realizado com sucesso!');
                window.location.href = '/Templates/meus-pedidos.html';
            } catch (err) {
                alert(err.message || 'Erro ao finalizar compra');
                this.disabled = false;
                this.textContent = 'Finalizar Compra';
            }
        });
    }

    renderCart();
});
