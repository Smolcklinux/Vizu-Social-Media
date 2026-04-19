/**
 * ============================================
 * VIZU - SISTEMA DE MENSAGENS
 * Chat e mensagens diretas
 * ============================================
 */

let currentUser = null;
let currentChatUser = null;
let messageSubscription = null;

/**
 * VERIFICAR AUTENTICAÇÃO
 */
async function checkAuth() {
    const { data: { user }, error } = await window.supabaseClient.auth.getUser();
    
    if (error || !user) {
        window.location.href = 'index.html';
        return null;
    }
    
    currentUser = user;
    return user;
}

/**
 * CARREGAR CONVERSAS
 */
async function loadConversations() {
    const { data, error } = await window.supabaseClient
        .from('mensagens')
        .select(`
            *,
            remetente:remetente_id (username, avatar_url),
            destinatario:destinatario_id (username, avatar_url)
        `)
        .or(`remetente_id.eq.${currentUser.id},destinatario_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Erro ao carregar conversas:', error);
        return;
    }
    
    // Agrupar por conversa
    const conversations = new Map();
    data.forEach(msg => {
        const otherUser = msg.remetente_id === currentUser.id ? msg.destinatario : msg.remetente;
        const conversationId = otherUser.id;
        
        if (!conversations.has(conversationId)) {
            conversations.set(conversationId, {
                user: otherUser,
                lastMessage: msg.mensagem,
                lastMessageTime: msg.created_at,
                unread: !msg.lida && msg.destinatario_id === currentUser.id
            });
        }
    });
    
    renderConversations(Array.from(conversations.values()));
}

/**
 * RENDERIZAR CONVERSAS
 */
function renderConversations(conversations) {
    const container = document.getElementById('conversationsList');
    if (!container) return;
    
    if (conversations.length === 0) {
        container.innerHTML = `
            <div class="empty-conversations">
                <i class="fas fa-comment-dots"></i>
                <p>Nenhuma conversa ainda</p>
                <button id="startChatBtn" class="btn-start-chat">Iniciar conversa</button>
            </div>
        `;
        
        const startBtn = document.getElementById('startChatBtn');
        if (startBtn) {
            startBtn.onclick = () => document.getElementById('newChatModal').style.display = 'block';
        }
        return;
    }
    
    container.innerHTML = conversations.map(conv => `
        <div class="conversation-item" onclick="openChat('${conv.user.id}', '${conv.user.username}')">
            <img src="${conv.user.avatar_url || getDefaultAvatar(conv.user.username)}" class="conversation-avatar">
            <div class="conversation-info">
                <div class="conversation-name">${conv.user.username}</div>
                <div class="conversation-last-message">${escapeHtml(conv.lastMessage.substring(0, 50))}</div>
            </div>
            ${conv.unread ? '<div class="unread-badge"></div>' : ''}
        </div>
    `).join('');
}

/**
 * ABRIR CHAT
 */
async function openChat(userId, username) {
    currentChatUser = { id: userId, username: username };
    
    // Carregar perfil do usuário
    const { data: profile } = await window.supabaseClient
        .from('perfis')
        .select('avatar_url')
        .eq('id', userId)
        .single();
    
    if (profile) {
        currentChatUser.avatar_url = profile.avatar_url;
    }
    
    // Mostrar área de chat
    document.getElementById('chatArea').style.display = 'flex';
    document.getElementById('noChatSelected').style.display = 'none';
    document.getElementById('chatUsername').textContent = username;
    document.getElementById('chatAvatar').src = currentChatUser.avatar_url || getDefaultAvatar(username);
    
    // Carregar mensagens
    await loadMessages(userId);
    
    // Marcar como lidas
    await markMessagesAsRead(userId);
    
    // Subscrever para novas mensagens
    subscribeToMessages(userId);
}

/**
 * CARREGAR MENSAGENS
 */
async function loadMessages(otherUserId) {
    const { data, error } = await window.supabaseClient
        .from('mensagens')
        .select('*')
        .or(`and(remetente_id.eq.${currentUser.id},destinatario_id.eq.${otherUserId}),and(remetente_id.eq.${otherUserId},destinatario_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });
    
    if (error) {
        console.error('Erro ao carregar mensagens:', error);
        return;
    }
    
    renderMessages(data || []);
}

/**
 * RENDERIZAR MENSAGENS
 */
function renderMessages(messages) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="no-messages">
                <i class="fas fa-comment"></i>
                <p>Envie uma mensagem para começar a conversa!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = messages.map(msg => `
        <div class="message ${msg.remetente_id === currentUser.id ? 'message-sent' : 'message-received'}">
            <div class="message-bubble">
                ${escapeHtml(msg.mensagem)}
                <div class="message-time">${formatTime(msg.created_at)}</div>
            </div>
        </div>
    `).join('');
    
    // Scroll para o final
    container.scrollTop = container.scrollHeight;
}

/**
 * ENVIAR MENSAGEM
 */
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message || !currentChatUser) return;
    
    const { data, error } = await window.supabaseClient
        .from('mensagens')
        .insert([{
            remetente_id: currentUser.id,
            destinatario_id: currentChatUser.id,
            mensagem: message,
            lida: false,
            created_at: new Date().toISOString()
        }]);
    
    if (!error) {
        input.value = '';
        await loadMessages(currentChatUser.id);
    } else {
        console.error('Erro ao enviar mensagem:', error);
        showToast('Erro ao enviar mensagem', 'error');
    }
}

/**
 * MARCAR MENSAGENS COMO LIDAS
 */
async function markMessagesAsRead(otherUserId) {
    const { error } = await window.supabaseClient
        .from('mensagens')
        .update({ lida: true })
        .eq('remetente_id', otherUserId)
        .eq('destinatario_id', currentUser.id)
        .eq('lida', false);
    
    if (error) {
        console.error('Erro ao marcar mensagens como lidas:', error);
    }
}

/**
 * SUBSCREVER PARA NOVAS MENSAGENS
 */
function subscribeToMessages(otherUserId) {
    if (messageSubscription) {
        messageSubscription.unsubscribe();
    }
    
    messageSubscription = window.supabaseClient
        .channel('mensagens')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'mensagens',
            filter: `remetente_id=eq.${otherUserId},destinatario_id=eq.${currentUser.id}`
        }, (payload) => {
            // Nova mensagem recebida
            const newMessage = payload.new;
            renderMessage(newMessage);
            markMessagesAsRead(otherUserId);
        })
        .subscribe();
}

/**
 * RENDERIZAR UMA MENSAGEM (tempo real)
 */
function renderMessage(message) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    const messageHtml = `
        <div class="message ${message.remetente_id === currentUser.id ? 'message-sent' : 'message-received'}">
            <div class="message-bubble">
                ${escapeHtml(message.mensagem)}
                <div class="message-time">${formatTime(message.created_at)}</div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', messageHtml);
    container.scrollTop = container.scrollHeight;
}

/**
 * BUSCAR USUÁRIOS PARA NOVA CONVERSA
 */
async function searchUsersForChat(query) {
    if (!query || query.length < 2) return;
    
    const { data, error } = await window.supabaseClient
        .from('perfis')
        .select('id, username, nome_completo, avatar_url')
        .neq('id', currentUser.id)
        .or(`username.ilike.%${query}%,nome_completo.ilike.%${query}%`)
        .limit(20);
    
    if (error) {
        console.error('Erro ao buscar usuários:', error);
        return;
    }
    
    renderUserSearchResults(data);
}

/**
 * RENDERIZAR RESULTADOS DA BUSCA DE USUÁRIOS
 */
function renderUserSearchResults(users) {
    const container = document.getElementById('usersList');
    if (!container) return;
    
    if (users.length === 0) {
        container.innerHTML = '<div class="no-users">Nenhum usuário encontrado</div>';
        return;
    }
    
    container.innerHTML = users.map(user => `
        <div class="user-item" onclick="startNewChat('${user.id}', '${user.username}')">
            <img src="${user.avatar_url || getDefaultAvatar(user.username)}" class="user-avatar">
            <div class="user-info">
                <div class="user-username">${user.username}</div>
                <div class="user-name">${user.nome_completo || ''}</div>
            </div>
        </div>
    `).join('');
}

/**
 * INICIAR NOVA CONVERSA
 */
function startNewChat(userId, username) {
    document.getElementById('newChatModal').style.display = 'none';
    openChat(userId, username);
}

/**
 * ENVIAR MÍDIA
 */
async function sendMedia(file) {
    if (!file || !currentChatUser) return;
    
    showLoading('Enviando mídia...');
    
    let result;
    if (file.type.startsWith('image/')) {
        result = await window.cloudinary.uploadPostImage(file);
    } else {
        result = await window.cloudinary.uploadVideo(file);
    }
    
    if (result.success) {
        const message = file.type.startsWith('image/') ? `📷 ${result.url}` : `🎬 ${result.url}`;
        
        const { error } = await window.supabaseClient
            .from('mensagens')
            .insert([{
                remetente_id: currentUser.id,
                destinatario_id: currentChatUser.id,
                mensagem: message,
                lida: false,
                created_at: new Date().toISOString()
            }]);
        
        if (!error) {
            await loadMessages(currentChatUser.id);
            document.getElementById('mediaModal').style.display = 'none';
        }
    }
    
    hideLoading();
}

/**
 * FUNÇÕES UTILITÁRIAS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(timestamp) {
    if (!timestamp) return 'agora';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'agora';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}min`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    
    return date.toLocaleDateString('pt-BR');
}

function getDefaultAvatar(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4ECDC4&color=fff`;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#4ECDC4' : type === 'error' ? '#ED4956' : '#262626'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showLoading(message) {
    let loader = document.getElementById('globalLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.innerHTML = `
            <div class="global-loader">
                <div class="loader-content">
                    <div class="loader-spinner"></div>
                    <p>${message}</p>
                </div>
            </div>
        `;
        document.body.appendChild(loader);
    } else {
        loader.querySelector('p').textContent = message;
        loader.style.display = 'flex';
    }
}

function hideLoading() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

/**
 * INICIALIZAR MENSAGENS
 */
async function init() {
    console.log('🚀 Iniciando Vizu Mensagens...');
    
    const user = await checkAuth();
    if (!user) return;
    
    await loadConversations();
    
    // Configurar envio de mensagem
    const sendBtn = document.getElementById('sendMessageBtn');
    const messageInput = document.getElementById('messageInput');
    
    if (sendBtn) {
        sendBtn.onclick = sendMessage;
    }
    
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    // Configurar nova conversa
    const newMessageBtn = document.getElementById('newMessageBtn');
    const newChatModal = document.getElementById('newChatModal');
    const closeNewChat = document.querySelector('.close-newchat');
    const searchUsersInput = document.getElementById('searchUsersInput');
    
    if (newMessageBtn) {
        newMessageBtn.onclick = () => {
            newChatModal.style.display = 'block';
        };
    }
    
    if (closeNewChat) {
        closeNewChat.onclick = () => {
            newChatModal.style.display = 'none';
        };
    }
    
    if (searchUsersInput) {
        let searchTimeout;
        searchUsersInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchUsersForChat(e.target.value);
            }, 300);
        });
    }
    
    // Configurar mídia
    const attachBtn = document.getElementById('attachBtn');
    const mediaModal = document.getElementById('mediaModal');
    const closeMedia = document.querySelector('.close-media');
    const uploadPhotoMsg = document.getElementById('uploadPhotoMsg');
    const takePhotoMsg = document.getElementById('takePhotoMsg');
    const mediaUpload = document.getElementById('mediaUpload');
    
    if (attachBtn) {
        attachBtn.onclick = () => {
            mediaModal.style.display = 'block';
        };
    }
    
    if (closeMedia) {
        closeMedia.onclick = () => {
            mediaModal.style.display = 'none';
        };
    }
    
    if (uploadPhotoMsg) {
        uploadPhotoMsg.onclick = () => {
            mediaUpload.accept = 'image/*';
            mediaUpload.click();
        };
    }
    
    if (takePhotoMsg) {
        takePhotoMsg.onclick = () => {
            mediaUpload.accept = 'image/*';
            mediaUpload.capture = 'environment';
            mediaUpload.click();
            setTimeout(() => delete mediaUpload.capture, 100);
        };
    }
    
    if (mediaUpload) {
        mediaUpload.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                sendMedia(file);
            }
        };
    }
    
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.onclick = () => {
            window.location.href = 'feed.html';
        };
    }
    
    console.log('✅ Vizu Mensagens inicializado com sucesso!');
}

// Funções globais
window.openChat = openChat;
window.startNewChat = startNewChat;

document.addEventListener('DOMContentLoaded', init);