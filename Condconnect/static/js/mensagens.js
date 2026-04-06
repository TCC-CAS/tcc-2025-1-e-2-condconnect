document.addEventListener('DOMContentLoaded', function () {
    const conversationsList = document.getElementById('conversations-list');
    const messagesList = document.getElementById('messages-list');
    const chatTitle = document.getElementById('chat-title');
    const chatStatus = document.getElementById('chat-status');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    // Load conversations or empty array
    let conversations = JSON.parse(localStorage.getItem('condconnect_conversations')) || [];
    let activeConversationId = localStorage.getItem('condconnect_active_chat') || (conversations.length > 0 ? conversations[0].id : null);

    function saveConversations() {
        localStorage.setItem('condconnect_conversations', JSON.stringify(conversations));
    }

    function renderConversations() {
        if (conversations.length === 0) {
            conversationsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">Nenhuma conversa iniciada.</div>';
            return;
        }

        conversationsList.innerHTML = conversations.map(conv => `
            <div class="conversation-item ${conv.id === activeConversationId ? 'active' : ''}" data-id="${conv.id}">
                <div class="chat-avatar ${conv.status === 'Online agora' ? 'online' : ''}">${conv.avatar}</div>
                <div class="conversation-info">
                    <div class="chat-header-info">
                        <span class="chat-name">${conv.name}</span>
                        <span class="chat-time">${conv.time}</span>
                    </div>
                    <div class="last-message">${conv.lastMessage}</div>
                </div>
                ${conv.unread > 0 ? `<div class="unread-count">${conv.unread}</div>` : ''}
            </div>
        `).join('');

        document.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                activeConversationId = item.getAttribute('data-id');
                localStorage.setItem('condconnect_active_chat', activeConversationId);

                const conv = conversations.find(c => c.id === activeConversationId);
                if (conv) conv.unread = 0;

                saveConversations();
                renderConversations();
                renderMessages();
            });
        });
    }

    function renderMessages() {
        const activeConv = conversations.find(c => c.id === activeConversationId);
        if (!activeConv) {
            messagesList.innerHTML = '<div style="height: 100%; display: flex; align-items: center; justify-content: center; color: #6b7280;">Selecione uma conversa para começar.</div>';
            chatTitle.textContent = 'CondConnect Chat';
            chatStatus.textContent = '';
            return;
        }

        chatTitle.textContent = activeConv.name;
        chatStatus.textContent = activeConv.status;
        document.querySelector('.header-user .chat-avatar').textContent = activeConv.avatar;

        if (activeConv.messages.length === 0) {
            messagesList.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">Nenhuma mensagem ainda.</div>';
        } else {
            messagesList.innerHTML = activeConv.messages.map(msg => `
                <div class="message ${msg.type}">
                    <div class="message-content">${msg.text}</div>
                    <span class="message-time">${msg.time}</span>
                </div>
            `).join('');
        }

        messagesList.scrollTop = messagesList.scrollHeight;
    }

    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        const now = new Date();
        const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        const activeConv = conversations.find(c => c.id === activeConversationId);
        if (activeConv) {
            activeConv.messages.push({ type: 'sent', text: text, time: timeStr });
            activeConv.lastMessage = text;
            activeConv.time = timeStr;

            chatInput.value = '';
            renderMessages();
            renderConversations();
            saveConversations();
        }
    }

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (chatInput) chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    renderConversations();
    renderMessages();
});
