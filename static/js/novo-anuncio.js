document.addEventListener('DOMContentLoaded', async function () {
    const adForm = document.getElementById('ad-form');
    const pageTitle = document.querySelector('.page-title h1');
    const pageSubtitle = document.querySelector('.page-title p');
    const submitBtn = document.querySelector('.submit-btn');
    const uploadArea = document.querySelector('.upload-area');
    const fileInput = document.getElementById('product-image');

    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    let fotoUrl = '';

    / Modo edição
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
            fotoUrl = produto.foto || '';

            / Selecionar categoria
            const catSelect = document.getElementById('product-category');
            for (let i = 0; i < catSelect.options.length; i++) {
                if (catSelect.options[i].value === produto.categoria || catSelect.options[i].text === produto.categoria) {
                    catSelect.selectedIndex = i;
                    break;
                }
            }

            / Selecionar condição
            const condSelect = document.getElementById('product-condition');
            for (let i = 0; i < condSelect.options.length; i++) {
                if (condSelect.options[i].value === produto.condicao || condSelect.options[i].text === produto.condicao) {
                    condSelect.selectedIndex = i;
                    break;
                }
            }

            / Preview da imagem existente
            if (produto.foto && uploadArea) {
                uploadArea.innerHTML = `<img src="${produto.foto}" style="max-height:200px;border-radius:8px;object-fit:cover;">`;
            }
        } catch (err) {
            console.error('Erro ao carregar produto para edição:', err);
        }
    }

    / Upload de imagem
    if (fileInput) {
        fileInput.addEventListener('change', async function () {
            const file = this.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('imagem', file);

            if (uploadArea) uploadArea.innerHTML = '<p style="color:#64748b">Enviando imagem...</p>';

            try {
                const result = await CondConnect.api('/uploads/imagem', {
                    method: 'POST',
                    body: formData,
                });
                fotoUrl = result.url;
                if (uploadArea) uploadArea.innerHTML = `<img src="${fotoUrl}" style="width:100%;height:200px;border-radius:8px;object-fit:cover;">`;
            } catch (err) {
                if (uploadArea) uploadArea.innerHTML = '<p style="color:#dc2626">Erro ao enviar imagem</p>';
            }
        });
    }

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

            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Salvando...'; }

            const body = { titulo, descricao, preco, categoria, condicao, quantidade, foto_principal: fotoUrl };

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
