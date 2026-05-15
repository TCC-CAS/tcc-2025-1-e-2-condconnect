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
                const path = window.location.pathname;
                const publicPages = ['index', 'login', 'cadastro', 'esqueci-senha', 'redefinir-senha'];
                const isPublic = publicPages.some(p => path.includes(p)) || path.endsWith('');
                if (!isPublic) {
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
            const user = await this.api('/me');
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
                await this.api(`/favoritos?produto_id=${produtoId}`, { method: 'DELETE' });
                const novo = favs.filter(f => f !== produtoId);
                localStorage.setItem('condconnect_favorites', JSON.stringify(novo));
            } else {
                await this.api('/favoritos', { method: 'POST', body: { produto_id: produtoId } });
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
                        await this.api('/notificacoes', { method: 'PUT', body: {} });
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
            const data = await this.api('/notificacoes');
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
            el.src = user.foto_url || `https:///ui-avatars.com/api/?name=${encodeURIComponent(user.nome)}&background=00A6A6&color=fff`;
            el.alt = user.nome;
        });
        document.querySelectorAll('.header-user-initials').forEach(el => {
            const parts = user.nome.trim().split(' ');
            el.textContent = (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
        });
    },

    showAlert(mensagem, tipo = 'info') {
        return new Promise(resolve => {
            if (!document.getElementById('cc-modal-anim')) {
                const s = document.createElement('style');
                s.id = 'cc-modal-anim';
                s.textContent = '@keyframes ccFadeIn{from{opacity:0}to{opacity:1}} @keyframes ccSlideUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}';
                document.head.appendChild(s);
            }
            const cor = { success:'#16a34a', error:'#dc2626', warning:'#d97706', info:'#00a6a6' }[tipo] || '#00a6a6';
            const icons = {
                success: `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="20 6 9 17 4 12"/></svg>`,
                error:   `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
                warning: `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
                info:    `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
            };
            const ov = document.createElement('div');
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;animation:ccFadeIn .15s ease;';
            ov.innerHTML = `<div style="background:#fff;border-radius:20px;padding:36px 28px 28px;max-width:380px;width:100%;box-shadow:0 24px 80px rgba(0,0,0,.18);text-align:center;animation:ccSlideUp .2s ease;">
                <div style="margin-bottom:18px;">${icons[tipo] || icons.info}</div>
                <p style="margin:0 0 28px;color:#1e293b;font-size:15px;line-height:1.6;font-weight:500;">${mensagem}</p>
                <button style="background:${cor};color:#fff;border:none;border-radius:12px;padding:13px 0;font-size:15px;font-weight:700;cursor:pointer;width:100%;">OK</button>
            </div>`;
            document.body.appendChild(ov);
            const fechar = () => { ov.remove(); resolve(); };
            ov.querySelector('button').addEventListener('click', fechar);
            ov.addEventListener('click', e => { if (e.target === ov) fechar(); });
        });
    },

    showConfirm(mensagem, titulo = 'Confirmar') {
        return new Promise(resolve => {
            const ov = document.createElement('div');
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;animation:ccFadeIn .15s ease;';
            ov.innerHTML = `<div style="background:#fff;border-radius:20px;padding:32px 28px 24px;max-width:380px;width:100%;box-shadow:0 24px 80px rgba(0,0,0,.18);text-align:center;animation:ccSlideUp .2s ease;">
                <div style="width:52px;height:52px;background:#f0fafa;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00a6a6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <h3 style="margin:0 0 10px;color:#0f172a;font-size:17px;font-weight:700;">${titulo}</h3>
                <p style="margin:0 0 26px;color:#475569;font-size:14px;line-height:1.6;">${mensagem}</p>
                <div style="display:flex;gap:10px;">
                    <button id="cc-cancel" style="flex:1;background:#f1f5f9;color:#475569;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:600;cursor:pointer;">Cancelar</button>
                    <button id="cc-ok" style="flex:1;background:#00a6a6;color:#fff;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;">Confirmar</button>
                </div>
            </div>`;
            document.body.appendChild(ov);
            ov.querySelector('#cc-ok').addEventListener('click', () => { ov.remove(); resolve(true); });
            ov.querySelector('#cc-cancel').addEventListener('click', () => { ov.remove(); resolve(false); });
            ov.addEventListener('click', e => { if (e.target === ov) { ov.remove(); resolve(false); } });
        });
    },

    showInput(mensagem, placeholder = '') {
        return new Promise(resolve => {
            const ov = document.createElement('div');
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;animation:ccFadeIn .15s ease;';
            ov.innerHTML = `<div style="background:#fff;border-radius:20px;padding:32px 28px 24px;max-width:380px;width:100%;box-shadow:0 24px 80px rgba(0,0,0,.18);animation:ccSlideUp .2s ease;">
                <p style="margin:0 0 16px;color:#1e293b;font-size:15px;font-weight:600;">${mensagem}</p>
                <input id="cc-inp" type="text" placeholder="${placeholder}" style="width:100%;box-sizing:border-box;padding:12px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;outline:none;font-family:inherit;margin-bottom:20px;">
                <div style="display:flex;gap:10px;">
                    <button id="cc-cancel" style="flex:1;background:#f1f5f9;color:#475569;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:600;cursor:pointer;">Cancelar</button>
                    <button id="cc-ok" style="flex:1;background:#00a6a6;color:#fff;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;">Enviar</button>
                </div>
            </div>`;
            document.body.appendChild(ov);
            const inp = ov.querySelector('#cc-inp');
            inp.focus();
            inp.addEventListener('focus', () => inp.style.borderColor = '#00a6a6');
            inp.addEventListener('blur',  () => inp.style.borderColor = '#e2e8f0');
            const ok = () => { ov.remove(); resolve(inp.value.trim() || null); };
            ov.querySelector('#cc-ok').addEventListener('click', ok);
            ov.querySelector('#cc-cancel').addEventListener('click', () => { ov.remove(); resolve(null); });
            inp.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
            ov.addEventListener('click', e => { if (e.target === ov) { ov.remove(); resolve(null); } });
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
                    <img src="${produto.foto || ''}" alt="${produto.titulo}" class="product-image" onerror="this.style.opacity='0';this.parentElement.style.background='#e2e8f0'">
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
                        </div>
                        <div class="rating-info">
                            ${produto.produto_rating != null
                                ? `<svg width="12" height="12" fill="#f59e0b" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg> <span style="font-weight:700;color:#92400e;">${produto.produto_rating.toFixed(1)}</span> <span style="color:#94a3b8;">(${produto.produto_avaliacoes})</span>`
                                : `<span style="color:#94a3b8;font-size:11px;">Sem avaliações</span>`
                            }
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
