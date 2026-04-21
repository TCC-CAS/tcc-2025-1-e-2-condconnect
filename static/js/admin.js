document.addEventListener('DOMContentLoaded', async function () {
    const adminProductList = document.getElementById('admin-product-list');
    const adminUserList = document.getElementById('admin-user-list');
    const statsContainer = document.getElementById('admin-stats');

    // Carregar stats
    async function carregarStats() {
        if (!statsContainer) return;
        try {
            const stats = await CondConnect.api('/admin/stats.php');

            statsContainer.innerHTML = `
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;margin-bottom:24px;">
                    ${[
                        ['Usuários', stats.total_usuarios],
                        ['Produtos', stats.total_produtos],
                        ['Ativos', stats.produtos_ativos],
                        ['Pedidos', stats.total_pedidos],
                        ['Denúncias', stats.relatorios_pendentes],
                        ['Banidos', stats.usuarios_banidos],
                    ].map(([label, val]) => `
                        <div style="background:white;border:1px solid #f1f5f9;border-radius:12px;padding:16px;text-align:center;">
                            <div style="font-size:24px;font-weight:700;color:#1e293b;">${val}</div>
                            <div style="font-size:12px;color:#64748b;">${label}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch {}
    }

    // Carregar produtos para moderação
    async function renderAdminProducts(status = 'all') {
        if (!adminProductList) return;
        adminProductList.innerHTML = '<p style="text-align:center;padding:20px;color:#64748b">Carregando...</p>';

        try {
            const produtos = await CondConnect.api(`/admin/produtos.php?status=${status}`);

            if (produtos.length === 0) {
                adminProductList.innerHTML = '<p style="color:#64748b;text-align:center;padding:20px">Nenhum anúncio encontrado.</p>';
                return;
            }

            adminProductList.innerHTML = produtos.map(produto => `
                <div class="admin-product-item" style="display:flex;align-items:center;justify-content:space-between;padding:16px;border:1px solid #f1f5f9;border-radius:12px;gap:16px;margin-bottom:8px;">
                    <div style="display:flex;align-items:center;gap:16px;">
                        <img src="${produto.foto || '/static/assets/images/produto-placeholder.jpg'}" alt="${produto.titulo}" style="width:50px;height:50px;border-radius:8px;object-fit:cover;">
                        <div>
                            <h4 style="margin:0;font-size:14px;color:#1e293b;">${produto.titulo}</h4>
                            <span style="font-size:12px;color:#64748b;">Vendedor: ${produto.vendedor.nome} | ${produto.vendedor.local}</span>
                            <br><span style="font-size:12px;color:#94a3b8;">${produto.preco_fmt} · ${produto.categoria} · ${produto.condicao}</span>
                            <br><span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${produto.status === 'disponivel' ? '#dcfce7' : produto.status === 'pendente' ? '#fef9c3' : '#fee2e2'};color:${produto.status === 'disponivel' ? '#16a34a' : produto.status === 'pendente' ? '#a16207' : '#dc2626'}">${produto.status}</span>
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button class="btn-aprovar" data-id="${produto.id}" style="padding:8px 12px;background:#dcfce7;color:#16a34a;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">Aprovar</button>
                        <button class="btn-rejeitar" data-id="${produto.id}" style="padding:8px 12px;background:#fef9c3;color:#a16207;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">Rejeitar</button>
                        <button class="btn-remover" data-id="${produto.id}" style="padding:8px 12px;background:#fee2e2;color:#ef4444;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">Remover</button>
                    </div>
                </div>
            `).join('');

            document.querySelectorAll('.btn-aprovar').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    try {
                        await CondConnect.api('/admin/produtos.php', { method: 'PUT', body: { produto_id: parseInt(id), acao: 'aprovar' } });
                        renderAdminProducts(status);
                    } catch (err) { alert(err.message); }
                });
            });

            document.querySelectorAll('.btn-rejeitar').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    const motivo = prompt('Motivo da rejeição:');
                    if (!motivo) return;
                    try {
                        await CondConnect.api('/admin/produtos.php', { method: 'PUT', body: { produto_id: parseInt(id), acao: 'rejeitar', motivo } });
                        renderAdminProducts(status);
                    } catch (err) { alert(err.message); }
                });
            });

            document.querySelectorAll('.btn-remover').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    if (!confirm('Tem certeza que deseja remover este anúncio permanentemente?')) return;
                    try {
                        await CondConnect.api('/admin/produtos.php', { method: 'PUT', body: { produto_id: parseInt(id), acao: 'remover' } });
                        renderAdminProducts(status);
                    } catch (err) { alert(err.message); }
                });
            });

        } catch (err) {
            adminProductList.innerHTML = `<p style="color:#dc2626;text-align:center;padding:20px">${err.message || 'Erro ao carregar produtos'}</p>`;
        }
    }

    // Carregar usuários
    async function renderAdminUsers() {
        if (!adminUserList) return;
        adminUserList.innerHTML = '<p style="text-align:center;padding:20px;color:#64748b">Carregando...</p>';

        try {
            const usuarios = await CondConnect.api('/admin/usuarios.php');

            adminUserList.innerHTML = `
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead>
                        <tr style="background:#f8fafc;">
                            <th style="padding:12px;text-align:left;border-bottom:1px solid #e2e8f0;">Nome</th>
                            <th style="padding:12px;text-align:left;border-bottom:1px solid #e2e8f0;">Email</th>
                            <th style="padding:12px;text-align:left;border-bottom:1px solid #e2e8f0;">Apto/Bloco</th>
                            <th style="padding:12px;text-align:left;border-bottom:1px solid #e2e8f0;">Papel</th>
                            <th style="padding:12px;text-align:left;border-bottom:1px solid #e2e8f0;">Status</th>
                            <th style="padding:12px;text-align:left;border-bottom:1px solid #e2e8f0;">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${usuarios.map(u => `
                            <tr style="border-bottom:1px solid #f1f5f9;">
                                <td style="padding:12px;">${u.nome}</td>
                                <td style="padding:12px;color:#64748b;">${u.email}</td>
                                <td style="padding:12px;">${u.bloco || '-'} / ${u.apartamento || '-'}</td>
                                <td style="padding:12px;"><span style="padding:2px 8px;border-radius:4px;background:${u.papel === 'admin' ? '#ede9fe' : '#f0f9ff'};color:${u.papel === 'admin' ? '#7c3aed' : '#0369a1'}">${u.papel}</span></td>
                                <td style="padding:12px;"><span style="padding:2px 8px;border-radius:4px;background:${u.ativo ? '#dcfce7' : '#fee2e2'};color:${u.ativo ? '#16a34a' : '#dc2626'}">${u.ativo ? 'Ativo' : 'Banido'}</span></td>
                                <td style="padding:12px;">
                                    <button class="btn-user-acao" data-id="${u.id}" data-acao="${u.ativo ? 'banir' : 'desbanir'}" style="padding:6px 12px;background:${u.ativo ? '#fee2e2' : '#dcfce7'};color:${u.ativo ? '#dc2626' : '#16a34a'};border:none;border-radius:6px;font-size:12px;cursor:pointer;margin-right:4px;">
                                        ${u.ativo ? 'Banir' : 'Desbanir'}
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            document.querySelectorAll('.btn-user-acao').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id   = parseInt(btn.getAttribute('data-id'));
                    const acao = btn.getAttribute('data-acao');
                    if (!confirm(`Confirmar ação: ${acao}?`)) return;
                    try {
                        await CondConnect.api('/admin/usuarios.php', { method: 'PUT', body: { usuario_id: id, acao } });
                        renderAdminUsers();
                    } catch (err) { alert(err.message); }
                });
            });

        } catch (err) {
            adminUserList.innerHTML = `<p style="color:#dc2626;padding:20px">${err.message || 'Erro ao carregar usuários'}</p>`;
        }
    }

    // Filtros de status
    const filterStatus = document.querySelectorAll('[data-status]');
    filterStatus.forEach(btn => {
        btn.addEventListener('click', () => {
            filterStatus.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderAdminProducts(btn.getAttribute('data-status'));
        });
    });

    // Tabs entre produtos e usuários
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if (tab.dataset.tab === 'users') {
                if (adminProductList) adminProductList.style.display = 'none';
                if (adminUserList) adminUserList.style.display = 'block';
                renderAdminUsers();
            } else {
                if (adminProductList) adminProductList.style.display = 'block';
                if (adminUserList) adminUserList.style.display = 'none';
                renderAdminProducts();
            }
        });
    });

    carregarStats();
    renderAdminProducts();
});
