document.addEventListener('DOMContentLoaded', async function () {
    const charts = {};

    function brl(v) {
        return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function set(id, v) {
        const el = document.getElementById(id);
        if (el) el.textContent = v;
    }
    function destroy(id) {
        if (charts[id]) { charts[id].destroy(); delete charts[id]; }
    }

    function render(data) {
        const f = data.financeiro;
        const cl = data.clientes;
        const funil = data.funil;

        // 1. Financeiro
        set('r-faturamento', brl(f.faturamento));
        set('r-ticket', brl(f.ticket_medio));
        set('r-pedidos', f.total_pedidos);

        if (f.has_custo) {
            const card = document.getElementById('r-lucro-card');
            if (card) card.style.display = 'block';
            set('r-lucro', brl(f.lucro_liquido));
            const margem = f.faturamento > 0 ? ((f.lucro_liquido / f.faturamento) * 100).toFixed(1) : 0;
            set('r-margem-txt', `Margem estimada: ${margem}%`);
        }

        // 2. Performance de produtos
        const topProdutos = data.produtos.filter(p => p.receita > 0).slice(0, 5);
        destroy('r-top');
        const ctxTop = document.getElementById('chart-r-top');
        if (ctxTop && topProdutos.length > 0) {
            charts['r-top'] = new Chart(ctxTop, {
                type: 'bar',
                data: {
                    labels: topProdutos.map(p => p.titulo.length > 20 ? p.titulo.slice(0, 20) + '…' : p.titulo),
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
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: '#f1f5f9' }, ticks: { callback: v => v >= 1000 ? 'R$' + (v/1000).toFixed(1) + 'k' : 'R$' + v } },
                        y: { grid: { display: false } }
                    }
                }
            });
        }

        // Tabela de produtos
        const tbody = document.getElementById('tabela-produtos-body');
        if (tbody) {
            tbody.innerHTML = data.produtos.map(p => `
                <tr>
                    <td><strong>${p.titulo}</strong><br><span style="color:#94a3b8;font-size:11px;">${p.categoria}</span></td>
                    <td>${p.total_vendas} ped. (${p.unidades} un.)</td>
                    <td>${brl(p.receita)}</td>
                    <td>${p.margem_pct !== null ? p.margem_pct + '%' : '<span style="color:#94a3b8;">—</span>'}</td>
                    <td>${p.visualizacoes.toLocaleString('pt-BR')}</td>
                </tr>
            `).join('') || '<tr><td colspan="5" style="color:#94a3b8;text-align:center;">Nenhum produto ainda</td></tr>';
        }

        if (data.encalhados > 0) {
            const av = document.getElementById('encalhados-aviso');
            if (av) {
                av.style.display = 'block';
                av.innerHTML = `⚠️ <strong>${data.encalhados}</strong> produto${data.encalhados > 1 ? 's' : ''} anunciado${data.encalhados > 1 ? 's' : ''} sem nenhuma venda ainda. Considere revisar o preço ou a descrição.`;
            }
        }

        // 3. Clientes
        set('r-total-compradores', cl.total);
        set('r-ltv', brl(cl.ltv));

        const barNovos = document.getElementById('r-bar-novos');
        if (barNovos) barNovos.style.width = cl.pct_novos + '%';
        set('r-pct-novos', `${cl.novos} clientes (${cl.pct_novos}%)`);

        const barRec = document.getElementById('r-bar-rec');
        if (barRec) barRec.style.width = cl.pct_recorrentes + '%';
        set('r-pct-rec', `${cl.recorrentes} clientes (${cl.pct_recorrentes}%)`);

        destroy('r-cl');
        const ctxCl = document.getElementById('chart-r-clientes');
        if (ctxCl && cl.total > 0) {
            charts['r-cl'] = new Chart(ctxCl, {
                type: 'doughnut',
                data: {
                    labels: ['Novos', 'Recorrentes'],
                    datasets: [{
                        data: [cl.novos, cl.recorrentes],
                        backgroundColor: ['#22c55e', '#86efac'],
                        borderWidth: 0,
                    }]
                },
                options: {
                    responsive: true,
                    cutout: '65%',
                    plugins: {
                        legend: { position: 'bottom', labels: { font: { size: 12 } } }
                    }
                }
            });
        } else if (ctxCl) {
            ctxCl.parentElement.innerHTML += '<p style="color:#94a3b8;font-size:13px;text-align:center;margin-top:20px;">Sem compras no período</p>';
        }

        // 4. Funil
        destroy('r-funil');
        const ctxFunil = document.getElementById('chart-r-funil');
        if (ctxFunil) {
            charts['r-funil'] = new Chart(ctxFunil, {
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
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: '#f1f5f9' } },
                        y: { grid: { display: false } }
                    }
                }
            });
        }

        const funilTaxas = document.getElementById('funil-taxas');
        if (funilTaxas && funil.views > 0) {
            const txFav  = funil.views > 0 ? ((funil.favoritos / funil.views) * 100).toFixed(1) : 0;
            const txPed  = funil.views > 0 ? ((funil.pedidos_iniciados / funil.views) * 100).toFixed(1) : 0;
            const txFin  = funil.pedidos_iniciados > 0 ? ((funil.pedidos_entregues / funil.pedidos_iniciados) * 100).toFixed(1) : 0;
            funilTaxas.innerHTML = `
                <div style="background:#f8fafc;border-radius:10px;padding:12px;text-align:center;">
                    <div style="font-size:20px;font-weight:800;color:#3b82f6;">${txFav}%</div>
                    <div style="font-size:12px;color:#64748b;">Views → Favoritos</div>
                </div>
                <div style="background:#f8fafc;border-radius:10px;padding:12px;text-align:center;">
                    <div style="font-size:20px;font-weight:800;color:#3b82f6;">${txPed}%</div>
                    <div style="font-size:12px;color:#64748b;">Views → Pedidos</div>
                </div>
                <div style="background:#f8fafc;border-radius:10px;padding:12px;text-align:center;">
                    <div style="font-size:20px;font-weight:800;color:#16a34a;">${txFin}%</div>
                    <div style="font-size:12px;color:#64748b;">Taxa de conclusão</div>
                </div>
            `;
        }

        // 5. Temporal
        destroy('r-dias');
        const ctxDias = document.getElementById('chart-r-dias');
        if (ctxDias) {
            const diasData = data.temporal.por_dia_semana;
            charts['r-dias'] = new Chart(ctxDias, {
                type: 'bar',
                data: {
                    labels: diasData.map(d => d.dia),
                    datasets: [{
                        label: 'Pedidos',
                        data: diasData.map(d => d.pedidos),
                        backgroundColor: diasData.map((_, i) =>
                            ['#818cf8','#6366f1','#4f46e5','#4338ca','#6366f1','#818cf8','#c7d2fe'][i]
                        ),
                        borderRadius: 6,
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { grid: { color: '#f1f5f9' }, beginAtZero: true, ticks: { precision: 0 } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        destroy('r-mensal');
        const ctxMes = document.getElementById('chart-r-mensal');
        if (ctxMes && data.temporal.por_mes.length > 0) {
            charts['r-mensal'] = new Chart(ctxMes, {
                type: 'line',
                data: {
                    labels: data.temporal.por_mes.map(m => {
                        const [ano, mes] = m.mes.split('-');
                        return new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                    }),
                    datasets: [{
                        label: 'Faturamento',
                        data: data.temporal.por_mes.map(m => m.receita),
                        borderColor: '#00a6a6',
                        backgroundColor: 'rgba(0,166,166,0.1)',
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: '#00a6a6',
                        pointRadius: 4,
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { grid: { color: '#f1f5f9' }, ticks: { callback: v => v >= 1000 ? 'R$' + (v/1000).toFixed(1) + 'k' : 'R$' + v } },
                        x: { grid: { display: false } }
                    }
                }
            });
        } else if (ctxMes) {
            ctxMes.parentElement.innerHTML += '<p style="color:#94a3b8;font-size:13px;text-align:center;margin-top:40px;">Sem dados mensais ainda</p>';
        }
    }

    async function carregarRelatorio(dias) {
        const loading = document.getElementById('rel-loading');
        const content = document.getElementById('rel-content');
        if (loading) loading.style.display = 'block';
        if (content) content.style.display = 'none';

        try {
            const data = await CondConnect.api(`/me/analytics?dias=${dias}`);
            const sub = document.getElementById('rel-subtitulo');
            if (sub) {
                const agora = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
                sub.textContent = `Gerado em ${agora} · últimos ${dias} dias`;
            }
            if (loading) loading.style.display = 'none';
            if (content) content.style.display = 'block';
            render(data);
        } catch (err) {
            if (loading) loading.textContent = 'Erro ao carregar relatório. Verifique sua conexão.';
        }
    }

    const periodoSel = document.getElementById('rel-periodo');
    if (periodoSel) {
        periodoSel.addEventListener('change', () => carregarRelatorio(periodoSel.value));
    }

    await carregarRelatorio(30);
});
