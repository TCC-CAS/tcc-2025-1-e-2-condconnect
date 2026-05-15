document.addEventListener('DOMContentLoaded', async function () {
    const profileForm = document.getElementById('profile-form');

    function setAvatarPreview(url, nome) {
        const el = document.getElementById('avatar-preview');
        if (!el) return;
        if (url) {
            el.style.overflow = 'hidden';
            el.style.padding = '0';
            el.style.fontSize = '';
            el.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;display:block;">`;
        } else if (nome) {
            const partes = nome.trim().split(' ');
            const iniciais = (partes[0][0] + (partes[1]?.[0] || '')).toUpperCase();
            el.textContent = iniciais;
        }
    }

    function setHeaderAvatar(url, nome) {
        document.querySelectorAll('.header-avatar').forEach(el => {
            el.src = url || `https://ui-avatars.com/api/?name=${encodeURIComponent(nome || '')}&background=00A6A6&color=fff`;
        });
    }

    // Carregar dados do usuário logado (sempre busca da API para ter foto_url atualizada)
    async function carregarPerfil() {
        try {
            const user = await CondConnect.api('/me').catch(() => CondConnect.getMe());
            if (!user) return;
            CondConnect.currentUser = user;
            localStorage.setItem('condconnect_user', JSON.stringify(user));

            const campos = {
                'profile-name':  user.nome,
                'profile-email': user.email,
                'profile-phone': user.telefone || '',
                'profile-apto':  user.apartamento || '',
                'profile-bloco': user.bloco || '',
                'profile-bio':   user.bio || '',
                'profile-pix':   user.pix_key || '',
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
            setAvatarPreview(user.foto_url, user.nome);
            setHeaderAvatar(user.foto_url, user.nome);

            // Revelar o card após carregar (evita flash de dados mockados)
            const card = document.getElementById('profile-card');
            if (card) card.style.visibility = 'visible';

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

    // Avatar upload
    const avatarInput = document.getElementById('avatar-upload');
    if (avatarInput) {
        avatarInput.addEventListener('change', async function () {
            const file = this.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('imagem', file);
            try {
                const result = await CondConnect.api('/uploads/imagem', { method: 'POST', body: formData });
                await CondConnect.api('/me', { method: 'PUT', body: { foto_url: result.url } });
                setAvatarPreview(result.url);
                setHeaderAvatar(result.url, CondConnect.currentUser?.nome);
                // Atualiza cache local com nova foto_url
                if (CondConnect.currentUser) CondConnect.currentUser.foto_url = result.url;
                const cached = localStorage.getItem('condconnect_user');
                if (cached) {
                    const u = JSON.parse(cached);
                    u.foto_url = result.url;
                    localStorage.setItem('condconnect_user', JSON.stringify(u));
                }
            } catch (err) {
                await CondConnect.showAlert(err.message || 'Erro ao enviar foto', 'error');
            }
            this.value = '';
        });
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
            ['profile-name', 'profile-phone', 'profile-apto', 'profile-bloco', 'profile-bio', 'profile-pix'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    const campo = id.replace('profile-', '');
                    const mapa = { name: 'nome', phone: 'telefone', apto: 'apartamento', bloco: 'bloco', bio: 'bio', pix: 'pix_key' };
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
                await CondConnect.api('/me', { method: 'PUT', body });
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
                await CondConnect.showAlert(err.message || 'Erro ao salvar perfil', 'error');
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
