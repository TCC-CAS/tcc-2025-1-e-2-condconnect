document.addEventListener('DOMContentLoaded', function () {
    const adminProductList = document.getElementById('admin-product-list');

    function renderAdminProducts() {
        const products = CondConnect.getProducts();

        if (products.length === 0) {
            adminProductList.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">Nenhum anúncio encontrado.</p>';
            return;
        }

        adminProductList.innerHTML = products.map(product => `
            <div class="admin-product-item" style="display: flex; align-items: center; justify-content: space-between; padding: 16px; border: 1px solid #f1f5f9; border-radius: 12px; gap: 16px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <img src="${product.image}" alt="${product.title}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: crop;">
                    <div>
                        <h4 style="margin: 0; font-size: 14px; color: #1e293b;">${product.title}</h4>
                        <span style="font-size: 12px; color: #64748b;">Vendedor: ${product.seller} | ${product.location}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-remove" data-id="${product.id}" style="padding: 8px 16px; background: #fee2e2; color: #ef4444; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Remover</button>
                    <button style="padding: 8px 16px; background: #f1f5f9; color: #64748b; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: default;">Validar</button>
                </div>
            </div>
        `).join('');

        // Remove functionality
        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = this.getAttribute('data-id');
                if (confirm('Tem certeza que deseja remover este anúncio?')) {
                    // Logic to simulate removal
                    this.closest('.admin-product-item').style.opacity = '0.5';
                    this.closest('.admin-product-item').style.pointerEvents = 'none';
                    this.textContent = 'Removido';
                    this.style.background = '#f1f5f9';
                    this.style.color = '#94a3b8';
                }
            });
        });
    }

    renderAdminProducts();
});
