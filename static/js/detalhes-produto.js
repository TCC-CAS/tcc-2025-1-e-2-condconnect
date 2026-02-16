document.addEventListener('DOMContentLoaded', function () {
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    const mainImage = document.getElementById('detail-image');
    const thumbnails = document.querySelectorAll('.thumbnail');

    // DYNAMIC RENDERING LOGIC
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (productId) {
        const product = CondConnect.getProductById(productId);
        if (product) {
            // Update UI elements
            document.getElementById('detail-title').textContent = product.title;
            document.getElementById('detail-price').textContent = product.price;
            mainImage.src = product.image;

            // Update thumbnails (for now using same image or mock ones)
            thumbnails.forEach((thumb, idx) => {
                if (idx === 0) thumb.src = product.image;
                // Leave others as is or clear them
            });

            document.querySelector('.product-description p').textContent = product.description;
            document.querySelector('.seller-details h4').textContent = product.seller;
            document.querySelector('.seller-details p').textContent = product.location;

            // Update Breadcrumb if exists
            const breadcrumb = document.querySelector('.breadcrumb');
            if (breadcrumb) {
                breadcrumb.innerHTML = `<a href="/Templates/marketplace.html">Marketplace</a> / <span>${product.category}</span> / <span>${product.title}</span>`;
            }
        }
    }

    // GALLERY LOGIC
    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', function () {
            mainImage.src = this.src;
            thumbnails.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // CART LOGIC
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function () {
            const productData = {
                id: productId || 'manual_' + Date.now(),
                title: document.getElementById('detail-title').textContent,
                price: document.getElementById('detail-price').textContent,
                image: document.getElementById('detail-image').getAttribute('src'),
                seller: document.querySelector('.seller-details h4').textContent,
                location: document.querySelector('.seller-details p').textContent,
                quantity: 1
            };

            let cart = JSON.parse(localStorage.getItem('condconnect_cart')) || [];
            const existingItemIndex = cart.findIndex(item => item.id === productData.id);

            if (existingItemIndex > -1) {
                cart[existingItemIndex].quantity += 1;
            } else {
                cart.push(productData);
            }

            localStorage.setItem('condconnect_cart', JSON.stringify(cart));

            const originalContent = this.innerHTML;
            this.innerHTML = "✓ Adicionado!";
            this.style.backgroundColor = "#10b981";

            setTimeout(() => {
                this.innerHTML = originalContent;
                this.style.backgroundColor = "";
            }, 2000);
        });
    }

    // CONTACT SELLER LOGIC
    const contactBtn = document.querySelector('.btn-secondary');
    if (contactBtn && contactBtn.textContent.includes('Contatar Vendedor')) {
        contactBtn.addEventListener('click', function (e) {
            e.preventDefault();

            const sellerName = document.querySelector('.seller-details h4').textContent;
            const sellerAvatar = document.querySelector('.seller-avatar').textContent.charAt(0);
            const conversationId = 'conv_' + sellerName.toLowerCase().replace(/\s/g, '_');

            let conversations = JSON.parse(localStorage.getItem('condconnect_conversations')) || [];
            let conv = conversations.find(c => c.id === conversationId);

            if (!conv) {
                conv = {
                    id: conversationId,
                    name: sellerName,
                    avatar: sellerAvatar,
                    status: 'Online agora',
                    lastMessage: 'Aguardando sua mensagem...',
                    time: new Date().getHours() + ':' + new Date().getMinutes().toString().padStart(2, '0'),
                    unread: 0,
                    messages: [] // No hardcoded messages
                };
                conversations.unshift(conv);
                localStorage.setItem('condconnect_conversations', JSON.stringify(conversations));
            }

            localStorage.setItem('condconnect_active_chat', conversationId);
            window.location.href = '/Templates/mensagens.html';
        });
    }
});
