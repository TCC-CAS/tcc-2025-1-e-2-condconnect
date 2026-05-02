document.addEventListener('DOMContentLoaded', async function () {
    const adForm = document.getElementById('ad-form');
    const pageTitle = document.querySelector('.page-title h1');
    const pageSubtitle = document.querySelector('.page-title p');
    const submitBtn = document.querySelector('.submit-btn');
    const photosGrid = document.getElementById('photos-grid');

    const MAX_PHOTOS = 5;
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');

    // photoUrls[0] = foto_principal, [1-4] = extras
    let photoUrls = ['', '', '', '', ''];

    function slotLabel(i) {
        return i === 0 ? 'Principal' : `Foto ${i + 1}`;
    }

    function renderGrid() {
        if (!photosGrid) return;
        photosGrid.innerHTML = '';

        for (let i = 0; i < MAX_PHOTOS; i++) {
            const url = photoUrls[i];
            const slot = document.createElement('div');
            slot.style.cssText = 'position:relative;width:110px;height:110px;border:2px dashed #e2e8f0;border-radius:12px;overflow:hidden;cursor:pointer;flex-shrink:0;background:#f8fafc;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;';
            if (i === 0 && !url) slot.style.borderColor = 'var(--primary)';

            if (url) {
                slot.style.borderStyle = 'solid';
                slot.style.borderColor = '#00a6a6';
                slot.innerHTML = `
                    <img src="${url}" style="width:100%;height:100%;object-fit:cover;display:block;">
                    <button type="button" data-remove="${i}" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.6);color:white;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;">×</button>
                    ${i === 0 ? '<span style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,166,166,0.85);color:white;font-size:10px;font-weight:700;text-align:center;padding:2px 0;">PRINCIPAL</span>' : ''}
                `;
                slot.querySelector('[data-remove]').addEventListener('click', (e) => {
                    e.stopPropagation();
                    photoUrls[i] = '';
                    renderGrid();
                });
            } else {
                slot.innerHTML = `
                    <svg width="22" height="22" fill="none" stroke="#94a3b8" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span style="font-size:10px;color:#94a3b8;font-weight:600;">${slotLabel(i)}</span>
                `;
                slot.addEventListener('click', () => triggerUpload(i));
            }

            photosGrid.appendChild(slot);
        }
    }

    async function triggerUpload(slotIndex) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/webp';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.addEventListener('change', async function () {
            const file = this.files[0];
            if (!file) { input.remove(); return; }

            // Show loading state
            const slots = photosGrid.querySelectorAll('div');
            const targetSlot = slots[slotIndex];
            if (targetSlot) targetSlot.style.opacity = '0.5';

            const formData = new FormData();
            formData.append('imagem', file);
            try {
                const result = await CondConnect.api('/uploads/imagem', { method: 'POST', body: formData });
                photoUrls[slotIndex] = result.url;
                renderGrid();
            } catch (err) {
                alert(err.message || 'Erro ao enviar imagem');
            } finally {
                input.remove();
            }
        });

        input.click();
    }

    // Modo edição
    if (editId) {
        if (pageTitle) pageTitle.textContent = 'Editar Anúncio';
        if (pageSubtitle) pageSubtitle.textContent = 'Atualize as informações do seu produto';
        if (submitBtn) submitBtn.textContent = 'Salvar Alterações';

        try {
            const produto = await CondConnect.api(`/produtos/item?id=${editId}`);
            document.getElementById('product-title').value = produto.titulo;
            document.getElementById('product-description').value = produto.descricao || '';
            document.getElementById('product-price').value = produto.preco;
            if (document.getElementById('product-quantity')) {
                document.getElementById('product-quantity').value = produto.quantidade ?? 1;
            }

            photoUrls[0] = produto.foto || '';
            (produto.imagens || []).forEach((url, i) => { if (i < 4) photoUrls[i + 1] = url; });

            const catSelect = document.getElementById('product-category');
            for (let i = 0; i < catSelect.options.length; i++) {
                if (catSelect.options[i].value === produto.categoria || catSelect.options[i].text === produto.categoria) {
                    catSelect.selectedIndex = i; break;
                }
            }
            const condSelect = document.getElementById('product-condition');
            for (let i = 0; i < condSelect.options.length; i++) {
                if (condSelect.options[i].value === produto.condicao || condSelect.options[i].text === produto.condicao) {
                    condSelect.selectedIndex = i; break;
                }
            }
        } catch (err) {
            console.error('Erro ao carregar produto para edição:', err);
        }
    }

    renderGrid();

    if (adForm) {
        adForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const titulo     = document.getElementById('product-title').value.trim();
            const descricao  = document.getElementById('product-description').value.trim();
            const preco      = parseFloat(document.getElementById('product-price').value.replace(',', '.'));
            const catSelect  = document.getElementById('product-category');
            const condSelect = document.getElementById('product-condition');
            const categoria  = catSelect.options[catSelect.selectedIndex].value || catSelect.options[catSelect.selectedIndex].text;
            const condicao   = condSelect.options[condSelect.selectedIndex].value || condSelect.options[condSelect.selectedIndex].text;
            const quantidade = Math.max(1, parseInt(document.getElementById('product-quantity')?.value || '1'));

            if (!titulo || isNaN(preco) || !categoria) {
                alert('Preencha título, preço e categoria');
                return;
            }

            const fotoUrl = photoUrls[0];
            const imagens_extras = photoUrls.slice(1).filter(u => u);

            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Salvando...'; }

            const body = { titulo, descricao, preco, categoria, condicao, quantidade, foto_principal: fotoUrl, imagens_extras };

            try {
                if (editId) {
                    await CondConnect.api(`/produtos/item?id=${editId}`, { method: 'PUT', body });
                } else {
                    await CondConnect.api('/produtos', { method: 'POST', body });
                }
                window.location.href = '/Templates/meus-produtos.html';
            } catch (err) {
                alert(err.message || 'Erro ao salvar produto');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = editId ? 'Salvar Alterações' : 'Publicar Anúncio'; }
            }
        });
    }
});
