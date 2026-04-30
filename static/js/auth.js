document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.querySelector('.auth-form');
    const inputs = document.querySelectorAll('.form-control');

    const validators = {
        email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
        password: (val) => val.length >= 6,
        name: (val) => val.trim().length >= 3,
        password_confirm: (val) => {
            const pass = document.getElementById('password');
            return pass && val === pass.value && val !== '';
        },
        apto: (val) => val.trim() !== '',
        block: (val) => val.trim() !== ''
    };

    inputs.forEach(input => {
        if (!input.nextElementSibling || !input.nextElementSibling.classList.contains('validation-message')) {
            const msg = document.createElement('span');
            msg.className = 'validation-message';
            if (input.id === 'email') msg.textContent = 'Email inválido';
            else if (input.id === 'password') msg.textContent = 'Mínimo 6 caracteres';
            else if (input.id === 'password_confirm') msg.textContent = 'Senhas não coincidem';
            else if (input.id === 'name') msg.textContent = 'Nome muito curto';
            else msg.textContent = 'Campo obrigatório';
            input.after(msg);
        }

        input.addEventListener('input', () => {
            const validator = validators[input.id];
            if (validator) {
                const isValid = validator(input.value);
                input.classList.toggle('invalid', !isValid && input.value !== '');
            }
        });

        input.addEventListener('blur', () => {
            const validator = validators[input.id];
            if (validator && input.value !== '') {
                input.classList.toggle('invalid', !validator(input.value));
            }
        });
    });

    function mostrarErro(msg) {
        let erroEl = document.querySelector('.auth-error');
        if (!erroEl) {
            erroEl = document.createElement('div');
            erroEl.className = 'auth-error';
            erroEl.style.cssText = 'background:#fee2e2;color:#dc2626;padding:12px;border-radius:8px;margin-bottom:16px;font-size:14px;';
            loginForm?.prepend(erroEl);
        }
        erroEl.textContent = msg;
    }

    function limparErro() {
        document.querySelector('.auth-error')?.remove();
    }

    function setLoading(btn, loading) {
        btn.disabled = loading;
        btn.textContent = loading ? 'Aguarde...' : (btn.getAttribute('data-original') || btn.textContent);
    }

    / LOGIN
    const loginBtn = document.getElementById('login-btn') || document.querySelector('.auth-btn');
    if (loginBtn && loginForm && document.getElementById('password') && !document.getElementById('name')) {
        loginBtn.setAttribute('data-original', loginBtn.textContent);
        loginBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            limparErro();

            const email = document.getElementById('email')?.value.trim();
            const senha = document.getElementById('password')?.value;

            if (!email || !senha) {
                mostrarErro('Preencha email e senha');
                return;
            }

            setLoading(this, true);
            try {
                const user = await CondConnect.api('/auth/login', {
                    method: 'POST',
                    body: { email, senha },
                });
                CondConnect.setUser(user);
                window.location.href = '/Templates/dashboard.html';
            } catch (err) {
                mostrarErro(err.message || 'Email ou senha incorretos');
            } finally {
                setLoading(this, false);
            }
        });
    }

    / CADASTRO
    const cadastroBtn = document.getElementById('register-btn') || document.querySelector('.auth-btn');
    if (cadastroBtn && loginForm && document.getElementById('name')) {
        cadastroBtn.setAttribute('data-original', cadastroBtn.textContent);
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            limparErro();

            const nome       = document.getElementById('name')?.value.trim();
            const email      = document.getElementById('email')?.value.trim();
            const senha      = document.getElementById('password')?.value;
            const confirmSenha = document.getElementById('password_confirm')?.value;
            const apto       = document.getElementById('apto')?.value.trim();
            const bloco      = document.getElementById('block')?.value.trim();
            const lgpd       = document.getElementById('lgpd_consent')?.checked;

            if (!nome || !email || !senha || !apto || !bloco) {
                mostrarErro('Preencha todos os campos obrigatórios');
                return;
            }
            if (senha !== confirmSenha) {
                mostrarErro('As senhas não coincidem');
                return;
            }
            if (!lgpd) {
                mostrarErro('Você precisa aceitar os termos de uso');
                return;
            }

            setLoading(cadastroBtn, true);
            try {
                const user = await CondConnect.api('/auth/register', {
                    method: 'POST',
                    body: { nome, email, senha, apartamento: apto, bloco },
                });
                CondConnect.setUser(user);
                window.location.href = '/Templates/dashboard.html';
            } catch (err) {
                mostrarErro(err.message || 'Erro ao criar conta');
            } finally {
                setLoading(cadastroBtn, false);
            }
        });
    }

    / LOGOUT (link com id logout-btn)
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            try {
                await CondConnect.api('/auth/logout', { method: 'POST' });
            } catch {}
            CondConnect.clearUser();
            window.location.href = '/Templates/login.html';
        });
    }
});
