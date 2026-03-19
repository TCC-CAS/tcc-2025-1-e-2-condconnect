// Settings Logic

document.addEventListener('DOMContentLoaded', () => {
    // 1. Save Button Logic
    const btnSave = document.getElementById('save-settings-btn');
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            const originalText = btnSave.innerHTML;
            btnSave.disabled = true;
            btnSave.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 2a10 10 0 0 1 10 10"></path>
                </svg>
                Salvando...
            `;

            setTimeout(() => {
                btnSave.classList.add('success');
                btnSave.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Adicionado!
                `;

                setTimeout(() => {
                    btnSave.classList.remove('success');
                    btnSave.disabled = false;
                    btnSave.innerHTML = originalText;
                }, 3000);
            }, 1000);
        });
    }

    // 2. Toggle Switches Interaction
    const toggles = document.querySelectorAll('.toggle-switch input');
    toggles.forEach(toggle => {
        toggle.addEventListener('change', () => {
            // Real-time feedback could go here
            console.log(`Configuração alterada: ${toggle.checked}`);
        });
    });

    // 3. Modal Logic
    const modals = {
        password: document.getElementById('password-modal'),
        delete: document.getElementById('delete-modal')
    };

    const triggers = {
        password: document.getElementById('btn-change-password'),
        delete: document.querySelector('.btn-delete-account')
    };

    // Open Modals
    if (triggers.password) {
        triggers.password.addEventListener('click', (e) => {
            e.preventDefault();
            modals.password.classList.add('active');
        });
    }

    if (triggers.delete) {
        triggers.delete.addEventListener('click', (e) => {
            e.preventDefault();
            modals.delete.classList.add('active');
        });
    }

    // Close Modals
    document.querySelectorAll('.close-modal, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            Object.values(modals).forEach(modal => modal.classList.remove('active'));
        });
    });

    // Form Submissions in Modals
    document.querySelectorAll('.settings-form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.textContent;

            btn.disabled = true;
            btn.textContent = 'Processando...';

            setTimeout(() => {
                btn.textContent = '✓ Concluído';
                setTimeout(() => {
                    Object.values(modals).forEach(modal => modal.classList.remove('active'));
                    btn.disabled = false;
                    btn.textContent = originalText;
                }, 1000);
            }, 1000);
        });
    });

    // Close on backdrop click
    window.addEventListener('click', (e) => {
        Object.values(modals).forEach(modal => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });
});

// Add spinner style
if (!document.getElementById('spinner-style')) {
    const style = document.createElement('style');
    style.id = 'spinner-style';
    style.textContent = `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spinner { animation: spin 1s linear infinite; }
    `;
    document.head.appendChild(style);
}
