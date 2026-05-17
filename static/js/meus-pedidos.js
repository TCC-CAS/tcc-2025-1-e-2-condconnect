document.addEventListener('DOMContentLoaded', async function () {
    const ordersList = document.getElementById('orders-list');
    const emptyState = document.getElementById('empty-state');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const modal = document.getElementById('tracking-modal');
    const closeModal = document.getElementById('close-tracking-modal');
    const codigoModal = document.getElementById('codigo-modal');
    const codigoModalInput = document.getElementById('codigo-modal-input');
    const codigoModalSubmit = document.getElementById('codigo-modal-submit');
    const codigoModalErro = document.getElementById('codigo-modal-erro');
    const closeCodigoModal = document.getElementById('close-codigo-modal');
    let codigoModalPedidoId = null;

    const PAGE_SIZE = 10;

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
    let todasPropostas = [];
    let currentOrderPage = 1;
    let currentPropostaPage = 1;
    let currentStatusFilter = 'todos';
    let currentPropostaStatusFilter = 'todas';
    let searchTerm = '';

    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'propostas') {
        currentTipo = 'propostas';
    } else if (tabParam === 'vendas') {
        currentTipo = 'sales';
    } else if (tabParam === 'compras') {
        currentTipo = 'purchases';
    }

    function renderPagination(total, page, onPageChangeFn) {
        const totalPages = Math.ceil(total / PAGE_SIZE);
        if (totalPages <= 1) return '';
        let html = '<div style="display:flex;justify-content:center;align-items:center;gap:6px;margin-top:24px;flex-wrap:wrap;">';
        if (page > 1) {
            html += `<button onclick="${onPageChangeFn}(${page - 1})" style="padding:8px 14px;border-radius:8px;border:2px solid #e2e8f0;background:white;color:#64748b;font-family:inherit;font-size:14px;cursor:pointer;">‹</button>`;
        }
        for (let i = 1; i <= totalPages; i++) {
            const active = i === page;
            html += `<button onclick="${onPageChangeFn}(${i})" style="padding:8px 14px;border-radius:8px;border:2px solid ${active ? 'var(--primary)' : '#e2e8f0'};background:${active ? 'var(--primary)' : 'white'};color:${active ? 'white' : '#64748b'};font-family:inherit;font-size:14px;font-weight:${active ? '700' : '500'};cursor:pointer;">${i}</button>`;
        }
        if (page < totalPages) {
            html += `<button onclick="${onPageChangeFn}(${page + 1})" style="padding:8px 14px;border-radius:8px;border:2px solid #e2e8f0;background:white;color:#64748b;font-family:inherit;font-size:14px;cursor:pointer;">›</button>`;
        }
        html += '</div>';
        return html;
    }

    // ── Filter bars ──────────────────────────────────────────────────────

    function renderFilterBar(tipo) {
        const bar = document.getElementById('status-filter-bar');
        if (!bar) return;
        const statuses = ['todos', 'aguardando', 'confirmado', 'enviado', 'entregue', 'cancelado'];
        const labels = { todos: 'Todos', aguardando: 'Aguardando', confirmado: 'Confirmado', enviado: 'A Caminho', entregue: 'Entregue', cancelado: 'Cancelado' };
        bar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;';
        bar.innerHTML = statuses.map(s => {
            const active = s === currentStatusFilter;
            return `<button class="filter-pill" data-status="${s}" style="padding:6px 16px;border-radius:100px;border:2px solid ${active ? 'var(--primary)' : '#e2e8f0'};background:${active ? 'var(--primary)' : 'white'};color:${active ? 'white' : '#64748b'};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;">${labels[s]}</button>`;
        }).join('');
        bar.querySelectorAll('.filter-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                currentStatusFilter = pill.dataset.status;
                currentOrderPage = 1;
                renderFilterBar(tipo);
                renderOrdersPage(tipo, 1);
            });
        });
    }

    function renderPropostaFilterBar() {
        const bar = document.getElementById('status-filter-bar');
        if (!bar) return;
        const statuses = ['todas', 'pendente', 'aceita', 'recusada', 'cancelada'];
        const labels = { todas: 'Todas', pendente: 'Pendente', aceita: 'Aceita', recusada: 'Recusada', cancelada: 'Cancelada' };
        bar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;';
        bar.innerHTML = statuses.map(s => {
            const active = s === currentPropostaStatusFilter;
            return `<button class="filter-pill-p" data-status="${s}" style="padding:6px 16px;border-radius:100px;border:2px solid ${active ? 'var(--primary)' : '#e2e8f0'};background:${active ? 'var(--primary)' : 'white'};color:${active ? 'white' : '#64748b'};font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;">${labels[s]}</button>`;
        }).join('');
        bar.querySelectorAll('.filter-pill-p').forEach(pill => {
            pill.addEventListener('click', () => {
                currentPropostaStatusFilter = pill.dataset.status;
                currentPropostaPage = 1;
                renderPropostaFilterBar();
                renderPropostasPage(currentPropostaPage);
            });
        });
    }

    // ── Propostas ────────────────────────────────────────────────────────

    async function renderPropostas(subtipo) {
        propostaSubtipo = subtipo;
        currentPropostaPage = 1;
        currentPropostaStatusFilter = 'todas';
        if (!ordersList) return;
        ordersList.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b">Carregando...</div>';
        if (emptyState) emptyState.style.display = 'none';

        try {
            const data = await CondConnect.api(`/propostas?tipo=${subtipo}`);
            todasPropostas = data.propostas || [];

            const countEl = document.getElementById('propostas-count');
            if (countEl) countEl.textContent = `(${todasPropostas.length})`;

            renderPropostaFilterBar();
            renderPropostasPage(currentPropostaPage);
        } catch {
            ordersList.innerHTML = buildSubTabs(subtipo) + '<div style="text-align:center;padding:40px;color:#dc2626">Erro ao carregar propostas.</div>';
        }
    }

    function buildSubTabs(subtipo) {
        return `
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
    }

    function renderPropostasPage(page) {
        currentPropostaPage = page;
        const subtipo = propostaSubtipo;

        const filtered = todasPropostas.filter(p => {
            if (currentPropostaStatusFilter !== 'todas' && p.status !== currentPropostaStatusFilter) return false;
            if (searchTerm) {
                const q = searchTerm.toLowerCase();
                return (p.produto?.titulo || '').toLowerCase().includes(q) ||
                       (p.outro_nome || '').toLowerCase().includes(q);
            }
            return true;
        });

        const start = (page - 1) * PAGE_SIZE;
        const slice = filtered.slice(start, start + PAGE_SIZE);

        if (filtered.length === 0) {
            ordersList.innerHTML = buildSubTabs(subtipo) + '<div style="text-align:center;padding:40px;color:#6b7280;">Nenhuma proposta com este status.</div>';
            return;
        }

        ordersList.innerHTML = buildSubTabs(subtipo) + slice.map(p => {
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
        }).join('') + renderPagination(filtered.length, page, 'mudarPaginaProposta');

        document.querySelectorAll('.btn-aceitar-proposta').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const valor = btn.getAttribute('data-valor');
                const titulo = btn.getAttribute('data-titulo');
                if (!await CondConnect.showConfirm(`Aceitar proposta de ${valor} para "${titulo}"? O comprador será notificado por e-mail.`, 'Aceitar Proposta')) return;
                btn.disabled = true; btn.textContent = 'Aceitando...';
                try {
                    await CondConnect.api('/propostas/item', { method: 'PUT', body: { proposta_id: parseInt(id), acao: 'aceitar' } });
                    renderPropostas(propostaSubtipo);
                } catch (err) { await CondConnect.showAlert(err.message || 'Erro', 'error'); btn.disabled = false; btn.textContent = 'Aceitar'; }
            });
        });

        document.querySelectorAll('.btn-recusar-proposta').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const valor = btn.getAttribute('data-valor');
                const titulo = btn.getAttribute('data-titulo');
                if (!await CondConnect.showConfirm(`Recusar a proposta de ${valor} para "${titulo}"?`, 'Recusar Proposta')) return;
                btn.disabled = true; btn.textContent = 'Recusando...';
                try {
                    await CondConnect.api('/propostas/item', { method: 'PUT', body: { proposta_id: parseInt(id), acao: 'recusar' } });
                    renderPropostas(propostaSubtipo);
                } catch (err) { await CondConnect.showAlert(err.message || 'Erro', 'error'); btn.disabled = false; btn.textContent = 'Recusar'; }
            });
        });

        document.querySelectorAll('.btn-cancelar-proposta').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (!await CondConnect.showConfirm('Tem certeza que deseja cancelar esta proposta?', 'Cancelar Proposta')) return;
                btn.disabled = true; btn.textContent = 'Cancelando...';
                try {
                    await CondConnect.api('/propostas/item', { method: 'PUT', body: { proposta_id: parseInt(id), acao: 'cancelar' } });
                    renderPropostas(propostaSubtipo);
                } catch (err) { await CondConnect.showAlert(err.message || 'Erro', 'error'); btn.disabled = false; btn.textContent = 'Cancelar'; }
            });
        });
    }

    window.renderPropostasSub = renderPropostas;
    window.mudarPaginaProposta = function(page) { renderPropostasPage(page); };

    // ── Pedidos (compras / vendas) ────────────────────────────────────────

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
            currentStatusFilter = 'todos';
            currentOrderPage = 1;

            const countPurchases = document.getElementById('purchases-count');
            const countSales = document.getElementById('sales-count');
            if (tipo === 'purchases' && countPurchases) countPurchases.textContent = `(${currentPedidos.length})`;
            if (tipo === 'sales' && countSales) countSales.textContent = `(${currentPedidos.length})`;

            if (currentPedidos.length === 0) {
                const bar = document.getElementById('status-filter-bar');
                if (bar) bar.style.display = 'none';
                ordersList.innerHTML = '';
                if (emptyState) emptyState.style.display = 'flex';
                return;
            }

            renderFilterBar(tipo);
            renderOrdersPage(tipo, 1);
        } catch {
            ordersList.innerHTML = '<div style="text-align:center;padding:40px;color:#dc2626">Erro ao carregar pedidos.</div>';
        }
    }

    function renderOrdersPage(tipo, page) {
        currentOrderPage = page;
        const chaveNome = tipo === 'purchases' ? 'vendedor' : 'comprador';

        const filtered = currentPedidos.filter(o => {
            if (currentStatusFilter !== 'todos' && o.status !== currentStatusFilter) return false;
            if (searchTerm) {
                const q = searchTerm.toLowerCase();
                return (o.produto?.titulo || '').toLowerCase().includes(q) ||
                       (o[chaveNome] || '').toLowerCase().includes(q);
            }
            return true;
        });

        const start = (page - 1) * PAGE_SIZE;
        const slice = filtered.slice(start, start + PAGE_SIZE);

        if (filtered.length === 0) {
            ordersList.innerHTML = '<div style="text-align:center;padding:40px;color:#6b7280;">Nenhum pedido com este status.</div>';
            return;
        }

        ordersList.innerHTML = slice.map(order => {
            const chave = tipo === 'purchases' ? 'vendedor' : 'comprador';
            const pessoaLabel = tipo === 'purchases' ? 'Vendedor' : 'Comprador';

            const codigoHtml = tipo === 'purchases' && order.codigo_entrega && !['entregue', 'cancelado'].includes(order.status)
                ? `<div style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border:2px solid #bbf7d0;border-radius:10px;padding:10px 14px;margin-top:10px;">
                       <span style="font-size:18px;">🔑</span>
                       <div>
                           <p style="margin:0;color:#15803d;font-size:11px;font-weight:700;letter-spacing:.5px;">CÓDIGO DE ENTREGA</p>
                           <p style="margin:2px 0 0;color:#166534;font-size:22px;font-weight:900;letter-spacing:6px;">${order.codigo_entrega}</p>
                       </div>
                       <p style="margin:0 0 0 auto;color:#16a34a;font-size:11px;max-width:110px;text-align:right;line-height:1.3;">Informe ao vendedor no momento da entrega</p>
                   </div>`
                : '';

            const codigoInputHtml = tipo === 'sales' && order.status === 'enviado'
                ? `<button class="btn-abrir-codigo" data-id="${order.id}"
                       style="margin-top:8px;padding:8px 16px;background:#00a6a6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-family:inherit;font-weight:600;">
                       🔑 Inserir Código
                   </button>`
                : '';

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
                        ${codigoHtml}
                    </div>
                    <div class="order-actions">
                        ${!['entregue', 'cancelado'].includes(order.status) ? `<button class="btn-track" data-id="${order.id}">Acompanhar Pedido</button>` : ''}
                        ${tipo === 'sales' && order.status === 'aguardando' ? `<button class="btn-confirmar" data-id="${order.id}" style="margin-top:8px;padding:8px 16px;background:#00a6a6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-family:inherit;">Confirmar Pedido</button>` : ''}
                        ${tipo === 'sales' && order.status === 'confirmado' ? `<button class="btn-enviar" data-id="${order.id}" style="margin-top:8px;padding:8px 16px;background:#10b981;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-family:inherit;">Marcar Enviado</button>` : ''}
                        ${codigoInputHtml}
                    </div>
                </div>
            `;
        }).join('') + renderPagination(filtered.length, page, 'mudarPaginaPedido');

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
                } catch (err) { await CondConnect.showAlert(err.message || 'Erro', 'error'); btn.disabled = false; btn.textContent = 'Confirmar Pedido'; }
            });
        });

        document.querySelectorAll('.btn-enviar').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                try {
                    await CondConnect.api(`/pedidos/item?id=${id}`, { method: 'PUT', body: { status: 'enviado' } });
                    renderOrders(tipo);
                } catch (err) { await CondConnect.showAlert(err.message || 'Erro', 'error'); }
            });
        });

        document.querySelectorAll('.btn-abrir-codigo').forEach(btn => {
            btn.addEventListener('click', () => {
                codigoModalPedidoId = btn.getAttribute('data-id');
                codigoModalInput.value = '';
                codigoModalErro.style.display = 'none';
                codigoModalSubmit.disabled = false;
                codigoModalSubmit.textContent = 'Confirmar Entrega';
                codigoModal.classList.add('active');
                setTimeout(() => codigoModalInput.focus(), 100);
            });
        });
    }

    window.mudarPaginaPedido = function(page) { renderOrdersPage(currentTipo, page); };

    // ── Tracking modal ───────────────────────────────────────────────────

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

    const pedidosSearch = document.getElementById('pedidos-search');
    if (pedidosSearch) {
        pedidosSearch.addEventListener('input', e => {
            searchTerm = e.target.value.trim();
            currentOrderPage = 1;
            currentPropostaPage = 1;
            if (currentTipo === 'propostas') renderPropostasPage(1);
            else renderOrdersPage(currentTipo, 1);
        });
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            searchTerm = '';
            if (pedidosSearch) pedidosSearch.value = '';
            renderOrders(btn.dataset.type);
        });
    });

    if (closeModal) closeModal.addEventListener('click', () => modal?.classList.remove('active'));
    window.addEventListener('click', e => { if (e.target === modal) modal?.classList.remove('active'); });

    if (closeCodigoModal) closeCodigoModal.addEventListener('click', () => codigoModal?.classList.remove('active'));
    window.addEventListener('click', e => { if (e.target === codigoModal) codigoModal?.classList.remove('active'); });

    if (codigoModalSubmit) {
        codigoModalSubmit.addEventListener('click', async () => {
            const codigo = codigoModalInput.value.trim();
            if (!codigo || codigo.length !== 4) {
                codigoModalErro.textContent = 'Digite o código de 4 dígitos.';
                codigoModalErro.style.display = 'block';
                return;
            }
            codigoModalSubmit.disabled = true;
            codigoModalSubmit.textContent = 'Confirmando...';
            codigoModalErro.style.display = 'none';
            try {
                await CondConnect.api(`/pedidos/item?id=${codigoModalPedidoId}`, { method: 'PUT', body: { codigo_entrega: codigo } });
                codigoModal.classList.remove('active');
                await CondConnect.showAlert('Entrega confirmada! O valor foi liberado ao vendedor.', 'success');
                renderOrders(currentTipo);
            } catch (err) {
                codigoModalErro.textContent = err.message || 'Código inválido. Tente novamente.';
                codigoModalErro.style.display = 'block';
                codigoModalSubmit.disabled = false;
                codigoModalSubmit.textContent = 'Confirmar Entrega';
            }
        });
    }

    renderOrders(currentTipo);
    if (currentTipo !== 'purchases') {
        tabBtns.forEach(b => b.classList.toggle('active', b.dataset.type === currentTipo));
    }
    window.openTracking = openTracking;
});
