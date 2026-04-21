document.addEventListener('DOMContentLoaded', async function () {
    const conversationsList = document.getElementById('conversations-list');
    const messagesList = document.getElementById('messages-list');
    const chatTitle = document.getElementById('chat-title');
    const chatStatus = document.getElementById('chat-status');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    let activeConvId = null;
    let poolingInterval = null;

    async function renderConversations() {
        if (!conversationsList) return;
        try {
            const convs = await CondConnect.api('/conversas/index.php');

            if (convs.length === 0) {
                conversationsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">Nenhuma conversa iniciada.</div>';
                return;
            }

            conversationsList.innerHTML = convs.map(conv => {
                const avatar = conv.outro_usuario?.avatar || '?';
                const time = conv.ultima_mensagem_em
                    ? new Date(conv.ultima_mensagem_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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

            document.querySelectorAll('.conversation-item').forEach(item => {
                item.addEventListener('click', () => {
                    activeConvId = parseInt(item.getAttribute('data-id'));
                    renderConversations();
                    renderMessages();
                });
            });

            // Selecionar primeiro se nenhum ativo
            if (!activeConvId && convs.length > 0) {
                activeConvId = convs[0].id;
                renderConversations();
                renderMessages();
            }
        } catch {}
    }

    async function renderMessages() {
        if (!messagesList || !activeConvId) {
            if (messagesList) messagesList.innerHTML = '<div style="height: 100%; display: flex; align-items: center; justify-content: center; color: #6b7280;">Selecione uma conversa para começar.</div>';
            return;
        }

        try {
            const msgs = await CondConnect.api(`/conversas/mensagens.php?conversa_id=${activeConvId}`);

            if (!msgs.length) {
                messagesList.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">Nenhuma mensagem ainda. Diga olá!</div>';
                return;
            }

            messagesList.innerHTML = msgs.map(msg => {
                const time = new Date(msg.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return `
                    <div class="message ${msg.tipo}">
                        <div class="message-content">${msg.texto}</div>
                        <span class="message-time">${time}</span>
                    </div>
                `;
            }).join('');

            messagesList.scrollTop = messagesList.scrollHeight;

            // Atualizar lista para limpar badges
            renderConversations();
        } catch {}
    }

    async function sendMessage() {
        const text = chatInput?.value.trim();
        if (!text || !activeConvId) return;

        chatInput.value = '';

        try {
            await CondConnect.api('/conversas/mensagens.php', {
                method: 'POST',
                body: { conversa_id: activeConvId, texto: text },
            });

            // Adicionar mensagem ao DOM imediatamente (otimista)
            const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const msgEl = document.createElement('div');
            msgEl.className = 'message sent';
            msgEl.innerHTML = `<div class="message-content">${text}</div><span class="message-time">${now}</span>`;
            messagesList?.appendChild(msgEl);
            if (messagesList) messagesList.scrollTop = messagesList.scrollHeight;

            renderConversations();
        } catch (err) {
            chatInput.value = text;
        }
    }

    // Verificar se deve abrir conversa específica (vindo de detalhes-produto)
    const convIdParam = new URLSearchParams(window.location.search).get('conversa');
    if (convIdParam) activeConvId = parseInt(convIdParam);

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (chatInput) chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

    await renderConversations();

    // Polling a cada 10s para novas mensagens
    poolingInterval = setInterval(() => {
        if (activeConvId) renderMessages();
        renderConversations();
    }, 10000);

    window.addEventListener('beforeunload', () => clearInterval(poolingInterval));
});
