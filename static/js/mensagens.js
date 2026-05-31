document.addEventListener('DOMContentLoaded', async function () {
    const conversationsList = document.getElementById('conversations-list');
    const messagesList = document.getElementById('messages-list');
    const chatTitle = document.getElementById('chat-title');
    const chatStatus = document.getElementById('chat-status');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    let activeConvId = null;
    let activeConv = null;
    let allConvs = [];
    let poolingInterval = null;

    // Verificar se deve abrir conversa específica (vindo de detalhes-produto)
    const convIdParam = new URLSearchParams(window.location.search).get('conversa');
    if (convIdParam) activeConvId = parseInt(convIdParam);

    function renderConversationsList() {
        if (!conversationsList || !allConvs.length) {
            if (conversationsList && !allConvs.length) {
                conversationsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">Nenhuma conversa iniciada.</div>';
            }
            return;
        }

        conversationsList.innerHTML = allConvs.map(conv => {
            const avatar = conv.outro_usuario?.avatar || '?';
            const time = conv.ultima_mensagem_em
                ? new Date(conv.ultima_mensagem_em.replace(' ', 'T') + 'Z').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                : '';
            return `
                <div class="conversation-item ${conv.id === activeConvId ? 'active' : ''}" data-id="${conv.id}">
                    <div class="chat-avatar">${avatar}</div>
                    <div class="conversation-info">
                        <div class="chat-header-info">
                            <span class="chat-name">${conv.outro_usuario?.nome || ''}</span>
                            <span class="chat-time">${time}</span>
                        </div>
                        <div class="last-message">${conv.ultima_mensagem || 'Iniciar conversa...'}</div>
                    </div>
                    ${conv.nao_lidas > 0 ? `<div class="unread-count">${conv.nao_lidas}</div>` : ''}
                    <button class="delete-conv-btn" data-conv-id="${conv.id}" title="Apagar conversa">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');

        conversationsList.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.delete-conv-btn')) return;
                const id = parseInt(item.getAttribute('data-id'));
                if (id === activeConvId) return;
                activeConvId = id;
                activeConv = allConvs.find(c => c.id === id);
                atualizarHeaderChat();
                renderConversationsList();
                renderMessages();
            });
        });

        conversationsList.querySelectorAll('.delete-conv-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const cid = parseInt(btn.getAttribute('data-conv-id'));
                if (!await CondConnect.showConfirm('As mensagens serão perdidas permanentemente.', 'Apagar Conversa')) return;
                try {
                    await CondConnect.api(`/conversas?id=${cid}`, { method: 'DELETE' });
                    allConvs = allConvs.filter(c => c.id !== cid);
                    if (activeConvId === cid) {
                        activeConvId = allConvs[0]?.id || null;
                        activeConv = allConvs[0] || null;
                        atualizarHeaderChat();
                        renderMessages();
                    }
                    renderConversationsList();
                } catch {}
            });
        });
    }

    async function loadConversations() {
        try {
            allConvs = await CondConnect.api('/conversas');

            // Selecionar primeira conversa se nenhuma ativa
            if (!activeConvId && allConvs.length > 0) {
                activeConvId = allConvs[0].id;
                activeConv = allConvs[0];
                atualizarHeaderChat();
            } else if (activeConvId) {
                activeConv = allConvs.find(c => c.id === activeConvId) || null;
                if (activeConv) atualizarHeaderChat();
            }

            renderConversationsList();
        } catch {}
    }

    async function renderMessages() {
        if (!messagesList || !activeConvId) {
            if (messagesList) messagesList.innerHTML = '<div style="height: 100%; display: flex; align-items: center; justify-content: center; color: #6b7280;">Selecione uma conversa para começar.</div>';
            return;
        }

        try {
            const msgs = await CondConnect.api(`/conversas/mensagens?conversa_id=${activeConvId}`);

            if (!msgs.length) {
                messagesList.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">Nenhuma mensagem ainda. Diga olá!</div>';
                return;
            }

            messagesList.innerHTML = msgs.map(msg => {
                const time = new Date(msg.criado_em.replace(' ', 'T') + 'Z').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
                return `
                    <div class="message ${msg.tipo}">
                        <div class="message-content">${msg.texto}</div>
                        <span class="message-time">${time}</span>
                    </div>
                `;
            }).join('');

            messagesList.scrollTop = messagesList.scrollHeight;

            // Atualizar badges sem re-renderizar tudo
            const conv = allConvs.find(c => c.id === activeConvId);
            if (conv && conv.nao_lidas > 0) {
                conv.nao_lidas = 0;
                renderConversationsList();
            }
        } catch {}
    }

    async function sendMessage() {
        const text = chatInput?.value.trim();
        if (!text || !activeConvId) return;

        chatInput.value = '';

        try {
            await CondConnect.api('/conversas/mensagens', {
                method: 'POST',
                body: { conversa_id: activeConvId, texto: text },
            });

            const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
            const msgEl = document.createElement('div');
            msgEl.className = 'message sent';
            msgEl.innerHTML = `<div class="message-content">${text}</div><span class="message-time">${now}</span>`;
            messagesList?.appendChild(msgEl);
            if (messagesList) messagesList.scrollTop = messagesList.scrollHeight;

            // Atualiza última mensagem na lista
            const conv = allConvs.find(c => c.id === activeConvId);
            if (conv) {
                conv.ultima_mensagem = text;
                conv.ultima_mensagem_em = new Date().toISOString();
                renderConversationsList();
            }
        } catch (err) {
            chatInput.value = text;
        }
    }

    function atualizarHeaderChat() {
        if (!activeConv) return;
        if (chatTitle) chatTitle.textContent = activeConv.outro_usuario?.nome || '';
        if (chatStatus) chatStatus.textContent = '';
        const avatar = document.querySelector('.chat-header .chat-avatar');
        if (avatar) avatar.textContent = activeConv.outro_usuario?.avatar || '?';
    }

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (chatInput) chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

    const btnDenunciar = document.getElementById('btn-denunciar-usuario');
    if (btnDenunciar) {
        btnDenunciar.addEventListener('click', async () => {
            if (!activeConv) return CondConnect.showAlert('Selecione uma conversa primeiro.', 'warning');
            const outroNome = activeConv.outro_usuario?.nome || 'este usuário';
            const motivos = ['Comportamento inadequado', 'Assédio ou ameaça', 'Tentativa de golpe', 'Spam ou conteúdo falso', 'Outro'];
            const motivo = await new Promise(resolve => {
                const ov = document.createElement('div');
                ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;';
                ov.innerHTML = `<div style="background:#fff;border-radius:20px;padding:28px;max-width:380px;width:100%;box-shadow:0 24px 80px rgba(0,0,0,.18);">
                    <h3 style="margin:0 0 6px;color:#0f172a;font-size:17px;font-weight:700;">Denunciar ${outroNome}</h3>
                    <p style="margin:0 0 18px;color:#64748b;font-size:13px;">Selecione o motivo da denúncia:</p>
                    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
                        ${motivos.map((m, i) => `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;cursor:pointer;font-size:14px;color:#374151;">
                            <input type="radio" name="motivo_denuncia" value="${m}" ${i === 0 ? 'checked' : ''} style="accent-color:#ef4444;"> ${m}
                        </label>`).join('')}
                    </div>
                    <div style="display:flex;gap:10px;">
                        <button id="den-cancel" style="flex:1;background:#f1f5f9;color:#475569;border:none;border-radius:12px;padding:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">Cancelar</button>
                        <button id="den-ok" style="flex:1;background:#ef4444;color:#fff;border:none;border-radius:12px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">Denunciar</button>
                    </div>
                </div>`;
                document.body.appendChild(ov);
                ov.querySelector('#den-cancel').addEventListener('click', () => { ov.remove(); resolve(null); });
                ov.querySelector('#den-ok').addEventListener('click', () => {
                    const sel = ov.querySelector('input[name="motivo_denuncia"]:checked');
                    ov.remove();
                    resolve(sel ? sel.value : null);
                });
                ov.addEventListener('click', e => { if (e.target === ov) { ov.remove(); resolve(null); } });
            });
            if (!motivo) return;
            try {
                const outroId = activeConv.outro_usuario?.id;
                await CondConnect.api('/relatorios', { method: 'POST', body: { tipo: 'usuario', alvo_id: outroId, motivo } });
                await CondConnect.showAlert('Denúncia enviada. Nossa equipe irá analisar em breve.', 'success');
            } catch (err) {
                await CondConnect.showAlert(err.message || 'Erro ao enviar denúncia.', 'error');
            }
        });
    }

    await loadConversations();
    await renderMessages();

    // Polling a cada 10s
    poolingInterval = setInterval(async () => {
        if (activeConvId) await renderMessages();
        await loadConversations();
    }, 10000);

    window.addEventListener('beforeunload', () => clearInterval(poolingInterval));
});
