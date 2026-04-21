document.addEventListener('DOMContentLoaded', async function () {
    // Carregar dados do usuário
    async function carregarDashboard() {
        try {
            // Sempre busca dados frescos no dashboard (não usa cache)
            CondConnect.currentUser = null;
            localStorage.removeItem('condconnect_user');
            const user = await CondConnect.getMe();
            if (!user) {
                window.location.href = '/Templates/login.html';
                return;
            }

            // Preencher nome
            const nomeEl = document.querySelector('.welcome-name');
            if (nomeEl) nomeEl.textContent = user.nome?.split(' ')[0] || 'Usuário';

            const emailEl = document.querySelector('.user-email');
            if (emailEl) emailEl.textContent = user.email;

            // Stats
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

            // Admin banner
            if (user.papel === 'admin') {
                const banner = document.getElementById('admin-banner');
                if (banner) banner.style.display = 'block';
            }

            // Notificações
            const badge = document.querySelector('.notification-badge');
            if (badge && user.notif_nao_lidas > 0) {
                badge.textContent = user.notif_nao_lidas;
            }

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
            const produtos = await CondConnect.api('/produtos/index.php?limite=4');
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

    await carregarDashboard();
    renderRecentProducts();
});
