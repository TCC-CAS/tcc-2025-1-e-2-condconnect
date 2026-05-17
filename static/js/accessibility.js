(function () {
    function init() {
        // ── Skip to content link ──────────────────────────────────────────
        const skip = document.createElement('a');
        skip.href = '#main-content';
        skip.className = 'skip-link';
        skip.textContent = 'Ir para o conteúdo principal';
        skip.addEventListener('click', e => {
            e.preventDefault();
            const target = document.getElementById('main-content');
            if (target) {
                target.setAttribute('tabindex', '-1');
                target.focus();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
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
            if (text && !item.getAttribute('aria-label')) item.setAttribute('aria-label', text);
        });

        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.setAttribute('role', 'button');
            btn.setAttribute('tabindex', '0');
            if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', 'Adicionar aos favoritos');
            btn.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
            });
        });

        document.querySelectorAll('img:not([alt])').forEach(img => img.setAttribute('alt', ''));

        document.querySelectorAll('input:not([aria-label])').forEach(input => {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (!label && input.placeholder) input.setAttribute('aria-label', input.placeholder);
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
                <label for="toggle-tab-tts">Leitura ao navegar (Tab)</label>
                <label class="a11y-toggle">
                    <input type="checkbox" id="toggle-tab-tts" aria-label="Ativar leitura ao navegar com Tab">
                    <span class="a11y-toggle-slider"></span>
                </label>
            </div>
            <div class="a11y-option" style="margin-top:2px;">
                <label for="tts-speed" style="font-size:13px;">Velocidade da leitura</label>
                <select id="tts-speed" aria-label="Velocidade da leitura em voz alta" style="border:1px solid #e2e8f0;border-radius:6px;padding:3px 8px;font-size:12px;font-family:inherit;color:#374151;cursor:pointer;background:white;">
                    <option value="0.5">0,5×</option>
                    <option value="0.75">0,75×</option>
                    <option value="1" selected>1× (padrão)</option>
                    <option value="1.25">1,25×</option>
                    <option value="1.5">1,5×</option>
                    <option value="2">2×</option>
                </select>
            </div>
            <div class="a11y-option" style="margin-top:4px;">
                <span>Ler página completa</span>
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

        // ── TTS helpers ───────────────────────────────────────────────────
        const speedSelect = document.getElementById('tts-speed');
        const savedSpeed = localStorage.getItem('a11y-tts-speed');
        if (savedSpeed) speedSelect.value = savedSpeed;

        speedSelect.addEventListener('change', () => {
            localStorage.setItem('a11y-tts-speed', speedSelect.value);
            announce('Velocidade: ' + speedSelect.options[speedSelect.selectedIndex].text);
            // Se leitura completa está ativa, reinicia com a nova velocidade
            if (ttsActive) {
                window.speechSynthesis.cancel();
                setTimeout(() => {
                    const utt = new SpeechSynthesisUtterance(getPageText());
                    utt.lang = 'pt-BR';
                    utt.rate = getTTSRate();
                    utt.pitch = 1;
                    const voice = getPtVoice();
                    if (voice) utt.voice = voice;
                    utt.onend = stopTTS;
                    utt.onerror = stopTTS;
                    window.speechSynthesis.speak(utt);
                }, 100);
            }
        });

        function getTTSRate() {
            return parseFloat(speedSelect.value) || 1;
        }

        function getPtVoice() {
            const voices = window.speechSynthesis.getVoices();
            return voices.find(v => v.lang.startsWith('pt')) || null;
        }

        function speak(text) {
            if (!text || text.trim().length < 2) return;
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(text.trim());
            utt.lang = 'pt-BR';
            utt.rate = getTTSRate();
            utt.pitch = 1;
            const voice = getPtVoice();
            if (voice) utt.voice = voice;
            window.speechSynthesis.speak(utt);
        }

        // ── Leitura ao navegar com Tab ────────────────────────────────────
        // Torna focusáveis via Tab todos os elementos de texto do conteúdo principal
        function setContentFocusable(enable) {
            const mainEl = document.querySelector('#main-content, .main-content, main') || document.body;
            const selector = 'h1, h2, h3, h4, h5, h6, p, label, li';
            mainEl.querySelectorAll(selector).forEach(el => {
                if (el.closest('.sidebar, nav, aside, #accessibility-panel, script, style, footer')) return;
                if (['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return;
                const text = el.textContent?.trim() || '';
                if (text.length < 3) return;
                if (enable) {
                    if (!el.hasAttribute('tabindex')) {
                        el.setAttribute('tabindex', '0');
                        el.dataset.a11yAdded = '1';
                    }
                } else if (el.dataset.a11yAdded === '1') {
                    el.removeAttribute('tabindex');
                    delete el.dataset.a11yAdded;
                }
            });
        }

        const tabTtsToggle = document.getElementById('toggle-tab-tts');
        let tabTtsActive = localStorage.getItem('a11y-tab-tts') === '1';
        tabTtsToggle.checked = tabTtsActive;
        if (tabTtsActive) setContentFocusable(true);

        tabTtsToggle.addEventListener('change', () => {
            tabTtsActive = tabTtsToggle.checked;
            localStorage.setItem('a11y-tab-tts', tabTtsActive ? '1' : '0');
            if (!tabTtsActive) window.speechSynthesis.cancel();
            setContentFocusable(tabTtsActive);
            announce(tabTtsActive ? 'Leitura ao navegar ativada' : 'Leitura ao navegar desativada');
        });

        function getReadableText(el) {
            const ariaLabel = el.getAttribute('aria-label');
            if (ariaLabel) return ariaLabel;
            const title = el.getAttribute('title');
            if (title) return title;
            if (el.tagName === 'IMG') return el.getAttribute('alt') || 'Imagem';
            const placeholder = el.getAttribute('placeholder');
            if (placeholder) return placeholder;
            if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                const labelEl = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
                const labelText = labelEl ? labelEl.textContent.trim() : '';
                const val = el.value ? ': ' + el.value : '';
                return (labelText || el.type || 'campo') + val;
            }
            const raw = el.textContent?.replace(/\s+/g, ' ').trim() || '';
            const text = raw.length > 200 ? raw.slice(0, 200) + '...' : raw;
            // Prefixo de contexto por tipo de elemento
            const tag = el.tagName;
            if (tag === 'H1') return `Título: ${text}`;
            if (tag === 'H2') return `Seção: ${text}`;
            if (tag === 'H3' || tag === 'H4' || tag === 'H5' || tag === 'H6') return `Subtítulo: ${text}`;
            if (tag === 'LABEL') return `Campo: ${text}`;
            if (tag === 'LI') return `Item da lista: ${text}`;
            return text;
        }

        // Use 'focusin' to catch all focus events including bubbled ones
        document.addEventListener('focusin', e => {
            if (!tabTtsActive) return;
            // Skip the accessibility panel itself
            if (panel.contains(e.target) || e.target === btn) return;
            const text = getReadableText(e.target);
            if (text && text.length > 1) speak(text);
        });

        // ── Ler página completa ────────────────────────────────────────────
        const ttsBtn = document.getElementById('btn-tts');
        let ttsActive = false;

        function getPageText() {
            const mainEl = document.querySelector('#main-content, .main-content, main') || document.body;
            const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'BUTTON', 'NAV', 'ASIDE'];
            let text = '';
            mainEl.querySelectorAll('h1,h2,h3,h4,p,span,label,li,td,th,.product-title,.product-price,.stat-value').forEach(el => {
                if (skipTags.includes(el.tagName)) return;
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
                    if (ttsActive) { stopTTS(); return; }
                    const utt = new SpeechSynthesisUtterance(getPageText());
                    utt.lang = 'pt-BR';
                    utt.rate = getTTSRate();
                    utt.pitch = 1;
                    const voice = getPtVoice();
                    if (voice) utt.voice = voice;
                    utt.onend = stopTTS;
                    utt.onerror = stopTTS;
                    window.speechSynthesis.speak(utt);
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
