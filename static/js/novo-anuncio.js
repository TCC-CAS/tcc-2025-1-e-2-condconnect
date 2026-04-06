document.addEventListener('DOMContentLoaded', function () {
    const adForm = document.getElementById('ad-form');
    const pageTitle = document.querySelector('.page-title h1');
    const pageSubtitle = document.querySelector('.page-title p');
    const submitBtn = document.querySelector('.submit-btn');

    // Check for edit mode
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    let editingProduct = null;

    if (editId) {
        const userProducts = JSON.parse(localStorage.getItem('condconnect_user_products')) || [];
        editingProduct = userProducts.find(p => p.id === editId);

        if (editingProduct) {
            // Update UI for Edit Mode
            if (pageTitle) pageTitle.textContent = 'Editar Anúncio';
            if (pageSubtitle) pageSubtitle.textContent = 'Atualize as informações do seu produto';
            if (submitBtn) submitBtn.textContent = 'Salvar Alterações';

            // Fill form
            document.getElementById('product-title').value = editingProduct.title;
            document.getElementById('product-description').value = editingProduct.description;
            document.getElementById('product-price').value = editingProduct.price.replace('R$ ', '');

            // Set Category
            const categorySelect = document.getElementById('product-category');
            for (let i = 0; i < categorySelect.options.length; i++) {
                if (categorySelect.options[i].text === editingProduct.category) {
                    categorySelect.selectedIndex = i;
                    break;
                }
            }

            // Set Condition
            const conditionSelect = document.getElementById('product-condition');
            for (let i = 0; i < conditionSelect.options.length; i++) {
                if (conditionSelect.options[i].text === editingProduct.condition) {
                    conditionSelect.selectedIndex = i;
                    break;
                }
            }
        }
    }

    if (adForm) {
        adForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Extract data
            const productTitle = document.getElementById('product-title').value;
            const productDescription = document.getElementById('product-description').value;
            let productPrice = document.getElementById('product-price').value;
            if (!productPrice.startsWith('R$')) productPrice = 'R$ ' + productPrice;

            const productCategory = document.getElementById('product-category').options[document.getElementById('product-category').selectedIndex].text;
            const productCondition = document.getElementById('product-condition').options[document.getElementById('product-condition').selectedIndex].text;

            const userProducts = JSON.parse(localStorage.getItem('condconnect_user_products')) || [];

            if (editingProduct) {
                // Update existing
                const index = userProducts.findIndex(p => p.id === editId);
                if (index !== -1) {
                    userProducts[index] = {
                        ...userProducts[index],
                        title: productTitle,
                        description: productDescription,
                        price: productPrice,
                        category: productCategory,
                        condition: productCondition
                    };
                }
            } else {
                // Create new
                const productId = 'user_' + Date.now();
                const newProduct = {
                    id: productId,
                    title: productTitle,
                    description: productDescription,
                    price: productPrice,
                    category: productCategory,
                    condition: productCondition,
                    date: new Date().toLocaleDateString('pt-BR'),
                    status: 'Disponível',
                    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=500&auto=format&fit=crop'
                };
                userProducts.push(newProduct);
            }

            localStorage.setItem('condconnect_user_products', JSON.stringify(userProducts));

            // Trigger storage event for other pages
            window.dispatchEvent(new Event('storage'));

            // Redirect to "Meus Produtos"
            window.location.href = '/Templates/meus-produtos.html';
        });
    }
});
