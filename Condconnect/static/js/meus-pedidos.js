// Meus Pedidos Logic

const purchases = [
    {
        id: "CC-90123",
        title: "iPhone 13 Pro Max - 256GB",
        price: "4.500,00",
        date: "12 Mar 2026",
        status: "a_caminho",
        statusLabel: "A Caminho",
        image: "/static/assets/images/produtos/iphone.jpg",
        seller: "Rodrigo Oliver",
        timeline: [
            { title: "Pagamento Confirmado", date: "12 Mar - 10:30", completed: true },
            { title: "Em Separação", date: "12 Mar - 14:15", completed: true },
            { title: "Saiu para Entrega", date: "13 Mar - 09:00", completed: true },
            { title: "Entregue", date: "--", completed: false }
        ]
    },
    {
        id: "CC-88542",
        title: "Cadeira Gamer ThunderX3",
        price: "850,00",
        date: "08 Mar 2026",
        status: "entregue",
        statusLabel: "Entregue",
        image: "/static/assets/images/produtos/cadeira.jpg",
        seller: "Mariana Costa",
        timeline: [
            { title: "Pagamento Confirmado", date: "08 Mar - 15:20", completed: true },
            { title: "Entregue", date: "09 Mar - 11:45", completed: true }
        ]
    }
];

const sales = [
    {
        id: "CC-90555",
        title: "Monitor 24' Dell",
        price: "720,00",
        date: "14 Mar 2026",
        status: "pendente",
        statusLabel: "Pendente",
        image: "/static/assets/images/produtos/monitor.jpg",
        buyer: "João Pereira",
        timeline: [
            { title: "Aguardando Pagamento", date: "14 Mar - 13:00", completed: true },
            { title: "Confirmar Envio", date: "--", completed: false }
        ]
    }
];

document.addEventListener('DOMContentLoaded', () => {
    const ordersList = document.getElementById('orders-list');
    const emptyState = document.getElementById('empty-state');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const modal = document.getElementById('tracking-modal');
    const closeModal = document.querySelector('.close-modal');

    function renderOrders(type) {
        const data = type === 'purchases' ? purchases : sales;

        // Update tab counts
        document.getElementById('purchases-count').textContent = `(${purchases.length})`;
        document.getElementById('sales-count').textContent = `(${sales.length})`;

        if (data.length === 0) {
            ordersList.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        ordersList.innerHTML = data.map(order => `
            <div class="order-card">
                <img src="${order.image}" alt="${order.title}" class="order-img">
                <div class="order-info">
                    <div class="order-header">
                        <span class="order-title">${order.title}</span>
                        <span class="order-status status-${order.status}">${order.statusLabel}</span>
                    </div>
                    <div class="order-details">
                        <span>ID: ${order.id}</span>
                        <span>•</span>
                        <span>${order.date}</span>
                        <span>•</span>
                        <span>${type === 'purchases' ? 'Vendedor: ' + order.seller : 'Comprador: ' + order.buyer}</span>
                    </div>
                    <div class="order-price">R$ ${order.price}</div>
                </div>
                <div class="order-actions">
                    <button class="btn-track" onclick="openTracking('${order.id}', '${type}')">Acompanhar Pedido</button>
                </div>
            </div>
        `).join('');
    }

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderOrders(btn.dataset.type);
        });
    });

    // Close modal
    closeModal.addEventListener('click', () => modal.classList.remove('active'));
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    // Initial render
    renderOrders('purchases');

    // Global function for tracking
    window.openTracking = (id, type) => {
        const data = type === 'purchases' ? purchases : sales;
        const order = data.find(o => o.id === id);

        if (!order) return;

        document.getElementById('modal-order-id').textContent = order.id;
        const timelineContainer = document.getElementById('modal-timeline');

        timelineContainer.innerHTML = order.timeline.map(item => `
            <div class="timeline-item ${item.completed ? 'completed' : ''}">
                <div class="timeline-dot">${item.completed ? '✓' : ''}</div>
                <div class="timeline-info">
                    <h4>${item.title}</h4>
                    <p>${item.date}</p>
                </div>
            </div>
        `).join('');

        modal.classList.add('active');
    };
});
