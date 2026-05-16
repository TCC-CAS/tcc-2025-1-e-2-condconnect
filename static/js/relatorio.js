let _relData = null;
let _relInsumos = null;

function exportarExcel() {
    if (!_relData) return alert('Carregue o relatório antes de exportar.');
    const wb = XLSX.utils.book_new();
    const f = _relData.financeiro;

    // Aba 1: Visão Financeira
    const margem = f.faturamento > 0 ? ((f.lucro_liquido / f.faturamento) * 100).toFixed(1) : '—';
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Indicador', 'Valor'],
        ['Faturamento Total', f.faturamento],
        ['Ticket Médio', f.ticket_medio],
        ['Total de Pedidos', f.total_pedidos],
        ['Lucro Estimado', f.has_custo ? f.lucro_liquido : '—'],
        ['Margem (%)', f.has_custo ? margem : '—'],
    ]), 'Financeiro');

    // Aba 2: Produtos
    const prodRows = [['Produto', 'Categoria', 'Pedidos', 'Unidades', 'Receita (R$)', 'Margem (%)', 'Visualizações']];
    (_relData.produtos || []).forEach(p => {
        prodRows.push([p.titulo, p.categoria, p.total_vendas, p.unidades, p.receita, p.margem_pct ?? '—', p.visualizacoes]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prodRows), 'Produtos');

    // Aba 3: Clientes
    const cl = _relData.clientes;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Indicador', 'Valor'],
        ['Total de Compradores', cl.total],
        ['LTV Médio (R$)', cl.ltv],
        ['Novos', cl.novos],
        ['Recorrentes', cl.recorrentes],
        ['% Novos', cl.pct_novos],
        ['% Recorrentes', cl.pct_recorrentes],
    ]), 'Clientes');

    // Aba 4: Funil de Conversão
    const funil = _relData.funil;
    const txFav = funil.views > 0 ? ((funil.favoritos / funil.views) * 100).toFixed(1) : 0;
    const txPed = funil.views > 0 ? ((funil.pedidos_iniciados / funil.views) * 100).toFixed(1) : 0;
    const txFin = funil.pedidos_iniciados > 0 ? ((funil.pedidos_entregues / funil.pedidos_iniciados) * 100).toFixed(1) : 0;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Etapa', 'Quantidade', 'Taxa (%)'],
        ['Visualizações', funil.views, '—'],
        ['Favoritos', funil.favoritos, txFav],
        ['Pedidos Iniciados', funil.pedidos_iniciados, txPed],
        ['Pedidos Entregues', funil.pedidos_entregues, txFin],
    ]), 'Funil');

    // Aba 5: Vendas por Dia da Semana
    const diasRows = [['Dia', 'Pedidos']];
    (_relData.temporal.por_dia_semana || []).forEach(d => diasRows.push([d.dia, d.pedidos]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(diasRows), 'Por Dia da Semana');

    // Aba 6: Evolução Mensal
    const mesRows = [['Mês', 'Receita (R$)', 'Pedidos']];
    (_relData.temporal.por_mes || []).forEach(m => mesRows.push([m.mes, m.receita, m.pedidos ?? '']));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mesRows), 'Evolução Mensal');

    // Aba 7: Insumos (se disponível)
    if (_relInsumos && _relInsumos.length > 0) {
        const total = _relInsumos.reduce((s, i) => s + i.custo, 0);
        const insRows = [['Insumo', 'Quantidade', 'Unidade', 'Custo (R$)', '% do Total']];
        _relInsumos.forEach(i => {
            const pct = total > 0 ? ((i.custo / total) * 100).toFixed(1) : 0;
            insRows.push([i.nome, i.quantidade, i.unidade, i.custo, pct]);
        });
        insRows.push(['TOTAL', '', '', total, '100']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(insRows), 'Insumos');
    }

    const agora = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `relatorio-condconnect-${agora}.xlsx`);
}

document.addEventListener('DOMContentLoaded', async function () {
    const charts = {};
    const CORES_INSUMOS = ['#00a6a6','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#10b981','#f97316','#06b6d4','#84cc16','#ec4899'];

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

    // Carregar lista de produtos para o filtro
    async function carregarProdutos() {
        try {
            const produtos = await CondConnect.api('/me/produtos-lista');
            const sel = document.getElementById('rel-produto');
            if (!sel) return;
            produtos.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.titulo.length > 30 ? p.titulo.slice(0, 30) + '…' : p.titulo;
                sel.appendChild(opt);
            });
        } catch {}
    }

    async function carregarInsumos(produto_id) {
        const section = document.getElementById('insumos-section');
        if (!section) return;
        if (!produto_id) { section.style.display = 'none'; _relInsumos = null; return; }

        try {
            const insumos = await CondConnect.api(`/me/insumos/${produto_id}`);
            if (!insumos || insumos.length === 0) { section.style.display = 'none'; return; }

            section.style.display = 'block';
            _relInsumos = insumos;
            const total = insumos.reduce((s, i) => s + i.custo, 0);
            set('insumos-total', brl(total));

            // Tabela
            const tbody = document.getElementById('tabela-insumos-body');
            if (tbody) {
                tbody.innerHTML = insumos.map(ins => {
                    const pct = total > 0 ? ((ins.custo / total) * 100).toFixed(1) : 0;
                    return `<tr>
                        <td><strong>${ins.nome}</strong></td>
                        <td>${ins.quantidade} ${ins.unidade}</td>
                        <td>${brl(ins.custo)}</td>
                        <td>${pct}%</td>
                    </tr>`;
                }).join('');
            }

            // Margem
            const prodSel = document.getElementById('rel-produto');
            const prodId = prodSel?.value;
            const produtos = await CondConnect.api('/me/produtos-lista');
            const prod = produtos.find(p => String(p.id) === String(prodId));
            if (prod && prod.custo) {
                const preco = prod.preco || 0;
                // We don't have price here easily, skip for now — show cost only
            }

            // Gráfico de pizza
            destroy('r-ins');
            const ctxIns = document.getElementById('chart-r-insumos');
            if (ctxIns) {
                charts['r-ins'] = new Chart(ctxIns, {
                    type: 'doughnut',
                    data: {
                        labels: insumos.map(i => i.nome),
                        datasets: [{
                            data: insumos.map(i => i.custo),
                            backgroundColor: CORES_INSUMOS.slice(0, insumos.length),
                            borderWidth: 2,
                            borderColor: '#fff',
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '55%',
                        plugins: {
                            legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10 } },
                            tooltip: { callbacks: { label: ctx => ` ${brl(ctx.parsed)} (${((ctx.parsed/total)*100).toFixed(1)}%)` } }
                        }
                    }
                });
            }
        } catch (err) {
            console.error('Erro insumos:', err);
            const section = document.getElementById('insumos-section');
            if (section) section.style.display = 'none';
        }
    }

    function render(data) {
        _relData = data;
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
                    maintainAspectRatio: false,
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
                    maintainAspectRatio: false,
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
                    maintainAspectRatio: false,
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
                    maintainAspectRatio: false,
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
                    maintainAspectRatio: false,
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

    async function carregarRelatorio(dias, produto_id) {
        const loading = document.getElementById('rel-loading');
        const content = document.getElementById('rel-content');
        if (loading) loading.style.display = 'block';
        if (content) content.style.display = 'none';

        try {
            const url = `/me/analytics?dias=${dias}${produto_id ? '&produto_id=' + produto_id : ''}`;
            const data = await CondConnect.api(url);
            const sub = document.getElementById('rel-subtitulo');
            if (sub) {
                const agora = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
                const filtroTxt = produto_id ? ' · produto filtrado' : '';
                sub.textContent = `Gerado em ${agora} · últimos ${dias} dias${filtroTxt}`;
            }
            if (loading) loading.style.display = 'none';
            if (content) content.style.display = 'block';
            render(data);
            await carregarInsumos(produto_id);
        } catch (err) {
            if (loading) loading.textContent = 'Erro ao carregar relatório. Verifique sua conexão.';
        }
    }

    const periodoSel = document.getElementById('rel-periodo');
    const produtoSel = document.getElementById('rel-produto');

    if (periodoSel) {
        periodoSel.addEventListener('change', () => carregarRelatorio(periodoSel.value, produtoSel?.value || ''));
    }
    if (produtoSel) {
        produtoSel.addEventListener('change', () => carregarRelatorio(periodoSel?.value || 30, produtoSel.value));
    }

    await carregarProdutos();
    await carregarRelatorio(30);
});
