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

    / Verificar se deve abrir conversa específica (vindo de detalhes-produto)
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
                </div>
            `;
        }).join('');

        conversationsList.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.getAttribute('data-id'));
                if (id === activeConvId) return;
                activeConvId = id;
                activeConv = allConvs.find(c => c.id === id);
                atualizarHeaderChat();
                renderConversationsList();
                renderMessages();
            });
        });
    }

    async function loadConversations() {
        try {
            allConvs = await CondConnect.api('/conversas/index');

            / Selecionar primeira conversa se nenhuma ativa
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

            / Atualizar badges sem re-renderizar tudo
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

            / Atualiza última mensagem na lista
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

    await loadConversations();
    await renderMessages();

    / Polling a cada 10s
    poolingInterval = setInterval(async () => {
        if (activeConvId) await renderMessages();
        await loadConversations();
    }, 10000);

    window.addEventListener('beforeunload', () => clearInterval(poolingInterval));
});
