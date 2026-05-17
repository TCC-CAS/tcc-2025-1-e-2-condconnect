document.addEventListener('DOMContentLoaded', async function () {
    const adForm = document.getElementById('ad-form');
    const pageTitle = document.querySelector('.page-title h1');
    const pageSubtitle = document.querySelector('.page-title p');
    const submitBtn = document.querySelector('.submit-btn');
    const photosGrid = document.getElementById('photos-grid');

    const MAX_PHOTOS = 5;
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    const reativar = urlParams.get('reativar') === '1';

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
                await CondConnect.showAlert(err.message || 'Erro ao enviar imagem', 'error');
            } finally {
                input.remove();
            }
        });

        input.click();
    }

    // Modo edição
    if (editId) {
        if (reativar) {
            if (pageTitle) pageTitle.textContent = 'Reativar Produto';
            if (pageSubtitle) pageSubtitle.textContent = 'Atualize a quantidade para tornar o produto disponível novamente';
        } else {
            if (pageTitle) pageTitle.textContent = 'Editar Anúncio';
            if (pageSubtitle) pageSubtitle.textContent = 'Atualize as informações do seu produto';
        }
        if (submitBtn) submitBtn.textContent = 'Salvar Alterações';

        try {
            const produto = await CondConnect.api(`/produtos/item?id=${editId}`);
            const tituloEl = document.getElementById('product-title');
            tituloEl.value = produto.titulo;
            const titleCounter = document.getElementById('title-counter');
            if (titleCounter) titleCounter.textContent = tituloEl.value.length + '/60';
            const descEl = document.getElementById('product-description');
            descEl.value = produto.descricao || '';
            const counter = document.getElementById('desc-counter');
            if (counter) counter.textContent = descEl.value.length + '/300';
            document.getElementById('product-price').value = floatParaPreco(produto.preco);
            if (produto.insumos && produto.insumos.length > 0) {
                produto.insumos.forEach(ins => addInsumoRow(ins));
            } else if (produto.custo && document.getElementById('product-cost')) {
                document.getElementById('product-cost').value = floatParaPreco(produto.custo);
            }
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
            if (reativar) {
                const qtyEl = document.getElementById('product-quantity');
                if (qtyEl) {
                    setTimeout(() => {
                        const banner = document.createElement('div');
                        banner.id = 'reativar-banner';
                        banner.style.cssText = 'background:#f0fdf4;border:2px solid #86efac;border-radius:10px;padding:12px 16px;margin-bottom:12px;color:#15803d;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;';
                        banner.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Atualize a quantidade abaixo para reativar seu produto';
                        qtyEl.parentNode.insertBefore(banner, qtyEl);
                        qtyEl.style.border = '2px solid #22c55e';
                        qtyEl.style.background = '#f0fdf4';
                        qtyEl.focus();
                        qtyEl.select();
                        qtyEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                }
            }
        } catch (err) {
            console.error('Erro ao carregar produto para edição:', err);
        }
    }

    // Máscara de moeda BRL
    function aplicarMascaraBRL(input) {
        const nums = input.value.replace(/\D/g, '');
        if (!nums) { input.value = ''; return; }
        const centavos = parseInt(nums, 10);
        input.value = (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function bindMoeda(el) {
        if (!el) return;
        el.addEventListener('input', function () { aplicarMascaraBRL(this); });
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Backspace') {
                const nums = this.value.replace(/\D/g, '').slice(0, -1);
                if (!nums) { this.value = ''; e.preventDefault(); return; }
                const centavos = parseInt(nums, 10);
                this.value = (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                e.preventDefault();
            }
        });
    }
    bindMoeda(document.getElementById('product-price'));
    bindMoeda(document.getElementById('product-cost'));

    function precoParaFloat(val) {
        return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
    }

    function floatParaPreco(val) {
        return parseFloat(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    renderGrid();

    // ── Insumos ──────────────────────────────────────────────────────────────
    const insumosList = document.getElementById('insumos-list');
    const addInsumoBtn = document.getElementById('add-insumo-btn');
    const custoTotalDiv = document.getElementById('custo-total-insumos');
    const custoTotalValor = document.getElementById('custo-total-valor');
    const costInput = document.getElementById('product-cost');
    const UNIDADES = ['un', 'g', 'kg', 'ml', 'L', 'm', 'm²', 'cm', 'par', 'rolo', 'pacote'];

    function calcularTotalInsumos() {
        if (!insumosList) return;
        const rows = insumosList.querySelectorAll('.insumo-row');
        let total = 0;
        rows.forEach(row => {
            const custo = parseFloat(row.querySelector('.ins-custo')?.value.replace(/\./g, '').replace(',', '.')) || 0;
            total += custo;
        });
        if (rows.length > 0) {
            if (custoTotalDiv) custoTotalDiv.style.display = 'flex';
            if (custoTotalValor) custoTotalValor.textContent = 'R$ ' + total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            if (costInput) {
                costInput.value = total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                costInput.readOnly = true;
                costInput.style.background = '#f1f5f9';
                costInput.style.color = '#64748b';
            }
        } else {
            if (custoTotalDiv) custoTotalDiv.style.display = 'none';
            if (costInput) {
                costInput.readOnly = false;
                costInput.style.background = 'white';
                costInput.style.color = '';
            }
        }
    }

    function addInsumoRow(data = {}) {
        if (!insumosList) return;
        const row = document.createElement('div');
        row.className = 'insumo-row';
        row.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 80px 1fr 32px;gap:8px;align-items:center;background:white;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;';

        const selectOpts = UNIDADES.map(u => `<option value="${u}" ${u === (data.unidade || 'un') ? 'selected' : ''}>${u}</option>`).join('');
        const custoVal = data.custo ? data.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

        row.innerHTML = `
            <input type="text" class="ins-nome form-input" placeholder="Ex: Leite Moça" value="${data.nome || ''}" style="font-size:13px;padding:8px 10px;">
            <input type="number" class="ins-qtd form-input" placeholder="Qtd" value="${data.quantidade || ''}" min="0" step="any" style="font-size:13px;padding:8px 10px;">
            <select class="ins-unid form-input" style="font-size:13px;padding:8px 6px;">${selectOpts}</select>
            <input type="text" class="ins-custo form-input" placeholder="R$ custo" value="${custoVal}" inputmode="numeric" style="font-size:13px;padding:8px 10px;">
            <button type="button" class="ins-remove" style="background:none;border:none;color:#ef4444;font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>
        `;

        bindMoeda(row.querySelector('.ins-custo'));
        row.querySelector('.ins-custo').addEventListener('input', calcularTotalInsumos);
        row.querySelector('.ins-remove').addEventListener('click', () => {
            row.remove();
            calcularTotalInsumos();
        });

        insumosList.appendChild(row);
        calcularTotalInsumos();
    }

    if (addInsumoBtn) addInsumoBtn.addEventListener('click', () => addInsumoRow());

    function getInsumos() {
        if (!insumosList) return [];
        return Array.from(insumosList.querySelectorAll('.insumo-row')).map(row => ({
            nome: row.querySelector('.ins-nome')?.value.trim() || '',
            quantidade: parseFloat(row.querySelector('.ins-qtd')?.value) || 1,
            unidade: row.querySelector('.ins-unid')?.value || 'un',
            custo: parseFloat(row.querySelector('.ins-custo')?.value.replace(/\./g, '').replace(',', '.')) || 0,
        })).filter(r => r.nome);
    }

    if (adForm) {
        adForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const titulo     = document.getElementById('product-title').value.trim();
            const descricao  = document.getElementById('product-description').value.trim();
            const preco      = precoParaFloat(document.getElementById('product-price').value);
            const custoRaw   = document.getElementById('product-cost')?.value;
            const custo      = custoRaw ? precoParaFloat(custoRaw) : null;
            const catSelect  = document.getElementById('product-category');
            const condSelect = document.getElementById('product-condition');
            const categoria  = catSelect.options[catSelect.selectedIndex].value || catSelect.options[catSelect.selectedIndex].text;
            const condicao   = condSelect.options[condSelect.selectedIndex].value || condSelect.options[condSelect.selectedIndex].text;
            const quantidade = Math.max(1, parseInt(document.getElementById('product-quantity')?.value || '1'));

            if (!titulo || isNaN(preco) || !categoria) {
                await CondConnect.showAlert('Preencha título, preço e categoria', 'warning');
                return;
            }

            const fotoUrl = photoUrls[0];
            const imagens_extras = photoUrls.slice(1).filter(u => u);

            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Salvando...'; }

            const insumos = getInsumos();
            const body = { titulo, descricao, preco, custo, insumos, categoria, condicao, quantidade, foto_principal: fotoUrl, imagens_extras };

            try {
                if (editId) {
                    await CondConnect.api(`/produtos/item?id=${editId}`, { method: 'PUT', body });
                } else {
                    await CondConnect.api('/produtos', { method: 'POST', body });
                }
                window.location.href = '/Templates/meus-produtos.html';
            } catch (err) {
                await CondConnect.showAlert(err.message || 'Erro ao salvar produto', 'error');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = editId ? 'Salvar Alterações' : 'Publicar Anúncio'; }
            }
        });
    }
});
