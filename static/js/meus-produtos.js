document.addEventListener('DOMContentLoaded', async function () {
    const productsList = document.getElementById('my-products-list');

    const statusLabel = {
        disponivel: 'Disponível',
        vendido: 'Vendido',
        pendente: 'Pendente',
        rejeitado: 'Rejeitado',
    };

    async function renderMyProducts() {
        if (!productsList) return;
        productsList.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b">Carregando...</div>';

        try {
            const produtos = await CondConnect.api('/produtos?meus=1');

            if (produtos.length === 0) {
                productsList.innerHTML = `
                    <div class="empty-state" style="text-align: center; padding: 60px; color: #64748b;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px; opacity: 0.5;">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        </svg>
                        <p style="font-size: 16px; font-weight: 500;">Você ainda não anunciou nenhum produto.</p>
                        <a href="/Templates/novo-anuncio.html" style="display:inline-block;margin-top:16px;padding:10px 20px;background:var(--primary);color:white;border-radius:8px;text-decoration:none;font-weight:600;">Criar Primeiro Anúncio</a>
                    </div>`;
                return;
            }

            productsList.innerHTML = produtos.map(produto => {
                const label = statusLabel[produto.status] || produto.status;
                const dataFmt = new Date(produto.criado_em).toLocaleDateString('pt-BR');
                return `
                    <div class="product-item" data-id="${produto.id}">
                        ${produto.foto
                            ? `<img src="${produto.foto}" alt="${produto.titulo}" class="product-thumb" style="width:70px;height:70px;object-fit:cover;border-radius:8px;">`
                            : `<div style="width:70px;height:70px;border-radius:8px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`
                        }
                        <div class="product-details">
                            <h3 class="product-title">${produto.titulo}</h3>
                            <span class="product-status tag-${produto.status}">${label}</span>
                            <div class="product-price">${produto.preco_fmt}</div>
                            <span class="product-date">Criado em ${dataFmt}</span>
                        </div>
                        <div class="product-actions">
                            <button class="actions-btn" title="Opções" data-id="${produto.id}">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle>
                                </svg>
                            </button>
                            <div class="actions-dropdown">
                                <a href="/Templates/detalhes-produto.html?id=${produto.id}" class="dropdown-item">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    Visualizar
                                </a>
                                <button class="dropdown-item edit-btn" data-id="${produto.id}">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    Editar
                                </button>
                                <hr>
                                <button class="dropdown-item delete-btn danger" data-id="${produto.id}">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Dropdown toggles
            document.querySelectorAll('.actions-btn').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    document.querySelectorAll('.actions-dropdown').forEach(d => {
                        if (d !== btn.nextElementSibling) d.classList.remove('show');
                    });
                    btn.nextElementSibling?.classList.toggle('show');
                });
            });

            document.addEventListener('click', () => {
                document.querySelectorAll('.actions-dropdown').forEach(d => d.classList.remove('show'));
            });

            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    if (!confirm('Tem certeza que deseja excluir este anúncio?')) return;
                    try {
                        await CondConnect.api(`/produtos/item?id=${id}`, { method: 'DELETE' });
                        renderMyProducts();
                    } catch (err) {
                        alert(err.message || 'Erro ao excluir produto');
                    }
                });
            });

            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    window.location.href = `/Templates/novo-anuncio.html?edit=${btn.getAttribute('data-id')}`;
                });
            });

        } catch (err) {
            productsList.innerHTML = '<div style="text-align:center;padding:40px;color:#dc2626">Erro ao carregar seus produtos.</div>';
        }
    }

    renderMyProducts();
});
