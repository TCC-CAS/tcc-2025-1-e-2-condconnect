document.addEventListener('DOMContentLoaded', async function () {
    const chartInstances = {};

    function brl(v) {
        return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    async function carregarDashboard() {
        try {
            const user = await CondConnect.api('/me');
            CondConnect.currentUser = user;
            localStorage.setItem('condconnect_user', JSON.stringify(user));

            const nomeEl = document.querySelector('.welcome-name');
            if (nomeEl) nomeEl.textContent = user.nome?.split(' ')[0] || 'Usuário';

            const emailEl = document.querySelector('.user-email');
            if (emailEl) emailEl.textContent = user.email;

            const stats = {
                'stat-produtos': user.total_produtos || 0,
                'stat-pedidos': user.total_pedidos || 0,
                'stat-vendas': user.total_vendas || 0,
                'stat-favoritos': user.total_favoritos || 0,
            };
            Object.entries(stats).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            });

            const fatEl = document.getElementById('stat-faturamento');
            if (fatEl) fatEl.textContent = brl(user.faturamento || 0);

            if (user.papel === 'admin') {
                const banner = document.getElementById('admin-banner');
                if (banner) banner.style.display = 'block';
            }

            const badge = document.querySelector('.notification-badge');
            if (badge && user.notif_nao_lidas > 0) badge.textContent = user.notif_nao_lidas;

        } catch (err) {
            console.error('Erro ao carregar dashboard:', err);
        }
    }

    async function renderRecentProducts() {
        const recentGrid = document.getElementById('recent-products-grid');
        if (!recentGrid) return;

        recentGrid.innerHTML = Array(4).fill(0).map(() => `
            <div class="product-card">
                <div class="product-image-container skeleton" style="height: 220px;"></div>
                <div class="product-info">
                    <div class="skeleton" style="height: 12px; width: 30%; margin-bottom: 8px;"></div>
                    <div class="skeleton" style="height: 18px; width: 70%; margin-bottom: 8px;"></div>
                    <div class="skeleton" style="height: 24px; width: 40%; margin-bottom: 16px;"></div>
                </div>
            </div>
        `).join('');

        try {
            const produtos = await CondConnect.api('/produtos?limite=4');
            if (produtos.length === 0) {
                recentGrid.innerHTML = '<p class="empty-state">Nenhum produto anunciado ainda.</p>';
                return;
            }
            recentGrid.innerHTML = produtos.map(p => CondConnect.renderProdutoCard(p)).join('');
            CondConnect.syncHearts();
        } catch {
            recentGrid.innerHTML = '<p class="empty-state">Erro ao carregar produtos.</p>';
        }
    }

    if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);

    function destroyChart(id) {
        if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
    }

    function renderAnalytics(data) {
        const f = data.financeiro;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

        set('an-faturamento', brl(f.faturamento));
        set('an-ticket', brl(f.ticket_medio));
        set('an-pedidos', f.total_pedidos);

        const lucroCard = document.getElementById('an-lucro-card');
        if (f.has_custo && lucroCard) {
            lucroCard.style.display = 'block';
            set('an-lucro', brl(f.lucro_liquido));
        }

        // Chart: Top produtos
        const topProdutos = data.produtos.filter(p => p.receita > 0).slice(0, 5);
        destroyChart('top');
        const ctxTop = document.getElementById('chart-top-produtos');
        if (ctxTop && topProdutos.length > 0) {
            chartInstances['top'] = new Chart(ctxTop, {
                type: 'bar',
                data: {
                    labels: topProdutos.map(p => p.titulo.length > 18 ? p.titulo.slice(0, 18) + '…' : p.titulo),
                    datasets: [{
                        label: 'Receita (R$)',
                        data: topProdutos.map(p => p.receita),
                        backgroundColor: '#00a6a6',
                        borderRadius: 6,
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    layout: { padding: { right: 70 } },
                    plugins: {
                        legend: { display: false },
                        datalabels: {
                            anchor: 'end',
                            align: 'right',
                            color: '#374151',
                            font: { size: 11, weight: '600' },
                            formatter: v => v >= 1000 ? 'R$' + (v / 1000).toFixed(1) + 'k' : 'R$' + v.toFixed(0)
                        }
                    },
                    scales: {
                        x: { grid: { color: '#f1f5f9' }, ticks: { callback: v => v >= 1000 ? 'R$' + (v/1000).toFixed(0) + 'k' : 'R$' + v } },
                        y: { grid: { display: false } }
                    }
                }
            });
        } else if (ctxTop) {
            ctxTop.parentElement.innerHTML += '<p style="color:#94a3b8;font-size:13px;text-align:center;margin-top:20px;">Nenhuma venda no período</p>';
        }

        // Chart: Funil de conversão
        destroyChart('funil');
        const funil = data.funil;
        const ctxFunil = document.getElementById('chart-funil');
        if (ctxFunil) {
            chartInstances['funil'] = new Chart(ctxFunil, {
                type: 'bar',
                data: {
                    labels: ['Visualizações', 'Favoritos', 'Pedidos iniciados', 'Pedidos entregues'],
                    datasets: [{
                        data: [funil.views, funil.favoritos, funil.pedidos_iniciados, funil.pedidos_entregues],
                        backgroundColor: ['#bfdbfe', '#93c5fd', '#3b82f6', '#1d4ed8'],
                        borderRadius: 6,
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    layout: { padding: { right: 50 } },
                    plugins: {
                        legend: { display: false },
                        datalabels: {
                            anchor: 'end',
                            align: 'right',
                            color: '#374151',
                            font: { size: 11, weight: '600' },
                            formatter: v => v > 0 ? v : ''
                        }
                    },
                    scales: {
                        x: { grid: { color: '#f1f5f9' } },
                        y: { grid: { display: false } }
                    }
                }
            });
        }

        // Chart: Vendas por dia da semana
        destroyChart('dias');
        const ctxDias = document.getElementById('chart-dias');
        if (ctxDias) {
            const diasData = data.temporal.por_dia_semana;
            chartInstances['dias'] = new Chart(ctxDias, {
                type: 'bar',
                data: {
                    labels: diasData.map(d => d.dia),
                    datasets: [{
                        label: 'Pedidos',
                        data: diasData.map(d => d.pedidos),
                        backgroundColor: diasData.map((_, i) =>
                            ['#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#6366f1', '#818cf8', '#c7d2fe'][i]
                        ),
                        borderRadius: 6,
                    }]
                },
                options: {
                    responsive: true,
                    layout: { padding: { top: 20 } },
                    plugins: {
                        legend: { display: false },
                        datalabels: {
                            anchor: 'end',
                            align: 'top',
                            color: '#374151',
                            font: { size: 11, weight: '600' },
                            formatter: v => v > 0 ? v : ''
                        }
                    },
                    scales: {
                        y: { grid: { color: '#f1f5f9' }, beginAtZero: true, ticks: { precision: 0 } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // Clientes stats
        const clientesEl = document.getElementById('clientes-stats');
        if (clientesEl) {
            const cl = data.clientes;
            const pctN = cl.pct_novos;
            const pctR = cl.pct_recorrentes;
            clientesEl.innerHTML = `
                <div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                        <span style="font-size:13px;color:#374151;">Novos clientes</span>
                        <span style="font-size:13px;font-weight:700;color:#374151;">${pctN}%</span>
                    </div>
                    <div style="background:#e2e8f0;border-radius:99px;height:8px;overflow:hidden;">
                        <div style="width:${pctN}%;background:#22c55e;height:100%;border-radius:99px;transition:width .5s;"></div>
                    </div>
                </div>
                <div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                        <span style="font-size:13px;color:#374151;">Recorrentes</span>
                        <span style="font-size:13px;font-weight:700;color:#374151;">${pctR}%</span>
                    </div>
                    <div style="background:#e2e8f0;border-radius:99px;height:8px;overflow:hidden;">
                        <div style="width:${pctR}%;background:#86efac;height:100%;border-radius:99px;transition:width .5s;"></div>
                    </div>
                </div>
                <div style="border-top:1px solid #f1f5f9;padding-top:14px;">
                    <div style="font-size:12px;color:#64748b;margin-bottom:2px;">LTV médio</div>
                    <div style="font-size:20px;font-weight:800;color:#1e293b;">${brl(cl.ltv)}</div>
                </div>
                ${data.encalhados > 0 ? `<div style="background:#fef9c3;border-radius:10px;padding:12px;font-size:13px;color:#854d0e;">⚠️ <strong>${data.encalhados}</strong> produto${data.encalhados > 1 ? 's' : ''} sem vendas ainda</div>` : ''}
            `;
        }
    }

    async function carregarAnalytics(dias = 30) {
        try {
            const data = await CondConnect.api(`/me/analytics?dias=${dias}`);
            renderAnalytics(data);
        } catch (err) {
            console.error('Erro analytics:', err);
        }
    }

    const periodoSelect = document.getElementById('analytics-periodo');
    if (periodoSelect) {
        periodoSelect.addEventListener('change', () => carregarAnalytics(periodoSelect.value));
    }

    await carregarDashboard();
    renderRecentProducts();
    carregarAnalytics();
});
