document.addEventListener('DOMContentLoaded', async function () {
    / Carregar configurações
    async function carregarConfig() {
        try {
            const cfg = await CondConnect.api('/configuracoes/index');

            const toggles = {
                'toggle-email':     cfg.notif_email,
                'toggle-sms':       cfg.notif_sms,
                'toggle-marketing': cfg.notif_marketing,
            };

            Object.entries(toggles).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el) el.checked = !!val;
            });

            const temaSelect = document.getElementById('tema-select');
            if (temaSelect) temaSelect.value = cfg.tema || 'light';

        } catch {}
    }

    / Salvar configurações
    const btnSave = document.getElementById('save-settings-btn');
    if (btnSave) {
        btnSave.addEventListener('click', async () => {
            const originalText = btnSave.innerHTML;
            btnSave.disabled = true;
            btnSave.innerHTML = `<svg width="16" height="16" class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg> Salvando...`;

            const body = {};
            const email = document.getElementById('toggle-email');
            const sms   = document.getElementById('toggle-sms');
            const mkt   = document.getElementById('toggle-marketing');
            const tema  = document.getElementById('tema-select');

            if (email)  body.notif_email      = email.checked ? 1 : 0;
            if (sms)    body.notif_sms         = sms.checked ? 1 : 0;
            if (mkt)    body.notif_marketing   = mkt.checked ? 1 : 0;
            if (tema)   body.tema              = tema.value;

            try {
                await CondConnect.api('/configuracoes/index', { method: 'PUT', body });
                btnSave.classList.add('success');
                btnSave.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Salvo!`;
                setTimeout(() => {
                    btnSave.classList.remove('success');
                    btnSave.disabled = false;
                    btnSave.innerHTML = originalText;
                }, 3000);
            } catch (err) {
                alert(err.message || 'Erro ao salvar configurações');
                btnSave.disabled = false;
                btnSave.innerHTML = originalText;
            }
        });
    }

    / Modal de alterar senha
    const modals = {
        password: document.getElementById('password-modal'),
        delete: document.getElementById('delete-modal'),
    };

    const triggers = {
        password: document.getElementById('btn-change-password'),
        delete: document.querySelector('.btn-delete-account'),
    };

    if (triggers.password) {
        triggers.password.addEventListener('click', e => {
            e.preventDefault();
            modals.password?.classList.add('active');
        });
    }

    if (triggers.delete) {
        triggers.delete.addEventListener('click', e => {
            e.preventDefault();
            modals.delete?.classList.add('active');
        });
    }

    document.querySelectorAll('.close-modal, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            Object.values(modals).forEach(m => m?.classList.remove('active'));
        });
    });

    / Alterar senha
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async e => {
            e.preventDefault();
            const atual = document.getElementById('current-password')?.value;
            const nova  = document.getElementById('new-password')?.value;
            const conf  = document.getElementById('confirm-password')?.value;

            if (nova !== conf) { alert('As senhas não coincidem'); return; }

            const btn = passwordForm.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Processando...';

            try {
                await CondConnect.api('/me', { method: 'PUT', body: { senha_atual: atual, nova_senha: nova } });
                btn.textContent = '✓ Senha alterada!';
                setTimeout(() => { modals.password?.classList.remove('active'); btn.disabled = false; btn.textContent = 'Salvar'; }, 2000);
            } catch (err) {
                alert(err.message || 'Erro ao alterar senha');
                btn.disabled = false;
                btn.textContent = 'Salvar';
            }
        });
    }

    / Excluir conta
    const deleteForm = document.getElementById('delete-form');
    if (deleteForm) {
        deleteForm.addEventListener('submit', async e => {
            e.preventDefault();
            if (!confirm('Tem certeza? Esta ação é irreversível.')) return;
            try {
                await CondConnect.api('/auth/logout', { method: 'POST' });
                CondConnect.clearUser();
                window.location.href = '/Templates/index.html';
            } catch {}
        });
    }

    window.addEventListener('click', e => {
        Object.values(modals).forEach(m => { if (e.target === m) m?.classList.remove('active'); });
    });

    carregarConfig();
});

if (!document.getElementById('spinner-style')) {
    const style = document.createElement('style');
    style.id = 'spinner-style';
    style.textContent = `@keyframes spin { 100% { transform: rotate(360deg); } } .spinner { animation: spin 1s linear infinite; }`;
    document.head.appendChild(style);
}
