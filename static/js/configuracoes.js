document.addEventListener('DOMContentLoaded', async function () {

    async function carregarConfig() {
        try {
            const cfg = await CondConnect.api('/configuracoes');
            const toggles = {
                'toggle-notif-email':          cfg.notif_email,
                'toggle-notif-sms':            cfg.notif_sms,
                'toggle-notif-marketing':      cfg.notif_marketing,
                'toggle-privacidade-endereco': cfg.privacidade_endereco,
            };
            Object.entries(toggles).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el) el.checked = !!val;
            });
        } catch {}
    }

    // Salvar configurações
    const btnSave = document.getElementById('save-settings-btn');
    if (btnSave) {
        btnSave.addEventListener('click', async () => {
            const originalText = btnSave.innerHTML;
            btnSave.disabled = true;
            btnSave.innerHTML = `<svg width="16" height="16" class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg> Salvando...`;

            const g = id => document.getElementById(id);
            const body = {};
            if (g('toggle-notif-email'))          body.notif_email          = g('toggle-notif-email').checked ? 1 : 0;
            if (g('toggle-notif-sms'))             body.notif_sms            = g('toggle-notif-sms').checked ? 1 : 0;
            if (g('toggle-notif-marketing'))       body.notif_marketing      = g('toggle-notif-marketing').checked ? 1 : 0;
            if (g('toggle-privacidade-endereco'))  body.privacidade_endereco = g('toggle-privacidade-endereco').checked ? 1 : 0;

            try {
                await CondConnect.api('/configuracoes', { method: 'PUT', body });
                btnSave.classList.add('success');
                btnSave.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Salvo!`;
                setTimeout(() => {
                    btnSave.classList.remove('success');
                    btnSave.disabled = false;
                    btnSave.innerHTML = originalText;
                }, 3000);
            } catch (err) {
                await CondConnect.showAlert(err.message || 'Erro ao salvar configurações', 'error');
                btnSave.disabled = false;
                btnSave.innerHTML = originalText;
            }
        });
    }

    // Modais
    const modals = {
        password: document.getElementById('password-modal'),
        delete:   document.getElementById('delete-modal'),
    };

    const btnChangePassword = document.getElementById('btn-change-password');
    if (btnChangePassword) {
        btnChangePassword.addEventListener('click', e => {
            e.preventDefault();
            modals.password?.classList.add('active');
        });
    }

    const btnDeleteAccount = document.querySelector('.btn-delete-account');
    if (btnDeleteAccount) {
        btnDeleteAccount.addEventListener('click', e => {
            e.preventDefault();
            modals.delete?.classList.add('active');
        });
    }

    document.querySelectorAll('.close-modal, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            Object.values(modals).forEach(m => m?.classList.remove('active'));
        });
    });

    window.addEventListener('click', e => {
        Object.values(modals).forEach(m => { if (e.target === m) m?.classList.remove('active'); });
    });

    // Alterar senha
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async e => {
            e.preventDefault();
            const atual = document.getElementById('current-password')?.value;
            const nova  = document.getElementById('new-password')?.value;
            const conf  = document.getElementById('confirm-password')?.value;

            if (!nova || nova.length < 6) {
                await CondConnect.showAlert('A nova senha deve ter pelo menos 6 caracteres.', 'warning');
                return;
            }
            if (nova !== conf) {
                await CondConnect.showAlert('As senhas não coincidem.', 'warning');
                return;
            }

            const btn = passwordForm.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Processando...';

            try {
                await CondConnect.api('/me', { method: 'PUT', body: { senha_atual: atual, nova_senha: nova } });
                modals.password?.classList.remove('active');
                passwordForm.reset();
                await CondConnect.showAlert('Senha alterada com sucesso!', 'success');
            } catch (err) {
                await CondConnect.showAlert(err.message || 'Erro ao alterar senha', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Atualizar Senha';
            }
        });
    }

    // Confirmar exclusão de conta
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');
    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', async () => {
            modals.delete?.classList.remove('active');
            const confirmado = await CondConnect.showConfirm(
                'Todos os seus dados, anúncios e histórico serão removidos permanentemente. Esta ação não pode ser desfeita.',
                'Excluir Conta Definitivamente'
            );
            if (!confirmado) return;

            btnConfirmDelete.disabled = true;
            try {
                await CondConnect.api('/me', { method: 'DELETE' });
                CondConnect.clearUser();
                await CondConnect.showAlert('Sua conta foi excluída. Até logo!', 'info');
                window.location.href = '/Templates/index.html';
            } catch (err) {
                await CondConnect.showAlert(err.message || 'Erro ao excluir conta', 'error');
                btnConfirmDelete.disabled = false;
            }
        });
    }

    // Sair de outros dispositivos
    const btnLogoutDevices = document.getElementById('btn-logout-devices');
    if (btnLogoutDevices) {
        btnLogoutDevices.addEventListener('click', async e => {
            e.preventDefault();
            if (!await CondConnect.showConfirm('Você será desconectado de todos os outros dispositivos.', 'Sair de outros dispositivos')) return;
            try {
                await CondConnect.api('/auth/logout', { method: 'POST' });
                CondConnect.clearUser();
                await CondConnect.showAlert('Sessão encerrada em todos os dispositivos. Faça login novamente.', 'success');
                window.location.href = '/Templates/login.html';
            } catch (err) {
                await CondConnect.showAlert(err.message || 'Erro ao encerrar sessões', 'error');
            }
        });
    }

    // Auto-salvar toggle de privacidade
    const togglePriv = document.getElementById('toggle-privacidade-endereco');
    if (togglePriv) {
        togglePriv.addEventListener('change', async function () {
            try {
                await CondConnect.api('/configuracoes', { method: 'PUT', body: { privacidade_endereco: this.checked ? 1 : 0 } });
            } catch (err) {
                await CondConnect.showAlert('Erro ao salvar privacidade. Tente novamente.', 'error');
                this.checked = !this.checked;
            }
        });
    }

    carregarConfig();
});

if (!document.getElementById('spinner-style')) {
    const style = document.createElement('style');
    style.id = 'spinner-style';
    style.textContent = `@keyframes spin { 100% { transform: rotate(360deg); } } .spinner { animation: spin 1s linear infinite; }`;
    document.head.appendChild(style);
}
