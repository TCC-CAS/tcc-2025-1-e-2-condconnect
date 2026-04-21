// CondConnect - Global App State & API Helper
const API_BASE = '/backend/api';

const CondConnect = {
    currentUser: null,

    async api(endpoint, options = {}) {
        const defaults = {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
        };
        const config = { ...defaults, ...options };
        if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
        }
        if (config.body instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        try {
            const res = await fetch(API_BASE + endpoint, config);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw { status: res.status, message: data.error || 'Erro desconhecido' };
            return data;
        } catch (err) {
            if (err.status === 401) {
                localStorage.removeItem('condconnect_user');
                // Redirecionar para login apenas se não estiver na landing
                if (!window.location.pathname.includes('index') && !window.location.pathname.endsWith('/')) {
                    window.location.href = '/Templates/login.html';
                }
            }
            throw err;
        }
    },

    async getMe() {
        if (this.currentUser) return this.currentUser;
        const saved = localStorage.getItem('condconnect_user');
        if (saved) {
            this.currentUser = JSON.parse(saved);
            return this.currentUser;
        }
        try {
            const user = await this.api('/me.php');
            this.currentUser = user;
            localStorage.setItem('condconnect_user', JSON.stringify(user));
            return user;
        } catch {
            return null;
        }
    },

    setUser(user) {
        this.currentUser = user;
        localStorage.setItem('condconnect_user', JSON.stringify(user));
        localStorage.setItem('condconnect_user_role', user.papel);
        localStorage.setItem('condconnect_user_email', user.email);
    },

    clearUser() {
        this.currentUser = null;
        localStorage.removeItem('condconnect_user');
        localStorage.removeItem('condconnect_user_role');
        localStorage.removeItem('condconnect_user_email');
    },

    // Favoritos via API
    async toggleFavorito(produtoId) {
        const favs = JSON.parse(localStorage.getItem('condconnect_favorites') || '[]');
        const isFav = favs.includes(produtoId);
        try {
            if (isFav) {
                await this.api(`/favoritos/index.php?produto_id=${produtoId}`, { method: 'DELETE' });
                const novo = favs.filter(f => f !== produtoId);
                localStorage.setItem('condconnect_favorites', JSON.stringify(novo));
            } else {
                await this.api('/favoritos/index.php', { method: 'POST', body: { produto_id: produtoId } });
                favs.push(produtoId);
                localStorage.setItem('condconnect_favorites', JSON.stringify(favs));
            }
            return !isFav;
        } catch (err) {
            if (err.status === 401) return null;
            throw err;
        }
    },

    syncHearts() {
        const favs = JSON.parse(localStorage.getItem('condconnect_favorites') || '[]');
        document.querySelectorAll('.product-card').forEach(card => {
            const likeBtn = card.querySelector('.like-btn');
            if (!likeBtn) return;
            const productId = parseInt(likeBtn.getAttribute('data-id') || card.getAttribute('data-id'));
            const isFav = favs.includes(productId);
            if (isFav) {
                likeBtn.style.color = 'var(--error)';
                likeBtn.querySelector('svg')?.setAttribute('fill', 'currentColor');
            } else {
                likeBtn.style.color = '';
                likeBtn.querySelector('svg')?.setAttribute('fill', 'none');
            }
        });
    },

    syncUserRole() {
        const user = JSON.parse(localStorage.getItem('condconnect_user') || 'null');
        const role = user?.papel || localStorage.getItem('condconnect_user_role');
        const adminEls  = document.querySelectorAll('.admin-only');
        const adminBanner = document.getElementById('admin-banner');

        if (role === 'admin') {
            adminEls.forEach(el => el.style.display = 'flex');
            if (adminBanner) adminBanner.style.display = 'block';
        } else {
            adminEls.forEach(el => el.style.display = 'none');
            if (adminBanner) adminBanner.style.display = 'none';
        }
    },

    initMobileNav() {
        const menuToggles = document.querySelectorAll('.menu-toggle, .mobile-menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        if (sidebar && overlay) {
            menuToggles.forEach(toggle => {
                toggle.addEventListener('click', () => {
                    sidebar.classList.toggle('active');
                    overlay.classList.toggle('active');
                });
            });
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', () => {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                });
            });
        }
    },

    initLandingNav() {
        const toggle = document.querySelector('.mobile-menu-toggle');
        const nav = document.querySelector('.nav-links');
        if (toggle && nav) {
            toggle.addEventListener('click', () => nav.classList.toggle('active'));
            nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => nav.classList.remove('active')));
        }
    },

    initNotifications() {
        const notifBtn = document.querySelector('.notification-btn');
        const notifDropdown = document.querySelector('.notification-dropdown');
        if (notifBtn && notifDropdown) {
            notifBtn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                notifDropdown.classList.toggle('active');
                this.carregarNotificacoes();
            });
            document.addEventListener('click', e => {
                if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
                    notifDropdown.classList.remove('active');
                }
            });
            const markAll = notifDropdown.querySelector('.mark-all-read');
            if (markAll) {
                markAll.addEventListener('click', async e => {
                    e.preventDefault();
                    try {
                        await this.api('/notificacoes/index.php', { method: 'PUT', body: {} });
                        document.querySelectorAll('.notification-item.unread').forEach(i => i.classList.remove('unread'));
                        const badge = document.querySelector('.notification-badge');
                        if (badge) badge.textContent = '0';
                    } catch {}
                });
            }
        }
    },

    async carregarNotificacoes() {
        try {
            const data = await this.api('/notificacoes/index.php');
            const badge = document.querySelector('.notification-badge');
            if (badge) badge.textContent = data.nao_lidas || '0';
            const lista = document.querySelector('.notification-list');
            if (lista) {
                if (data.notificacoes?.length) {
                    lista.innerHTML = data.notificacoes.slice(0, 5).map(n => `
                        <div class="notification-item ${n.lida ? '' : 'unread'}" data-id="${n.id}">
                            <p style="margin:0;font-size:13px;font-weight:${n.lida ? '400' : '600'}">${n.titulo}</p>
                            <p style="margin:4px 0 0;font-size:12px;color:#64748b">${n.mensagem || ''}</p>
                        </div>
                    `).join('');
                } else {
                    lista.innerHTML = '<p style="text-align:center;padding:20px;color:#64748b;font-size:13px">Nenhuma notificação</p>';
                }
            }
        } catch {}
    },

    async syncUserHeader() {
        const user = await this.getMe();
        if (!user) return;
        document.querySelectorAll('.user-name').forEach(el => el.textContent = user.nome);
        document.querySelectorAll('.user-role').forEach(el => {
            el.textContent = user.papel === 'admin' ? 'Administrador' : 'Membro';
        });
        document.querySelectorAll('.header-avatar').forEach(el => {
            el.src = user.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nome)}&background=00A6A6&color=fff`;
            el.alt = user.nome;
        });
        document.querySelectorAll('.header-user-initials').forEach(el => {
            const parts = user.nome.trim().split(' ');
            el.textContent = (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
        });
    },

    formatarPreco(preco) {
        return 'R$ ' + parseFloat(preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    },

    renderProdutoCard(produto, options = {}) {
        const { linkHref = `/Templates/detalhes-produto.html?id=${produto.id}` } = options;
        const condicaoClass = produto.condicao === 'Novo' ? 'green' : produto.condicao === 'Seminovo' ? 'blue' : 'dark';
        return `
            <a href="${linkHref}" class="product-card" data-id="${produto.id}">
                <div class="product-image-container">
                    <img src="${produto.foto || '/static/assets/images/produto-placeholder.jpg'}" alt="${produto.titulo}" class="product-image">
                    <span class="product-tag ${condicaoClass}">${produto.condicao || 'Usado'}</span>
                    <div class="like-btn" data-id="${produto.id}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </div>
                </div>
                <div class="product-info">
                    <span class="product-category-tag">${produto.categoria}</span>
                    <h3 class="product-title">${produto.titulo}</h3>
                    <span class="product-price">${produto.preco_fmt || CondConnect.formatarPreco(produto.preco)}</span>
                    <div class="product-footer">
                        <div class="seller-info">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            ${produto.vendedor?.nome || ''}
                            <span style="display:flex;align-items:center;gap:2px;margin-left:6px;color:#f59e0b;font-weight:700;font-size:11px;">
                                <svg width="10" height="10" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                                ${produto.vendedor?.rating?.toFixed(1) || '5.0'}
                            </span>
                        </div>
                        <div class="location-info">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            ${produto.vendedor?.localizacao?.split(' - ')[0] || ''}
                        </div>
                    </div>
                </div>
            </a>
        `;
    }
};

// Global Init
document.addEventListener('DOMContentLoaded', () => {
    CondConnect.initMobileNav();
    CondConnect.initLandingNav();
    CondConnect.syncUserRole();
    CondConnect.initNotifications();
    CondConnect.syncUserHeader();
    CondConnect.carregarNotificacoes();

    // Like button delegation
    document.addEventListener('click', async function(e) {
        const likeBtn = e.target.closest('.like-btn');
        if (!likeBtn) return;
        e.preventDefault();
        e.stopPropagation();

        const card = likeBtn.closest('.product-card');
        if (!card) return;
        const productId = parseInt(likeBtn.getAttribute('data-id') || card.getAttribute('data-id'));
        if (!productId) return;

        try {
            const isFav = await CondConnect.toggleFavorito(productId);
            if (isFav === null) return; // não autenticado
            likeBtn.style.color = isFav ? '#ef4444' : '';
            likeBtn.querySelector('svg')?.setAttribute('fill', isFav ? 'currentColor' : 'none');
        } catch {}
    });

    CondConnect.syncHearts();
});
