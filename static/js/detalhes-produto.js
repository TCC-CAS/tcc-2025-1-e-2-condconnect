document.addEventListener('DOMContentLoaded', async function () {
    const urlParams  = new URLSearchParams(window.location.search);
    const productId  = parseInt(urlParams.get('id'));
    const mainImage  = document.getElementById('detail-image');
    const thumbnails = document.querySelectorAll('.thumbnail');

    if (!productId) return;

    // Carregar produto da API
    let produto = null;
    try {
        produto = await CondConnect.api(`/produtos/item?id=${productId}`);
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
    const avatarEl = document.querySelector('.seller-avatar');
    if (avatarEl && produto.vendedor?.nome) {
        const parts = produto.vendedor.nome.trim().split(/\s+/);
        avatarEl.textContent = parts.length >= 2
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : parts[0][0].toUpperCase();
    }
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
                await CondConnect.api('/carrinho', {
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
                const result = await CondConnect.api('/conversas', {
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
                await CondConnect.api('/relatorios', {
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

    // Seção de avaliação — verificar permissão
    const avaliacaoContainer = document.querySelector('.evaluations-container');
    const reviewFormArea = avaliacaoContainer?.querySelector('div:has(h3)') ||
                           avaliacaoContainer?.querySelector('[id="review-form-area"]');

    try {
        const avData = await CondConnect.api(`/avaliacoes?produto_id=${productId}`);
        const formSection = avaliacaoContainer?.querySelector('div[style*="margin-top: 32px"], div[style*="margin-top:32px"]') ||
                            [...(avaliacaoContainer?.children || [])].find(el => el.querySelector('h3'));

        if (formSection) {
            if (avData.ja_avaliou) {
                formSection.innerHTML = `<p style="color:#16a34a;font-weight:600;padding:16px;background:#dcfce7;border-radius:10px;">✓ Você já avaliou este produto.</p>`;
            } else if (!avData.pode_avaliar) {
                formSection.innerHTML = `<p style="color:#64748b;padding:16px;background:#f1f5f9;border-radius:10px;">🔒 Apenas compradores que receberam este produto podem avaliá-lo.</p>`;
            } else {
                // Pode avaliar — ativar stars e botão
                const stars = formSection.querySelectorAll('.star-rating');
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

                const publishBtn = formSection.querySelector('button');
                const commentArea = formSection.querySelector('textarea');

                if (publishBtn && commentArea) {
                    publishBtn.addEventListener('click', async () => {
                        const texto = commentArea.value.trim();
                        if (!texto || !selectedRating) {
                            alert('Selecione uma nota e escreva um comentário');
                            return;
                        }
                        publishBtn.disabled = true;
                        publishBtn.textContent = 'Enviando...';
                        try {
                            await CondConnect.api('/avaliacoes', {
                                method: 'POST',
                                body: { avaliado_id: produto.vendedor.id, produto_id: productId, nota: selectedRating, comentario: texto },
                            });
                            formSection.innerHTML = `<p style="color:#16a34a;font-weight:600;padding:16px;background:#dcfce7;border-radius:10px;">✓ Avaliação enviada com sucesso! Obrigado.</p>`;
                        } catch (err) {
                            alert(err.message || 'Erro ao enviar avaliação');
                            publishBtn.disabled = false;
                            publishBtn.textContent = 'Publicar Avaliação';
                        }
                    });
                }
            }
        }
    } catch {}

    // Fazer proposta
    const fazerPropostaBtn = document.getElementById('fazer-proposta-btn');
    const propostaModal = document.getElementById('proposta-modal');
    const fecharPropostaModal = document.getElementById('fechar-proposta-modal');
    const fecharPropostaBtn = document.getElementById('fechar-proposta-btn');
    const enviarPropostaBtn = document.getElementById('enviar-proposta-btn');
    const propostaErro = document.getElementById('proposta-erro');
    const propostaNome = document.getElementById('proposta-produto-nome');

    // Mostrar botão apenas se for produto de outro usuário e disponível
    if (fazerPropostaBtn && produto.status === 'disponivel') {
        const me = await CondConnect.api('/me').catch(() => null);
        if (me && me.id !== produto.vendedor?.id) {
            // Verificar quantas propostas já foram enviadas para este produto
            const minhasPropostas = await CondConnect.api(`/propostas?tipo=enviadas&produto_id=${productId}`).catch(() => ({ propostas: [] }));
            const totalPropostas = minhasPropostas.propostas?.length || 0;
            const limite = 3;

            fazerPropostaBtn.style.display = 'inline-flex';

            if (totalPropostas >= limite) {
                fazerPropostaBtn.disabled = true;
                fazerPropostaBtn.style.opacity = '0.5';
                fazerPropostaBtn.style.cursor = 'not-allowed';
                fazerPropostaBtn.title = `Limite de ${limite} propostas por produto atingido`;
                fazerPropostaBtn.innerHTML = fazerPropostaBtn.innerHTML.replace('Fazer Proposta', `Fazer Proposta (${totalPropostas}/${limite})`);
            } else if (totalPropostas > 0) {
                fazerPropostaBtn.title = `Você já enviou ${totalPropostas} de ${limite} propostas para este produto`;
                fazerPropostaBtn.innerHTML = fazerPropostaBtn.innerHTML.replace('Fazer Proposta', `Fazer Proposta (${totalPropostas}/${limite})`);
            }
        }
    }

    if (fazerPropostaBtn) {
        fazerPropostaBtn.addEventListener('click', () => {
            if (propostaNome) propostaNome.textContent = `Produto: ${produto.titulo} — Preço anunciado: ${produto.preco_fmt}`;
            if (propostaModal) propostaModal.style.display = 'flex';
            document.getElementById('proposta-valor')?.focus();
        });
    }

    const fecharModal = () => {
        if (propostaModal) propostaModal.style.display = 'none';
        if (propostaErro) propostaErro.style.display = 'none';
        const v = document.getElementById('proposta-valor');
        const m = document.getElementById('proposta-mensagem');
        const q = document.getElementById('proposta-quantidade');
        if (v) v.value = '';
        if (m) m.value = '';
        if (q) q.value = '1';
    };

    if (fecharPropostaModal) fecharPropostaModal.addEventListener('click', fecharModal);
    if (fecharPropostaBtn) fecharPropostaBtn.addEventListener('click', fecharModal);
    if (propostaModal) propostaModal.addEventListener('click', e => { if (e.target === propostaModal) fecharModal(); });

    if (enviarPropostaBtn) {
        enviarPropostaBtn.addEventListener('click', async () => {
            const valorInput = document.getElementById('proposta-valor');
            const mensagemInput = document.getElementById('proposta-mensagem');
            const quantidadeInput = document.getElementById('proposta-quantidade');
            const valor = parseFloat(valorInput?.value);
            const mensagem = mensagemInput?.value.trim() || '';
            const quantidade = parseInt(quantidadeInput?.value) || 1;

            if (!valor || valor <= 0) {
                if (propostaErro) { propostaErro.textContent = 'Informe um valor válido.'; propostaErro.style.display = 'block'; }
                return;
            }
            if (quantidade < 1) {
                if (propostaErro) { propostaErro.textContent = 'A quantidade deve ser pelo menos 1.'; propostaErro.style.display = 'block'; }
                return;
            }

            const valorFmt = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            if (!confirm(`Tem certeza que deseja enviar uma proposta de ${valorFmt} × ${quantidade} unidade(s) para "${produto.titulo}"?`)) return;

            enviarPropostaBtn.disabled = true;
            enviarPropostaBtn.textContent = 'Enviando...';
            if (propostaErro) propostaErro.style.display = 'none';

            try {
                await CondConnect.api('/propostas', {
                    method: 'POST',
                    body: { produto_id: productId, valor_proposto: valor, mensagem, quantidade }
                });
                fecharModal();
                alert('Proposta enviada! O vendedor será notificado por e-mail.');
            } catch (err) {
                if (propostaErro) { propostaErro.textContent = err.message || 'Erro ao enviar proposta.'; propostaErro.style.display = 'block'; }
            } finally {
                enviarPropostaBtn.disabled = false;
                enviarPropostaBtn.textContent = 'Enviar Proposta';
            }
        });
    }
});
