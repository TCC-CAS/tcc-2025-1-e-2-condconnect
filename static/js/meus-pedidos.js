document.addEventListener('DOMContentLoaded', async function () {
    const ordersList = document.getElementById('orders-list');
    const emptyState = document.getElementById('empty-state');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const modal = document.getElementById('tracking-modal');
    const closeModal = document.querySelector('.close-modal');

    const statusLabel = {
        aguardando: 'Aguardando',
        confirmado: 'Confirmado',
        enviado: 'A Caminho',
        entregue: 'Entregue',
        cancelado: 'Cancelado',
    };

    let currentTipo = 'purchases';
    let currentPedidos = [];

    async function renderOrders(tipo) {
        currentTipo = tipo;
        if (!ordersList) return;
        ordersList.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b">Carregando...</div>';
        if (emptyState) emptyState.style.display = 'none';

        try {
            const tipoApi = tipo === 'purchases' ? 'compras' : 'vendas';
            const data = await CondConnect.api(`/pedidos/index.php?tipo=${tipoApi}`);
            currentPedidos = data.pedidos || [];

            const countPurchases = document.getElementById('purchases-count');
            const countSales = document.getElementById('sales-count');
            if (tipo === 'purchases' && countPurchases) countPurchases.textContent = `(${currentPedidos.length})`;
            if (tipo === 'sales' && countSales) countSales.textContent = `(${currentPedidos.length})`;

            if (currentPedidos.length === 0) {
                ordersList.innerHTML = '';
                if (emptyState) emptyState.style.display = 'flex';
                return;
            }

            ordersList.innerHTML = currentPedidos.map(order => {
                const chave = tipo === 'purchases' ? 'vendedor' : 'comprador';
                const pessoaLabel = tipo === 'purchases' ? 'Vendedor' : 'Comprador';
                return `
                    <div class="order-card">
                        <img src="${order.produto?.foto || '/static/assets/images/produto-placeholder.jpg'}" alt="${order.produto?.titulo}" class="order-img">
                        <div class="order-info">
                            <div class="order-header">
                                <span class="order-title">${order.produto?.titulo || ''}</span>
                                <span class="order-status status-${order.status}">${statusLabel[order.status] || order.status}</span>
                            </div>
                            <div class="order-details">
                                <span>ID: ${order.id_fmt}</span>
                                <span>•</span>
                                <span>${new Date(order.criado_em).toLocaleDateString('pt-BR')}</span>
                                <span>•</span>
                                <span>${pessoaLabel}: ${order[chave] || ''}</span>
                            </div>
                            <div class="order-price">R$ ${order.preco_fmt}</div>
                        </div>
                        <div class="order-actions">
                            <button class="btn-track" data-id="${order.id}">Acompanhar Pedido</button>
                            ${tipo === 'sales' && order.status === 'confirmado' ? `<button class="btn-enviar" data-id="${order.id}" style="margin-top:8px;padding:8px 16px;background:#10b981;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;">Marcar Enviado</button>` : ''}
                            ${tipo === 'purchases' && order.status === 'enviado' ? `<button class="btn-receber" data-id="${order.id}" style="margin-top:8px;padding:8px 16px;background:#3b82f6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;">Confirmar Recebimento</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            // Acompanhar
            document.querySelectorAll('.btn-track').forEach(btn => {
                btn.addEventListener('click', () => openTracking(parseInt(btn.getAttribute('data-id'))));
            });

            // Marcar enviado (vendedor)
            document.querySelectorAll('.btn-enviar').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    try {
                        await CondConnect.api(`/pedidos/item.php?id=${id}`, { method: 'PUT', body: { status: 'enviado' } });
                        renderOrders(tipo);
                    } catch (err) { alert(err.message); }
                });
            });

            // Confirmar recebimento (comprador)
            document.querySelectorAll('.btn-receber').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    try {
                        await CondConnect.api(`/pedidos/item.php?id=${id}`, { method: 'PUT', body: { status: 'entregue' } });
                        renderOrders(tipo);
                    } catch (err) { alert(err.message); }
                });
            });

        } catch {
            ordersList.innerHTML = '<div style="text-align:center;padding:40px;color:#dc2626">Erro ao carregar pedidos.</div>';
        }
    }

    function openTracking(id) {
        const order = currentPedidos.find(o => o.id === id);
        if (!order || !modal) return;

        const idEl = document.getElementById('modal-order-id');
        if (idEl) idEl.textContent = order.id_fmt;

        const timelineContainer = document.getElementById('modal-timeline');
        if (timelineContainer) {
            const etapas = ['aguardando', 'confirmado', 'enviado', 'entregue'];
            const etapaLabels = { aguardando: 'Aguardando Pagamento', confirmado: 'Pedido Confirmado', enviado: 'Saiu para Entrega', entregue: 'Entregue' };
            const idx = etapas.indexOf(order.status);

            timelineContainer.innerHTML = etapas.map((etapa, i) => `
                <div class="timeline-item ${i <= idx ? 'completed' : ''}">
                    <div class="timeline-dot">${i <= idx ? '✓' : ''}</div>
                    <div class="timeline-info">
                        <h4>${etapaLabels[etapa]}</h4>
                        <p>${i <= idx ? new Date(order.criado_em).toLocaleDateString('pt-BR') : '--'}</p>
                    </div>
                </div>
            `).join('');
        }

        modal.classList.add('active');
    }

    // Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderOrders(btn.dataset.type);
        });
    });

    if (closeModal) closeModal.addEventListener('click', () => modal?.classList.remove('active'));
    window.addEventListener('click', e => { if (e.target === modal) modal?.classList.remove('active'); });

    renderOrders('purchases');
    window.openTracking = openTracking;
});
