document.addEventListener('DOMContentLoaded', async function () {
    const urlParams  = new URLSearchParams(window.location.search);
    const productId  = parseInt(urlParams.get('id'));
    const mainImage  = document.getElementById('detail-image');
    const thumbnails = document.querySelectorAll('.thumbnail');

    if (!productId) return;

    // Carregar produto da API
    let produto = null;
    try {
        produto = await CondConnect.api(`/produtos/item.php?id=${productId}`);
    } catch {
        document.querySelector('.product-detail-container, .main-content')?.insertAdjacentHTML('afterbegin',
            '<div style="text-align:center;padding:60px;color:#dc2626">Produto não encontrado.</div>');
        return;
    }

    // Preencher dados na página
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setImg = (id, src) => { const el = document.getElementById(id); if (el) el.src = src; };

    set('detail-title', produto.titulo);
    set('detail-price', produto.preco_fmt);
    const qtdEl = document.getElementById('detail-quantity');
    if (qtdEl) {
        if (produto.quantidade > 0) {
            qtdEl.innerHTML = `<span style="color:#16a34a;font-weight:600;">● ${produto.quantidade} disponíve${produto.quantidade === 1 ? 'l' : 'is'}</span>`;
        } else {
            qtdEl.innerHTML = `<span style="color:#dc2626;font-weight:600;">● Esgotado</span>`;
        }
    }
    set('seller-name', produto.vendedor?.nome || '');
    set('seller-location', produto.vendedor?.localizacao || '');
    set('seller-rating', produto.vendedor?.rating?.toFixed(1) || 'N/A');
    set('seller-sales', (produto.vendedor?.vendas || 0) + ' vendas');

    if (mainImage && produto.foto) mainImage.src = produto.foto;

    const descEl = document.querySelector('.product-description p');
    if (descEl) descEl.textContent = produto.descricao || '';

    const condTag = document.querySelector('.condition-tag, .product-tag');
    if (condTag) condTag.textContent = produto.condicao;

    // Meta (categoria + data)
    const metaEl = document.getElementById('detail-meta');
    if (metaEl && produto.criado_em) {
        const dias = Math.floor((Date.now() - new Date(produto.criado_em)) / 86400000);
        const tempoStr = dias === 0 ? 'hoje' : dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
        metaEl.innerHTML = `<span>${produto.categoria}</span> • <span>Publicado ${tempoStr}</span>`;
    }

    // Thumbnails
    const thumbList = document.getElementById('thumbnail-list');
    if (thumbList && produto.foto) {
        const fotos = [produto.foto, ...(produto.imagens || [])];
        thumbList.innerHTML = fotos.map((f, i) =>
            `<img src="${f}" alt="Foto ${i+1}" class="thumbnail ${i === 0 ? 'active' : ''}">`
        ).join('');
        thumbList.querySelectorAll('.thumbnail').forEach(img => {
            img.addEventListener('click', () => {
                if (mainImage) mainImage.src = img.src;
                thumbList.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                img.classList.add('active');
            });
        });
    }

    // Breadcrumb
    const breadcrumb = document.querySelector('.breadcrumb');
    if (breadcrumb) {
        breadcrumb.innerHTML = `<a href="/Templates/marketplace.html">Marketplace</a> / <span>${produto.categoria}</span> / <span>${produto.titulo}</span>`;
    }

    // Botão favorito
    const favBtn = document.querySelector('.btn-favorite, [data-action="favorite"]');
    if (favBtn) {
        if (produto.favorito) {
            favBtn.classList.add('active');
            favBtn.style.color = '#ef4444';
        }
        favBtn.addEventListener('click', async () => {
            try {
                const isFav = await CondConnect.toggleFavorito(productId);
                if (isFav === null) { window.location.href = '/Templates/login.html'; return; }
                favBtn.classList.toggle('active', isFav);
                favBtn.style.color = isFav ? '#ef4444' : '';
            } catch {}
        });
    }

    // Thumbnails (imagens extras)
    if (produto.imagens?.length) {
        thumbnails.forEach((thumb, i) => {
            if (produto.imagens[i]) thumb.src = produto.imagens[i];
        });
    } else {
        thumbnails.forEach(thumb => { thumb.src = produto.foto; });
    }

    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', function () {
            if (mainImage) mainImage.src = this.src;
            thumbnails.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Adicionar ao carrinho
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', async function () {
            const originalContent = this.innerHTML;
            this.disabled = true;
            this.innerHTML = 'Adicionando...';
            try {
                await CondConnect.api('/carrinho/index.php', {
                    method: 'POST',
                    body: { produto_id: productId, quantidade: 1 },
                });
                this.innerHTML = '✓ Adicionado!';
                this.style.backgroundColor = '#10b981';
                setTimeout(() => {
                    this.innerHTML = originalContent;
                    this.style.backgroundColor = '';
                    this.disabled = false;
                }, 2000);
            } catch (err) {
                alert(err.message || 'Erro ao adicionar ao carrinho');
                this.innerHTML = originalContent;
                this.disabled = false;
            }
        });
    }

    // Contatar vendedor
    const contactBtn = document.querySelector('.btn-secondary');
    if (contactBtn && contactBtn.textContent.includes('Contatar')) {
        contactBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            try {
                const result = await CondConnect.api('/conversas/index.php', {
                    method: 'POST',
                    body: { usuario_id: produto.vendedor.id, produto_id: productId },
                });
                window.location.href = `/Templates/mensagens.html?conversa=${result.id}`;
            } catch (err) {
                if (err.status === 401) window.location.href = '/Templates/login.html';
                else alert(err.message || 'Erro ao iniciar conversa');
            }
        });
    }

    // Denunciar
    const reportBtn = document.querySelector('[data-action="report"], .btn-report');
    if (reportBtn) {
        reportBtn.addEventListener('click', async () => {
            const motivo = prompt('Motivo da denúncia:');
            if (!motivo) return;
            try {
                await CondConnect.api('/relatorios/index.php', {
                    method: 'POST',
                    body: { tipo: 'produto', alvo_id: productId, motivo },
                });
                alert('Denúncia registrada. Obrigado!');
            } catch (err) {
                alert(err.message || 'Erro ao registrar denúncia');
            }
        });
    }

    // Resumo de avaliações
    const reviewsSummary = document.getElementById('reviews-summary');
    if (reviewsSummary && produto.avaliacoes?.length) {
        const media = (produto.avaliacoes.reduce((s, a) => s + a.nota, 0) / produto.avaliacoes.length).toFixed(1);
        const starSvg = `<svg width="14" height="14" fill="#f59e0b" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;
        reviewsSummary.innerHTML = `<span style="font-weight:700;color:#f59e0b;">${media}</span><span style="color:#f59e0b;">${starSvg}</span><span style="color:#64748b;font-size:14px;">(${produto.avaliacoes.length} avaliação${produto.avaliacoes.length !== 1 ? 'ões' : ''})</span>`;
    }

    // Avaliações
    const commentsList = document.getElementById('comments-list');
    if (commentsList && produto.avaliacoes?.length) {
        commentsList.innerHTML = produto.avaliacoes.map(av => {
            const stars = Array(5).fill(0).map((_, i) => `
                <svg width="12" height="12" fill="${i < av.nota ? '#f59e0b' : '#cbd5e1'}" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            `).join('');
            return `
                <div style="border-bottom:1px solid #f1f5f9;padding-bottom:16px;margin-bottom:16px;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                        <div style="width:32px;height:32px;background:var(--primary-soft,#eff6ff);color:var(--primary,#2563eb);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;">${av.avaliador?.charAt(0) || 'U'}</div>
                        <div>
                            <h4 style="margin:0;font-size:14px;color:#1e293b;">${av.avaliador || 'Usuário'}</h4>
                            <div style="display:flex;color:#f59e0b;margin-top:2px;">${stars}</div>
                        </div>
                    </div>
                    <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0;">${av.comentario || ''}</p>
                </div>
            `;
        }).join('');
    }

    // Publicar avaliação
    const stars = document.querySelectorAll('.star-rating');
    let selectedRating = 0;

    stars.forEach((star, index) => {
        star.style.cursor = 'pointer';
        star.addEventListener('click', () => {
            selectedRating = index + 1;
            stars.forEach((s, i) => { s.style.color = i < selectedRating ? '#f59e0b' : '#cbd5e1'; });
        });
        star.addEventListener('mouseover', () => {
            stars.forEach((s, i) => { s.style.color = i <= index ? '#f59e0b' : '#cbd5e1'; });
        });
        star.addEventListener('mouseleave', () => {
            stars.forEach((s, i) => { s.style.color = i < selectedRating ? '#f59e0b' : '#cbd5e1'; });
        });
    });

    const publishBtn = document.querySelector('.evaluations-container button');
    const commentArea = document.querySelector('.evaluations-container textarea');

    if (publishBtn && commentArea) {
        publishBtn.addEventListener('click', async () => {
            const texto = commentArea.value.trim();
            if (!texto || !selectedRating) {
                alert('Selecione uma nota e escreva um comentário');
                return;
            }
            try {
                await CondConnect.api('/avaliacoes/index.php', {
                    method: 'POST',
                    body: { avaliado_id: produto.vendedor.id, produto_id: productId, nota: selectedRating, comentario: texto },
                });
                commentArea.value = '';
                selectedRating = 0;
                stars.forEach(s => s.style.color = '#cbd5e1');
                alert('Avaliação enviada com sucesso!');
            } catch (err) {
                alert(err.message || 'Erro ao enviar avaliação');
            }
        });
    }
});
