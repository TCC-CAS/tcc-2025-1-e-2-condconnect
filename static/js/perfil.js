document.addEventListener('DOMContentLoaded', async function () {
    const profileForm = document.getElementById('profile-form');

    // Carregar dados do usuário logado
    async function carregarPerfil() {
        try {
            const user = await CondConnect.getMe();
            if (!user) return;

            const campos = {
                'profile-name':  user.nome,
                'profile-email': user.email,
                'profile-phone': user.telefone || '',
                'profile-apto':  user.apartamento || '',
                'profile-bloco': user.bloco || '',
                'profile-bio':   user.bio || '',
            };

            Object.entries(campos).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el) el.value = val;
            });

            // Header info
            const headerName = document.querySelector('.profile-name, .user-display-name');
            if (headerName) headerName.textContent = user.nome;

            const headerEmail = document.querySelector('.profile-email');
            if (headerEmail) headerEmail.textContent = user.email;

            const locationEl = document.querySelector('.profile-location');
            if (locationEl) locationEl.textContent = `Bloco ${user.bloco} - Apto ${user.apartamento}`;

            // Foto
            const fotoEl = document.querySelector('.profile-avatar img, .avatar-img');
            if (fotoEl && user.foto_url) fotoEl.src = user.foto_url;

            // Stats
            const statsMap = {
                'stat-produtos':  user.total_produtos,
                'stat-vendas':    user.total_vendas,
                'stat-compras':   user.total_compras,
                'stat-rating':    user.rating?.toFixed(1),
            };
            Object.entries(statsMap).forEach(([id, val]) => {
                const el = document.getElementById(id);
                if (el && val !== undefined) el.textContent = val;
            });

        } catch (err) {
            console.error('Erro ao carregar perfil:', err);
        }
    }

    if (profileForm) {
        profileForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const btnSave = profileForm.querySelector('.btn-save');
            const originalText = btnSave?.innerHTML;

            if (btnSave) {
                btnSave.disabled = true;
                btnSave.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinner"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg> Salvando...`;
            }

            const body = {};
            ['profile-name', 'profile-phone', 'profile-apto', 'profile-bloco', 'profile-bio'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    const campo = id.replace('profile-', '');
                    const mapa = { name: 'nome', phone: 'telefone', apto: 'apartamento', bloco: 'bloco', bio: 'bio' };
                    body[mapa[campo] || campo] = el.value.trim();
                }
            });

            // Senha
            const senhaAtual = document.getElementById('current-password')?.value;
            const novaSenha  = document.getElementById('new-password')?.value;
            if (senhaAtual && novaSenha) {
                body.senha_atual = senhaAtual;
                body.nova_senha  = novaSenha;
            }

            try {
                await CondConnect.api('/me.php', { method: 'PUT', body });
                // Atualizar cache
                CondConnect.currentUser = null;
                localStorage.removeItem('condconnect_user');
                await CondConnect.getMe();

                if (btnSave) {
                    btnSave.classList.add('success');
                    btnSave.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Salvo!`;
                    setTimeout(() => {
                        btnSave.classList.remove('success');
                        btnSave.disabled = false;
                        btnSave.innerHTML = originalText;
                    }, 3000);
                }
            } catch (err) {
                alert(err.message || 'Erro ao salvar perfil');
                if (btnSave) { btnSave.disabled = false; btnSave.innerHTML = originalText; }
            }
        });
    }

    carregarPerfil();
});

// Spinner style
const style = document.createElement('style');
style.textContent = `@keyframes spin { 100% { transform: rotate(360deg); } } .spinner { animation: spin 1s linear infinite; }`;
document.head.appendChild(style);
