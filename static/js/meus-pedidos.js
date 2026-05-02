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

    const statusPropostaLabel = {
        pendente: 'Pendente',
        aceita: 'Aceita',
        recusada: 'Recusada',
        cancelada: 'Cancelada',
    };

    const statusPropostaCor = {
        pendente: '#f59e0b',
        aceita: '#16a34a',
        recusada: '#dc2626',
        cancelada: '#6b7280',
    };

    let currentTipo = 'purchases';
    let currentPedidos = [];
    let propostaSubtipo = 'recebidas';

    // Check URL param for proposals tab
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tab') === 'propostas') {
        currentTipo = 'propostas';
    }

    async function renderPropostas(subtipo) {
        propostaSubtipo = subtipo;
        if (!ordersList) return;
        ordersList.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b">Carregando...</div>';
        if (emptyState) emptyState.style.display = 'none';

        // Sub-tabs for proposals
        const subTabsHtml = `
            <div style="display:flex;gap:8px;margin-bottom:20px;">
                <button onclick="renderPropostasSub('recebidas')" id="sub-recebidas"
                    style="padding:8px 20px;border-radius:100px;border:2px solid ${subtipo==='recebidas'?'var(--primary)':'#e2e8f0'};background:${subtipo==='recebidas'?'var(--primary)':'white'};color:${subtipo==='recebidas'?'white':'#64748b'};font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">
                    Recebidas
                </button>
                <button onclick="renderPropostasSub('enviadas')" id="sub-enviadas"
                    style="padding:8px 20px;border-radius:100px;border:2px solid ${subtipo==='enviadas'?'var(--primary)':'#e2e8f0'};background:${subtipo==='enviadas'?'var(--primary)':'white'};color:${subtipo==='enviadas'?'white':'#64748b'};font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">
                    Enviadas
                </button>
            </div>`;

        try {
            const data = await CondConnect.api(`/propostas?tipo=${subtipo}`);
            const propostas = data.propostas || [];

            const countEl = document.getElementById('propostas-count');
            if (countEl) countEl.textContent = `(${propostas.length})`;

            if (propostas.length === 0) {
                ordersList.innerHTML = subTabsHtml + '<div style="text-align:center;padding:40px;color:#6b7280;">Nenhuma proposta encontrada.</div>';
                return;
            }

            ordersList.innerHTML = subTabsHtml + propostas.map(p => {
                const corStatus = statusPropostaCor[p.status] || '#6b7280';
                const labelStatus = statusPropostaLabel[p.status] || p.status;
                const isPendente = p.status === 'pendente';
                const acoesBtns = isPendente && subtipo === 'recebidas'
                    ? `<button class="btn-aceitar-proposta" data-id="${p.id}" data-valor="${p.valor_fmt}" data-titulo="${p.produto.titulo}" style="padding:8px 16px;background:#16a34a;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-family:inherit;font-weight:600;">Aceitar</button>
                       <button class="btn-recusar-proposta" data-id="${p.id}" data-valor="${p.valor_fmt}" data-titulo="${p.produto.titulo}" style="padding:8px 16px;background:#dc2626;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-family:inherit;font-weight:600;">Recusar</button>`
                    : isPendente && subtipo === 'enviadas'
                    ? `<button class="btn-cancelar-proposta" data-id="${p.id}" style="padding:8px 16px;background:#6b7280;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-family:inherit;font-weight:600;">Cancelar</button>`
                    : '';

                return `
                    <div class="order-card" style="display:flex;gap:16px;align-items:flex-start;">
                        <img src="${p.produto.foto || '/static/assets/images/produto-placeholder.jpg'}" alt="${p.produto.titulo}" class="order-img" style="width:80px;height:80px;object-fit:cover;border-radius:10px;flex-shrink:0;">
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                                <span style="font-weight:700;color:#1e293b;font-size:15px;">${p.produto.titulo}</span>
                                <span style="padding:4px 12px;border-radius:100px;background:${corStatus}20;color:${corStatus};font-size:12px;font-weight:700;white-space:nowrap;">${labelStatus}</span>
                            </div>
                            <p style="margin:0 0 4px;color:#00a6a6;font-size:18px;font-weight:700;">${p.valor_fmt}</p>
                            <p style="margin:0 0 6px;color:#64748b;font-size:13px;">Quantidade: <strong style="color:#1e293b;">${p.quantidade || 1} unidade(s)</strong></p>
                            ${p.mensagem ? `<p style="margin:0 0 6px;color:#64748b;font-size:13px;font-style:italic;">"${p.mensagem}"</p>` : ''}
                            <p style="margin:0 0 10px;color:#94a3b8;font-size:12px;">${subtipo === 'recebidas' ? 'De' : 'Para'}: <strong style="color:#64748b;">${p.outro_nome}</strong> • ${new Date(p.criado_em).toLocaleDateString('pt-BR')}</p>
                            <div style="display:flex;gap:8px;flex-wrap:wrap;">${acoesBtns}</div>
                        </div>
                    </div>`;
            }).join('');

            // Event listeners
            document.querySelectorAll('.btn-aceitar-proposta').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    const valor = btn.getAttribute('data-valor');
                    const titulo = btn.getAttribute('data-titulo');
                    if (!confirm(`Tem certeza que deseja ACEITAR a proposta de ${valor} para "${titulo}"?\n\nO comprador será notificado por e-mail.`)) return;
                    btn.disabled = true; btn.textContent = 'Aceitando...';
                    try {
                        await CondConnect.api('/propostas/item', { method: 'PUT', body: { proposta_id: parseInt(id), acao: 'aceitar' } });
                        renderPropostas(propostaSubtipo);
                    } catch (err) { alert(err.message || 'Erro'); btn.disabled = false; btn.textContent = 'Aceitar'; }
                });
            });

            document.querySelectorAll('.btn-recusar-proposta').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    const valor = btn.getAttribute('data-valor');
                    const titulo = btn.getAttribute('data-titulo');
                    if (!confirm(`Tem certeza que deseja RECUSAR a proposta de ${valor} para "${titulo}"?`)) return;
                    btn.disabled = true; btn.textContent = 'Recusando...';
                    try {
                        await CondConnect.api('/propostas/item', { method: 'PUT', body: { proposta_id: parseInt(id), acao: 'recusar' } });
                        renderPropostas(propostaSubtipo);
                    } catch (err) { alert(err.message || 'Erro'); btn.disabled = false; btn.textContent = 'Recusar'; }
                });
            });

            document.querySelectorAll('.btn-cancelar-proposta').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    if (!confirm('Tem certeza que deseja cancelar esta proposta?')) return;
                    btn.disabled = true; btn.textContent = 'Cancelando...';
                    try {
                        await CondConnect.api('/propostas/item', { method: 'PUT', body: { proposta_id: parseInt(id), acao: 'cancelar' } });
                        renderPropostas(propostaSubtipo);
                    } catch (err) { alert(err.message || 'Erro'); btn.disabled = false; btn.textContent = 'Cancelar'; }
                });
            });

        } catch {
            ordersList.innerHTML = subTabsHtml + '<div style="text-align:center;padding:40px;color:#dc2626">Erro ao carregar propostas.</div>';
        }
    }

    window.renderPropostasSub = renderPropostas;

    async function renderOrders(tipo) {
        currentTipo = tipo;

        if (tipo === 'propostas') {
            tabBtns.forEach(b => b.classList.toggle('active', b.dataset.type === 'propostas'));
            renderPropostas(propostaSubtipo);
            return;
        }

        if (!ordersList) return;
        ordersList.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b">Carregando...</div>';
        if (emptyState) emptyState.style.display = 'none';

        try {
            const tipoApi = tipo === 'purchases' ? 'compras' : 'vendas';
            const data = await CondConnect.api(`/pedidos?tipo=${tipoApi}`);
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
                            ${tipo === 'sales' && order.status === 'aguardando' ? `<button class="btn-confirmar" data-id="${order.id}" style="margin-top:8px;padding:8px 16px;background:#00a6a6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-family:inherit;">Confirmar Pedido</button>` : ''}
                            ${tipo === 'sales' && order.status === 'confirmado' ? `<button class="btn-enviar" data-id="${order.id}" style="margin-top:8px;padding:8px 16px;background:#10b981;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-family:inherit;">Marcar Enviado</button>` : ''}
                            ${tipo === 'purchases' && order.status === 'enviado' ? `<button class="btn-receber" data-id="${order.id}" style="margin-top:8px;padding:8px 16px;background:#3b82f6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-family:inherit;">Confirmar Recebimento</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            document.querySelectorAll('.btn-track').forEach(btn => {
                btn.addEventListener('click', () => openTracking(parseInt(btn.getAttribute('data-id'))));
            });

            document.querySelectorAll('.btn-confirmar').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    btn.disabled = true; btn.textContent = 'Confirmando...';
                    try {
                        await CondConnect.api(`/pedidos/item?id=${id}`, { method: 'PUT', body: { status: 'confirmado' } });
                        renderOrders(tipo);
                    } catch (err) { alert(err.message); btn.disabled = false; btn.textContent = 'Confirmar Pedido'; }
                });
            });

            document.querySelectorAll('.btn-enviar').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    try {
                        await CondConnect.api(`/pedidos/item?id=${id}`, { method: 'PUT', body: { status: 'enviado' } });
                        renderOrders(tipo);
                    } catch (err) { alert(err.message); }
                });
            });

            document.querySelectorAll('.btn-receber').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    try {
                        await CondConnect.api(`/pedidos/item?id=${id}`, { method: 'PUT', body: { status: 'entregue' } });
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

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderOrders(btn.dataset.type);
        });
    });

    if (closeModal) closeModal.addEventListener('click', () => modal?.classList.remove('active'));
    window.addEventListener('click', e => { if (e.target === modal) modal?.classList.remove('active'); });

    renderOrders(currentTipo);
    if (currentTipo === 'propostas') {
        tabBtns.forEach(b => b.classList.toggle('active', b.dataset.type === 'propostas'));
    }
    window.openTracking = openTracking;
});
