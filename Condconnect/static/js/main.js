// Global Application State & Helpers
const CondConnect = {
    // Default Mock Products
    mockProducts: [
        {
            id: 'p1',
            title: 'IPhone 13 Pro Max 256GB',
            price: 'R$ 4.500,00',
            category: 'eletronicos',
            image: '/static/assets/images/celular.jpg',
            seller: 'Carlos Silva',
            sellerRating: 4.8,
            totalSales: 12,
            location: 'Bloco A - Apto 101',
            description: 'iPhone em estado de novo, sem riscos. Acompanha caixa e carregador original.',
            condition: 'Seminovo'
        },
        {
            id: 'p2',
            title: 'Mesa de Jantar 6 Lugares',
            price: 'R$ 1.200,00',
            category: 'moveis',
            image: 'https://images.unsplash.com/photo-1577145745727-42b88d4de76d?q=80&w=500&auto=format&fit=crop',
            seller: 'Ana Beatriz',
            sellerRating: 5.0,
            totalSales: 8,
            location: 'Bloco C - Apto 305',
            description: 'Mesa de madeira maciça em ótimo estado. Motivo: Mudança.',
            condition: 'Usado'
        },
        {
            id: 'p3',
            title: 'Bicicleta Mountain Bike',
            price: 'R$ 850,00',
            category: 'esportes',
            image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=500&auto=format&fit=crop',
            seller: 'Marcos Oliveira',
            sellerRating: 4.2,
            totalSales: 5,
            location: 'Bloco B - Apto 202',
            description: 'Bicicleta revisada mês passado. Aro 29.',
            condition: 'Usado'
        },
        {
            id: 'p4',
            title: 'Smart TV 55" 4K Samsung',
            price: 'R$ 2.100,00',
            category: 'eletronicos',
            image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=500&auto=format&fit=crop',
            seller: 'Ricardo Santos',
            sellerRating: 4.7,
            totalSales: 21,
            location: 'Bloco A - Apto 504',
            description: 'TV con 1 ano de uso, impecável. Tenho a nota fiscal.',
            condition: 'Usado'
        }
    ],

    getProducts: function () {
        const userProducts = JSON.parse(localStorage.getItem('condconnect_user_products')) || [];
        const formattedUserProducts = userProducts.map(p => ({
            id: p.id,
            title: p.title,
            price: p.price.startsWith('R$') ? p.price : `R$ ${p.price}`,
            category: p.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
            image: p.image,
            seller: 'Você',
            sellerRating: 5.0,
            totalSales: 0,
            location: 'Seu Apto',
            description: p.description,
            condition: p.condition
        }));

        return [...formattedUserProducts, ...this.mockProducts];
    },

    getProductById: function (id) {
        return this.getProducts().find(p => p.id === id);
    },

    // Central Favorites Logic
    syncHearts: function () {
        const favorites = JSON.parse(localStorage.getItem('condconnect_favorites')) || [];
        document.querySelectorAll('.product-card').forEach(card => {
            const likeBtn = card.querySelector('.like-btn');
            if (likeBtn) {
                const productId = likeBtn.getAttribute('data-id') ||
                    card.getAttribute('data-id') ||
                    card.getAttribute('href')?.split('=')[1];

                const isFav = favorites.some(f => (typeof f === 'string' ? f === productId : f.id === productId));

                if (isFav) {
                    likeBtn.style.color = 'var(--error)';
                    likeBtn.querySelector('svg').setAttribute('fill', 'currentColor');
                } else {
                    likeBtn.style.color = '';
                    likeBtn.querySelector('svg').setAttribute('fill', 'none');
                }
            }
        });
    },

    // Initialization for Mobile Navigation
    initMobileNav: function () {
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

            // Close sidebar when clicking on nav items (mobile)
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', () => {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                });
            });
        }
    },

    // Initialization for Landing Page Navigation
    initLandingNav: function () {
        const toggle = document.querySelector('.mobile-menu-toggle');
        const nav = document.querySelector('.nav-links');

        if (toggle && nav) {
            toggle.addEventListener('click', () => {
                nav.classList.toggle('active');
            });

            // Close when clicking links
            nav.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    nav.classList.remove('active');
                });
            });
        }
    },

    // Role-based UI logic
    syncUserRole: function () {
        const role = localStorage.getItem('condconnect_user_role');
        const adminElements = document.querySelectorAll('.admin-only');
        const adminBanner = document.getElementById('admin-banner');

        if (role === 'admin') {
            adminElements.forEach(el => el.style.display = 'flex');
            if (adminBanner) adminBanner.style.display = 'block';
        } else {
            adminElements.forEach(el => el.style.display = 'none');
            if (adminBanner) adminBanner.style.display = 'none';
        }
    },

    // Initialization for Notifications Dropdown
    initNotifications: function () {
        const notifBtn = document.querySelector('.notification-btn');
        const notifDropdown = document.querySelector('.notification-dropdown');

        if (notifBtn && notifDropdown) {
            notifBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                notifDropdown.classList.toggle('active');
            });

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
                    notifDropdown.classList.remove('active');
                }
            });

            // Handle "Mark all as read"
            const markAllRead = notifDropdown.querySelector('.mark-all-read');
            if (markAllRead) {
                markAllRead.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.querySelectorAll('.notification-item.unread').forEach(item => {
                        item.classList.remove('unread');
                        const dot = item.querySelector('.unread-dot');
                        if (dot) dot.remove();
                    });
                    const badge = document.querySelector('.notification-badge');
                    if (badge) badge.textContent = '0';
                });
            }
        }
    }
};

// Global Init
document.addEventListener('DOMContentLoaded', () => {
    CondConnect.initMobileNav();
    CondConnect.initLandingNav();
    CondConnect.syncUserRole();
    CondConnect.initNotifications();
    console.log('CondConnect - Inicializado');

    // Initial sync
    CondConnect.syncHearts();

    // Event Delegation for Like Buttons (Centralized)
    document.addEventListener('click', function (e) {
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            e.preventDefault();
            e.stopPropagation();

            const card = likeBtn.closest('.product-card');
            if (!card) return;

            const productId = likeBtn.getAttribute('data-id') ||
                card.getAttribute('data-id') ||
                card.getAttribute('href')?.split('=')[1];

            if (!productId) return;

            let favorites = JSON.parse(localStorage.getItem('condconnect_favorites')) || [];
            const index = favorites.findIndex(f => (typeof f === 'string' ? f === productId : f.id === productId));

            if (index === -1) {
                const product = CondConnect.getProductById(productId);
                if (product) {
                    favorites.push(product);
                    likeBtn.style.color = '#ef4444';
                    likeBtn.querySelector('svg').setAttribute('fill', 'currentColor');
                }
            } else {
                favorites.splice(index, 1);
                likeBtn.style.color = '';
                likeBtn.querySelector('svg').setAttribute('fill', 'none');
            }

            localStorage.setItem('condconnect_favorites', JSON.stringify(favorites));
            window.dispatchEvent(new Event('storage'));
        }
    });

    // GLOBAL NOTIFICATIONS
    function updateNotificationBadges() {
        const conversations = JSON.parse(localStorage.getItem('condconnect_conversations')) || [];
        const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread || 0), 0);
        const msgNavItem = Array.from(document.querySelectorAll('.nav-item')).find(item => item.textContent.includes('Mensagens'));

        if (msgNavItem) {
            let badge = msgNavItem.querySelector('.notification-badge');
            if (totalUnread > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'notification-badge';
                    badge.style.cssText = 'background: #ef4444; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; margin-left: auto;';
                    msgNavItem.appendChild(badge);
                }
                badge.textContent = totalUnread;
            } else if (badge) {
                badge.remove();
            }
        }
    }

    window.addEventListener('new_message', updateNotificationBadges);
    updateNotificationBadges();

    // GLOBAL PAGE RELOAD FUNCTIONALITY
    // Adiciona funcionalidade para botões recarregarem a página atual
    document.addEventListener('click', function (e) {
        const reloadBtn = e.target.closest('[data-reload="true"], .reload-page');
        if (reloadBtn) {
            e.preventDefault();
            e.stopPropagation();

            // Recarrega a página atual
            window.location.reload();
        }
    });
});
