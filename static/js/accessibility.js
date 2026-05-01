(function () {
    function init() {
        // ── Skip to content link ──────────────────────────────────────────
        const skip = document.createElement('a');
        skip.href = '#main-content';
        skip.className = 'skip-link';
        skip.textContent = 'Ir para o conteúdo principal';
        document.body.prepend(skip);

        // ── ARIA live announcer ───────────────────────────────────────────
        const announcer = document.createElement('div');
        announcer.id = 'aria-announcer';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.setAttribute('role', 'status');
        document.body.appendChild(announcer);

        window.announce = function (msg) {
            announcer.textContent = '';
            setTimeout(() => { announcer.textContent = msg; }, 50);
        };

        // ── ARIA em elementos de navegação ────────────────────────────────
        const sidebar = document.querySelector('.sidebar nav, .sidebar-nav');
        if (sidebar) sidebar.setAttribute('aria-label', 'Navegação principal');

        const main = document.querySelector('.main-content, main, [role="main"]');
        if (main && !main.id) main.id = 'main-content';
        if (main) main.setAttribute('role', 'main');

        document.querySelectorAll('.nav-item').forEach(item => {
            const text = item.querySelector('span')?.textContent?.trim();
            if (text && !item.getAttribute('aria-label')) {
                item.setAttribute('aria-label', text);
            }
        });

        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.setAttribute('role', 'button');
            btn.setAttribute('tabindex', '0');
            btn.setAttribute('aria-label', 'Adicionar aos favoritos');
            btn.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
            });
        });

        document.querySelectorAll('img:not([alt])').forEach(img => {
            img.setAttribute('alt', '');
        });

        document.querySelectorAll('input:not([aria-label])').forEach(input => {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (!label && input.placeholder) {
                input.setAttribute('aria-label', input.placeholder);
            }
        });

        // ── Botão flutuante ───────────────────────────────────────────────
        const btn = document.createElement('button');
        btn.id = 'accessibility-btn';
        btn.setAttribute('aria-label', 'Opções de acessibilidade');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', 'accessibility-panel');
        btn.innerHTML = '&#9855;';
        document.body.appendChild(btn);

        // ── Painel ────────────────────────────────────────────────────────
        const panel = document.createElement('div');
        panel.id = 'accessibility-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Opções de acessibilidade');
        panel.innerHTML = `
            <h3>Acessibilidade</h3>
            <div class="a11y-option">
                <label for="toggle-contrast">Alto contraste</label>
                <label class="a11y-toggle">
                    <input type="checkbox" id="toggle-contrast" aria-label="Ativar alto contraste">
                    <span class="a11y-toggle-slider"></span>
                </label>
            </div>
            <div class="a11y-option">
                <label for="toggle-font">Fonte grande</label>
                <label class="a11y-toggle">
                    <input type="checkbox" id="toggle-font" aria-label="Ativar fonte grande">
                    <span class="a11y-toggle-slider"></span>
                </label>
            </div>
            <div class="a11y-option">
                <span>Leitura em voz alta</span>
                <button id="btn-tts" aria-label="Ativar leitura em voz alta" style="background:#00a6a6;color:white;border:none;border-radius:8px;padding:4px 12px;font-size:12px;cursor:pointer;font-family:inherit;">▶ Ouvir</button>
            </div>
            <div class="a11y-option" style="font-size:11px;color:#64748b;margin-top:4px;">
                Navegue com <kbd style="background:#f1f5f9;padding:1px 5px;border-radius:3px;border:1px solid #cbd5e1;">Tab</kbd> e <kbd style="background:#f1f5f9;padding:1px 5px;border-radius:3px;border:1px solid #cbd5e1;">Enter</kbd>
            </div>
        `;
        document.body.appendChild(panel);

        // ── Toggle painel ─────────────────────────────────────────────────
        btn.addEventListener('click', () => {
            const open = panel.classList.toggle('open');
            btn.setAttribute('aria-expanded', open);
            if (open) announce('Painel de acessibilidade aberto');
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && panel.classList.contains('open')) {
                panel.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
                btn.focus();
            }
        });

        document.addEventListener('click', e => {
            if (!panel.contains(e.target) && e.target !== btn) {
                panel.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
            }
        });

        // ── Alto contraste ────────────────────────────────────────────────
        const contrastToggle = document.getElementById('toggle-contrast');
        if (localStorage.getItem('a11y-contrast') === '1') {
            document.body.classList.add('high-contrast');
            contrastToggle.checked = true;
        }
        contrastToggle.addEventListener('change', () => {
            const on = contrastToggle.checked;
            document.body.classList.toggle('high-contrast', on);
            localStorage.setItem('a11y-contrast', on ? '1' : '0');
            announce(on ? 'Alto contraste ativado' : 'Alto contraste desativado');
        });

        // ── Fonte grande ──────────────────────────────────────────────────
        const fontToggle = document.getElementById('toggle-font');
        if (localStorage.getItem('a11y-font') === '1') {
            document.body.classList.add('large-font');
            fontToggle.checked = true;
        }
        fontToggle.addEventListener('change', () => {
            const on = fontToggle.checked;
            document.body.classList.toggle('large-font', on);
            localStorage.setItem('a11y-font', on ? '1' : '0');
            announce(on ? 'Fonte grande ativada' : 'Fonte grande desativada');
        });

        // ── Keyboard: Enter em divs clicáveis ─────────────────────────────
        document.querySelectorAll('[tabindex="0"]').forEach(el => {
            if (el.tagName !== 'BUTTON' && el.tagName !== 'A') {
                el.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
                });
            }
        });

        // ── Text-to-Speech ────────────────────────────────────────────────
        const ttsBtn = document.getElementById('btn-tts');
        let ttsActive = false;

        function getPageText() {
            const main = document.querySelector('#main-content, .main-content, main') || document.body;
            const skip = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'BUTTON', 'NAV', 'ASIDE'];
            let text = '';
            main.querySelectorAll('h1,h2,h3,h4,p,span,label,li,td,th,.product-title,.product-price,.stat-value').forEach(el => {
                if (skip.includes(el.tagName)) return;
                if (el.closest('nav, aside, script, style')) return;
                const t = el.textContent.trim();
                if (t.length > 2) text += t + '. ';
            });
            return text || document.title;
        }

        function stopTTS() {
            window.speechSynthesis.cancel();
            ttsActive = false;
            if (ttsBtn) { ttsBtn.textContent = '▶ Ouvir'; ttsBtn.style.background = '#00a6a6'; }
            announce('Leitura encerrada');
        }

        if (ttsBtn) {
            if (!window.speechSynthesis) {
                ttsBtn.textContent = 'Não suportado';
                ttsBtn.disabled = true;
            } else {
                ttsBtn.addEventListener('click', () => {
                    if (ttsActive) {
                        stopTTS();
                        return;
                    }
                    const utterance = new SpeechSynthesisUtterance(getPageText());
                    utterance.lang = 'pt-BR';
                    utterance.rate = 0.95;
                    utterance.pitch = 1;
                    const voices = window.speechSynthesis.getVoices();
                    const ptVoice = voices.find(v => v.lang.startsWith('pt'));
                    if (ptVoice) utterance.voice = ptVoice;
                    utterance.onend = stopTTS;
                    utterance.onerror = stopTTS;
                    window.speechSynthesis.speak(utterance);
                    ttsActive = true;
                    ttsBtn.textContent = '⏹ Parar';
                    ttsBtn.style.background = '#dc2626';
                    announce('Leitura iniciada');
                });

                window.addEventListener('beforeunload', () => window.speechSynthesis.cancel());
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
