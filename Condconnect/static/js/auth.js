document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.querySelector('.auth-form');
    const inputs = document.querySelectorAll('.form-control');

    const validators = {
        email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
        password: (val) => val.length >= 6,
        name: (val) => val.trim().length >= 3,
        password_confirm: (val) => {
            const pass = document.getElementById('password').value;
            return val === pass && val !== '';
        },
        apto: (val) => val.trim() !== '',
        block: (val) => val.trim() !== ''
    };

    inputs.forEach(input => {
        // Create validation message element if not present
        if (!input.nextElementSibling || !input.nextElementSibling.classList.contains('validation-message')) {
            const msg = document.createElement('span');
            msg.className = 'validation-message';

            // Set message based on ID
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
                if (isValid || input.value === '') {
                    input.classList.remove('invalid');
                } else {
                    input.classList.add('invalid');
                }
            }
        });

        // Blurred state validation
        input.addEventListener('blur', () => {
            const validator = validators[input.id];
            if (validator && input.value !== '') {
                if (!validator(input.value)) {
                    input.classList.add('invalid');
                }
            }
        });
    });

    // Login Handling
    const loginBtn = document.querySelector('.auth-btn');
    if (loginBtn && loginForm) {
        loginBtn.addEventListener('click', function (e) {
            e.preventDefault();
            const email = document.getElementById('email').value;

            // Set role based on email
            const role = (email === 'admin@condconnect.com') ? 'admin' : 'user';

            // Save to localStorage
            localStorage.setItem('condconnect_user_role', role);
            localStorage.setItem('condconnect_user_email', email);

            // Redirect to dashboard
            window.location.href = '/Templates/dashboard.html';
        });
    }
});
