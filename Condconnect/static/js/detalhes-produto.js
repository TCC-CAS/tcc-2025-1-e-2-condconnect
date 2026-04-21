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
            document.getElementById('seller-name').textContent = product.seller;
            document.getElementById('seller-location').textContent = product.location;
            document.getElementById('seller-rating').textContent = product.sellerRating || 'N/A';
            document.getElementById('seller-sales').textContent = (product.totalSales || 0) + ' vendas';

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
                seller: document.getElementById('seller-name').textContent,
                location: document.getElementById('seller-location').textContent,
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
    // STAR RATING LOGIC
    const stars = document.querySelectorAll('.star-rating');
    let selectedRating = 0;

    stars.forEach((star, index) => {
        star.style.cursor = 'pointer';
        star.addEventListener('mouseover', () => {
            resetStars();
            for (let i = 0; i <= index; i++) {
                stars[i].style.color = '#f59e0b';
            }
        });

        star.addEventListener('click', () => {
            selectedRating = index + 1;
            resetStars();
            for (let i = 0; i < selectedRating; i++) {
                stars[i].style.color = '#f59e0b';
            }
        });
    });

    function resetStars() {
        stars.forEach(s => {
            s.style.color = selectedRating > 0 && Array.from(stars).indexOf(s) < selectedRating ? '#f59e0b' : '#cbd5e1';
        });
    }

    const commentContainer = document.querySelector('.evaluations-container');
    if (commentContainer) {
        commentContainer.addEventListener('mouseleave', resetStars);
    }

    // COMMENT PUBLISH LOGIC
    const publishBtn = document.querySelector('.evaluations-container button');
    const commentArea = document.querySelector('.evaluations-container textarea');
    const commentsList = document.getElementById('comments-list');

    if (publishBtn && commentArea && commentsList) {
        publishBtn.addEventListener('click', () => {
            const text = commentArea.value.trim();
            if (!text) return;

            const newComment = document.createElement('div');
            newComment.style.cssText = 'border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; transition: all 0.3s; opacity: 0; transform: translateY(10px);';

            let starsHTML = '';
            for (let i = 0; i < 5; i++) {
                starsHTML += `<svg width="12" height="12" fill="${i < (selectedRating || 5) ? '#f59e0b' : '#cbd5e1'}" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;
            }

            newComment.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <div style="width: 32px; height: 32px; background: var(--primary-soft); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;">V</div>
                    <div>
                        <h4 style="margin: 0; font-size: 14px; color: #1e293b;">Você</h4>
                        <div style="display: flex; color: #f59e0b; margin-top: 2px;">
                            ${starsHTML}
                        </div>
                    </div>
                </div>
                <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">${text}</p>
            `;

            commentsList.prepend(newComment);

            // Clear inputs
            commentArea.value = '';
            selectedRating = 0;
            resetStars();

            // Animation
            setTimeout(() => {
                newComment.style.opacity = '1';
                newComment.style.transform = 'translateY(0)';
            }, 10);
        });
    }
});
