document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.querySelector('.auth-form');
    const inputs = document.querySelectorAll('.form-control');

    const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    const validators = {
        email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
        password: (val) => STRONG_PASSWORD.test(val),
        name: (val) => val.trim().length >= 3,
        password_confirm: (val) => {
            const pass = document.getElementById('password');
            return pass && val === pass.value && val !== '';
        },
        apto: (val) => val.trim() !== '',
        block: (val) => val.trim() !== '',
        cpf: (val) => validarCPF(val),
    };

    function validarCPF(cpf) {
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
        let sum = 0;
        for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
        let rest = (sum * 10) % 11;
        if (rest >= 10) rest = 0;
        if (rest !== parseInt(cpf[9])) return false;
        sum = 0;
        for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
        rest = (sum * 10) % 11;
        if (rest >= 10) rest = 0;
        return rest === parseInt(cpf[10]);
    }

    function mascaraCPF(v) {
        v = v.replace(/\D/g, '').slice(0, 11);
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        return v;
    }

    function mascaraTelefone(v) {
        v = v.replace(/\D/g, '').slice(0, 11);
        if (v.length <= 10) v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        else v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
        return v;
    }

    function mascaraCEP(v) {
        v = v.replace(/\D/g, '').slice(0, 8);
        v = v.replace(/(\d{5})(\d)/, '$1-$2');
        return v;
    }

    async function buscarCEP(cep) {
        const digits = cep.replace(/\D/g, '');
        if (digits.length !== 8) return;
        const spinner = document.getElementById('cep-spinner');
        if (spinner) spinner.style.display = 'inline';
        try {
            const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
            const data = await resp.json();
            if (!data.erro) {
                const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
                set('logradouro', data.logradouro);
                set('bairro', data.bairro);
                set('cidade', data.localidade);
                set('estado', data.uf);
                document.getElementById('numero')?.focus();
            }
        } catch {}
        if (spinner) spinner.style.display = 'none';
    }

    const isRegisterPage = !!document.getElementById('name');

    if (isRegisterPage) {
        document.getElementById('cpf')?.addEventListener('input', function () {
            this.value = mascaraCPF(this.value);
        });
        document.getElementById('telefone')?.addEventListener('input', function () {
            this.value = mascaraTelefone(this.value);
        });
        const cepInput = document.getElementById('cep');
        if (cepInput) {
            cepInput.addEventListener('input', function () {
                this.value = mascaraCEP(this.value);
                if (this.value.replace(/\D/g, '').length === 8) buscarCEP(this.value);
            });
        }
    }

    // Checklist de senha (só na página de cadastro)
    const passwordInput = document.getElementById('password');
    if (isRegisterPage && passwordInput) {
        const checklist = document.createElement('div');
        checklist.id = 'password-checklist';
        checklist.style.cssText = 'margin-top:8px;display:none;';
        const rules = [
            { id: 'chk-length', label: 'Mínimo 8 caracteres',  test: v => v.length >= 8 },
            { id: 'chk-upper',  label: 'Letra maiúscula',       test: v => /[A-Z]/.test(v) },
            { id: 'chk-lower',  label: 'Letra minúscula',       test: v => /[a-z]/.test(v) },
            { id: 'chk-number', label: 'Número',                test: v => /\d/.test(v) },
            { id: 'chk-symbol', label: 'Símbolo (!@#$...)',     test: v => /[\W_]/.test(v) },
        ];
        rules.forEach(r => {
            const item = document.createElement('div');
            item.id = r.id;
            item.style.cssText = 'font-size:12px;margin:3px 0;display:flex;align-items:center;gap:6px;color:#94a3b8;transition:color .2s;';
            item.innerHTML = `<span style="font-size:14px;">✗</span> ${r.label}`;
            checklist.appendChild(item);
        });
        passwordInput.after(checklist);

        passwordInput.addEventListener('focus', () => { checklist.style.display = 'block'; });
        passwordInput.addEventListener('input', () => {
            const val = passwordInput.value;
            checklist.style.display = val ? 'block' : 'none';
            rules.forEach(r => {
                const el = document.getElementById(r.id);
                const ok = r.test(val);
                el.style.color = ok ? '#16a34a' : '#94a3b8';
                el.querySelector('span').textContent = ok ? '✓' : '✗';
                el.querySelector('span').style.color = ok ? '#16a34a' : '#ef4444';
            });
            passwordInput.classList.toggle('invalid', val !== '' && !STRONG_PASSWORD.test(val));
        });
    }

    inputs.forEach(input => {
        // Pula o campo password no cadastro (tem checklist próprio)
        if (input.id === 'password' && isRegisterPage) return;

        if (!input.nextElementSibling || !input.nextElementSibling.classList.contains('validation-message')) {
            const msg = document.createElement('span');
            msg.className = 'validation-message';
            if (input.id === 'email') msg.textContent = 'Email inválido';
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

    // Aviso de cadastro concluído
    if (new URLSearchParams(window.location.search).get('cadastro') === '1') {
        const aviso = document.createElement('div');
        aviso.style.cssText = 'background:#dcfce7;color:#16a34a;padding:12px;border-radius:8px;margin-bottom:16px;font-size:14px;text-align:center;';
        aviso.textContent = 'Conta criada com sucesso! Faça login para continuar.';
        loginForm?.prepend(aviso);
    }

    // LOGIN
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

            const recaptchaToken = typeof grecaptcha !== 'undefined' ? grecaptcha.getResponse() : '';
            if (!recaptchaToken) {
                mostrarErro('Complete a verificação "Não sou um robô"');
                return;
            }

            setLoading(this, true);
            try {
                const resp = await CondConnect.api('/auth/login', {
                    method: 'POST',
                    body: { email, senha, recaptcha_token: recaptchaToken },
                });
                if (resp.requires_2fa) {
                    document.getElementById('step-login').style.display = 'none';
                    document.getElementById('step-2fa').style.display = 'block';
                    document.getElementById('email-hint').textContent = resp.destino || '';
                    document.getElementById('codigo-2fa').focus();
                } else {
                    CondConnect.setUser(resp);
                    window.location.href = '/Templates/dashboard.html';
                }
            } catch (err) {
                mostrarErro(err.message || 'Email ou senha incorretos');
                if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
            } finally {
                setLoading(this, false);
            }
        });
    }

    // 2FA — verificar código
    const btn2fa = document.getElementById('btn-verificar-2fa');
    if (btn2fa) {
        async function verificar2fa() {
            const codigo = document.getElementById('codigo-2fa')?.value.trim();
            if (!codigo || codigo.length !== 6) {
                await CondConnect.showAlert('Digite o código de 6 dígitos.', 'warning');
                return;
            }
            btn2fa.disabled = true;
            btn2fa.textContent = 'Verificando...';
            try {
                const user = await CondConnect.api('/auth/verificar-2fa', {
                    method: 'POST',
                    body: { codigo },
                });
                CondConnect.setUser(user);
                window.location.href = '/Templates/dashboard.html';
            } catch (err) {
                await CondConnect.showAlert(err.message || 'Código inválido ou expirado.', 'error');
                document.getElementById('codigo-2fa').value = '';
                document.getElementById('codigo-2fa').focus();
            } finally {
                btn2fa.disabled = false;
                btn2fa.textContent = 'Verificar';
            }
        }

        btn2fa.addEventListener('click', verificar2fa);
        document.getElementById('codigo-2fa')?.addEventListener('keydown', e => { if (e.key === 'Enter') verificar2fa(); });
    }

    // 2FA — reenviar código
    document.getElementById('btn-reenviar-2fa')?.addEventListener('click', async function () {
        this.disabled = true;
        this.textContent = 'Enviando...';
        try {
            await CondConnect.api('/auth/reenviar-2fa', { method: 'POST' });
            await CondConnect.showAlert('Novo código enviado.', 'success');
            document.getElementById('codigo-2fa').value = '';
            document.getElementById('codigo-2fa').focus();
        } catch (err) {
            await CondConnect.showAlert(err.message || 'Erro ao reenviar código.', 'error');
        } finally {
            this.disabled = false;
            this.textContent = 'Reenviar código';
        }
    });

    // 2FA — voltar ao login
    document.getElementById('btn-voltar-login')?.addEventListener('click', function () {
        document.getElementById('step-2fa').style.display = 'none';
        document.getElementById('step-login').style.display = 'block';
        document.getElementById('codigo-2fa').value = '';
    });

    // CADASTRO
    const cadastroBtn = document.getElementById('register-btn') || document.querySelector('.auth-btn');
    if (cadastroBtn && loginForm && document.getElementById('name')) {
        cadastroBtn.setAttribute('data-original', cadastroBtn.textContent);
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            limparErro();

            const nome         = document.getElementById('name')?.value.trim();
            const email        = document.getElementById('email')?.value.trim();
            const senha        = document.getElementById('password')?.value;
            const confirmSenha = document.getElementById('password_confirm')?.value;
            const apto         = document.getElementById('apto')?.value.trim();
            const bloco        = document.getElementById('block')?.value.trim();
            const cpf          = document.getElementById('cpf')?.value.trim();
            const telefone     = document.getElementById('telefone')?.value.trim();
            const cep          = document.getElementById('cep')?.value.trim();
            const numero       = document.getElementById('numero')?.value.trim();
            const logradouro   = document.getElementById('logradouro')?.value.trim();
            const bairro       = document.getElementById('bairro')?.value.trim();
            const cidade       = document.getElementById('cidade')?.value.trim();
            const estado       = document.getElementById('estado')?.value.trim();
            const lgpd         = document.getElementById('lgpd_consent')?.checked;

            if (!nome || !email || !senha || !apto || !bloco) {
                mostrarErro('Preencha todos os campos obrigatórios');
                return;
            }
            if (!cpf || !validarCPF(cpf)) {
                mostrarErro('CPF inválido');
                return;
            }
            if (!cep || cep.replace(/\D/g, '').length !== 8) {
                mostrarErro('Informe um CEP válido');
                return;
            }
            if (!numero) {
                mostrarErro('Informe o número do endereço');
                return;
            }
            if (!STRONG_PASSWORD.test(senha)) {
                mostrarErro('A senha deve ter no mínimo 8 caracteres, incluindo maiúscula, minúscula, número e símbolo');
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

            const recaptchaToken = typeof grecaptcha !== 'undefined' ? grecaptcha.getResponse() : '';
            if (!recaptchaToken) {
                mostrarErro('Complete a verificação "Não sou um robô"');
                return;
            }

            setLoading(cadastroBtn, true);
            try {
                await CondConnect.api('/auth/register', {
                    method: 'POST',
                    body: { nome, email, senha, apartamento: apto, bloco, cpf, telefone, cep, numero, logradouro, bairro, cidade, estado, recaptcha_token: recaptchaToken },
                });
                window.location.href = '/Templates/login.html?cadastro=1';
            } catch (err) {
                mostrarErro(err.message || 'Erro ao criar conta');
                if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
            } finally {
                setLoading(cadastroBtn, false);
            }
        });
    }

    // LOGOUT (link com id logout-btn)
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
