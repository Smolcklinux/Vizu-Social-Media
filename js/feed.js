/**
 * ============================================
 * VIZU - LÓGICA DO FEED PRINCIPAL
 * Gerencia posts, curtidas, comentários e interações
 * ============================================
 */

// ========== VARIÁVEIS GLOBAIS ==========
let currentUser = null;
let currentUserProfile = null;
let posts = [];
let currentPostId = null;

/**
 * VERIFICAR AUTENTICAÇÃO
 * Redireciona para login se não estiver logado
 */
async function checkAuth() {
    const { data: { user }, error } = await window.supabaseClient.auth.getUser();
    
    if (error || !user) {
        console.log('❌ Usuário não autenticado, redirecionando...');
        window.location.href = 'index.html';
        return null;
    }
    
    currentUser = user;
    console.log('✅ Usuário autenticado:', user.email);
    return user;
}

/**
 * CARREGAR PERFIL DO USUÁRIO
 */
async function loadUserProfile(userId) {
    const { data, error } = await window.supabaseClient
        .from('perfis')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error) {
        console.error('❌ Erro ao carregar perfil:', error);
        return null;
    }
    
    if (data) {
        currentUserProfile = data;
        console.log('📱 Perfil carregado:', data.username);
        return data;
    }
    return null;
}

/**
 * CARREGAR FEED
 * Busca todos os posts do banco ordenados do mais recente
 */
async function loadFeed() {
    try {
        const { data, error } = await window.supabaseClient
            .from('posts')
            .select(`
                *,
                perfis:usuario_id (
                    username,
                    nome_completo,
                    avatar_url
                )
            `)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Erro ao carregar feed:', error);
            return;
        }
        
        if (data) {
            posts = data;
            console.log(`📰 ${posts.length} posts carregados`);
            renderFeed(data);
        }
    } catch (error) {
        console.error('❌ Erro inesperado:', error);
    }
}

/**
 * RENDERIZAR FEED
 * Cria o HTML dos posts e insere na página
 */
function renderFeed(posts) {
    const container = document.getElementById('feedContainer');
    if (!container) return;
    
    if (!posts || posts.length === 0) {
        container.innerHTML = `
            <div class="empty-feed">
                <i class="fas fa-camera"></i>
                <h3>Nenhum post ainda</h3>
                <p>Comece a compartilhar momentos!</p>
                <button onclick="document.getElementById('openCamera').click()" 
                        class="btn-create-first">
                    Criar primeiro post
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <div class="post-user">
                    <img src="${post.perfis.avatar_url || 'https://ui-avatars.com/api/?name=' + post.perfis.username}" 
                         class="post-avatar" alt="avatar"
                         onclick="goToProfile('${post.perfis.username}')">
                    <div>
                        <span class="post-username" onclick="goToProfile('${post.perfis.username}')">
                            ${escapeHtml(post.perfis.username)}
                        </span>
                        <span class="post-time">${formatTime(post.created_at)}</span>
                    </div>
                </div>
                <div class="post-more">
                    <i class="fas fa-ellipsis-h"></i>
                </div>
            </div>
            
            <img src="${post.imagem_url}" 
                 class="post-image" 
                 alt="Post" 
                 loading="lazy"
                 onclick="openPostDetail('${post.id}')">
            
            <div class="post-actions">
                <button class="action-btn like-btn" data-post-id="${post.id}">
                    <i class="far fa-heart"></i>
                </button>
                <button class="action-btn comment-btn" data-post-id="${post.id}">
                    <i class="far fa-comment"></i>
                </button>
                <button class="action-btn share-btn" data-post-id="${post.id}">
                    <i class="far fa-paper-plane"></i>
                </button>
            </div>
            
            <div class="post-likes" data-post-id="${post.id}" 
                 onclick="showLikes('${post.id}')">
                ${formatNumber(post.curtidas || 0)} curtidas
            </div>
            
            <div class="post-caption">
                <strong onclick="goToProfile('${post.perfis.username}')">
                    ${escapeHtml(post.perfis.username)}
                </strong>
                ${escapeHtml(post.legenda || '')}
            </div>
            
            <div class="post-comments" data-post-id="${post.id}"
                 onclick="openComments('${post.id}')">
                Ver comentários
            </div>
        </div>
    `).join('');
    
    attachPostEvents();
    checkLikedStatus();
}

/**
 * VERIFICAR STATUS DE CURTIDA
 */
async function checkLikedStatus() {
    if (!currentUser) return;
    
    const { data, error } = await window.supabaseClient
        .from('curtidas')
        .select('post_id')
        .eq('usuario_id', currentUser.id);
    
    if (data && data.length > 0) {
        const likedPosts = new Set(data.map(like => like.post_id));
        
        document.querySelectorAll('.like-btn').forEach(btn => {
            const postId = btn.dataset.postId;
            if (likedPosts.has(postId)) {
                const icon = btn.querySelector('i');
                icon.classList.remove('far');
                icon.classList.add('fas', 'liked');
            }
        });
    }
}

/**
 * CRIAR NOVO POST
 */
async function createPost(imageFile, caption) {
    if (!imageFile) {
        alert('Selecione uma imagem!');
        return;
    }
    
    showLoading('Publicando...');
    
    const result = await window.cloudinary.uploadPostImage(imageFile);
    
    if (!result.success) {
        hideLoading();
        alert('❌ Erro no upload: ' + result.error);
        return;
    }
    
    const { data, error } = await window.supabaseClient
        .from('posts')
        .insert([{
            usuario_id: currentUser.id,
            imagem_url: result.url,
            legenda: caption || '',
            curtidas: 0,
            created_at: new Date().toISOString()
        }]);
    
    hideLoading();
    
    if (!error) {
        console.log('✅ Post criado com sucesso!');
        showToast('Post publicado com sucesso!', 'success');
        
        closeModal('postModal');
        document.getElementById('postCaption').value = '';
        document.getElementById('imageUpload').value = '';
        
        await loadFeed();
    } else {
        console.error('❌ Erro ao salvar post:', error);
        alert('❌ Erro ao publicar: ' + error.message);
    }
}

/**
 * CURTIR/DESCURTIR POST
 */
async function likePost(postId, button) {
    if (!currentUser) return;
    
    const icon = button.querySelector('i');
    const isLiked = icon.classList.contains('fas');
    
    if (isLiked) {
        const { error } = await window.supabaseClient
            .from('curtidas')
            .delete()
            .eq('usuario_id', currentUser.id)
            .eq('post_id', postId);
        
        if (!error) {
            icon.classList.remove('fas', 'liked');
            icon.classList.add('far');
            
            const likesSpan = document.querySelector(`.post-likes[data-post-id="${postId}"]`);
            if (likesSpan) {
                let currentLikes = parseInt(likesSpan.textContent) || 0;
                likesSpan.textContent = formatNumber(Math.max(0, currentLikes - 1)) + ' curtidas';
            }
        }
    } else {
        const { error } = await window.supabaseClient
            .from('curtidas')
            .insert([{
                usuario_id: currentUser.id,
                post_id: postId,
                created_at: new Date().toISOString()
            }]);
        
        if (!error) {
            icon.classList.remove('far');
            icon.classList.add('fas', 'liked');
            
            const likesSpan = document.querySelector(`.post-likes[data-post-id="${postId}"]`);
            if (likesSpan) {
                let currentLikes = parseInt(likesSpan.textContent) || 0;
                likesSpan.textContent = formatNumber(currentLikes + 1) + ' curtidas';
            }
            
            // Animação do coração
            icon.style.animation = 'heartBeat 0.3s';
            setTimeout(() => {
                icon.style.animation = '';
            }, 300);
        }
    }
}

/**
 * ADICIONAR COMENTÁRIO
 */
async function addComment(postId, text) {
    if (!text.trim()) {
        alert('Digite um comentário');
        return;
    }
    
    const { data, error } = await window.supabaseClient
        .from('comentarios')
        .insert([{
            post_id: postId,
            usuario_id: currentUser.id,
            texto: text,
            created_at: new Date().toISOString()
        }]);
    
    if (!error) {
        console.log('✅ Comentário adicionado');
        document.getElementById('newComment').value = '';
        await loadCommentsAndDisplay(postId);
        
        showToast('Comentário adicionado!', 'success');
    } else {
        console.error('❌ Erro ao comentar:', error);
        alert('Erro ao adicionar comentário');
    }
}

/**
 * CARREGAR COMENTÁRIOS
 */
async function loadComments(postId) {
    const { data, error } = await window.supabaseClient
        .from('comentarios')
        .select(`
            *,
            perfis:usuario_id (username, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('❌ Erro ao carregar comentários:', error);
        return [];
    }
    
    return data || [];
}

/**
 * MOSTRAR COMENTÁRIOS NO MODAL
 */
async function loadCommentsAndDisplay(postId) {
    currentPostId = postId;
    const comments = await loadComments(postId);
    const commentsList = document.getElementById('commentsList');
    
    if (comments.length === 0) {
        commentsList.innerHTML = `
            <div class="no-comments">
                <i class="far fa-comment-dots"></i>
                <p>Nenhum comentário ainda</p>
                <small>Seja o primeiro a comentar!</small>
            </div>
        `;
    } else {
        commentsList.innerHTML = comments.map(comment => `
            <div class="comment-item">
                <img src="${comment.perfis.avatar_url || 'https://ui-avatars.com/api/?name=' + comment.perfis.username}" 
                     class="comment-avatar" alt="avatar">
                <div class="comment-content">
                    <div class="comment-username">${escapeHtml(comment.perfis.username)}</div>
                    <div class="comment-text">${escapeHtml(comment.texto)}</div>
                    <div class="comment-time">${formatTime(comment.created_at)}</div>
                </div>
            </div>
        `).join('');
    }
    
    document.getElementById('commentsModal').style.display = 'block';
}

/**
 * ESCAPE HTML (segurança contra XSS)
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * FORMATAR TEMPO
 */
function formatTime(timestamp) {
    if (!timestamp) return 'agora';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'agora';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}min`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return date.toLocaleDateString('pt-BR');
}

/**
 * FORMATAR NÚMERO
 */
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}

/**
 * MOSTRAR TOAST
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = message;
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
        animation: fadeInUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * MOSTRAR LOADING
 */
function showLoading(message = 'Carregando...') {
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

/**
 * ESCONDER LOADING
 */
function hideLoading() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

/**
 * FECHAR MODAL
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

/**
 * ADICIONAR EVENTOS AOS POSTS
 */
function attachPostEvents() {
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const postId = btn.dataset.postId;
            likePost(postId, btn);
        };
    });
    
    document.querySelectorAll('.comment-btn, .post-comments').forEach(el => {
        el.onclick = (e) => {
            e.stopPropagation();
            const postId = el.dataset.postId;
            if (postId) {
                openComments(postId);
            }
        };
    });
    
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const postId = btn.dataset.postId;
            sharePost(postId);
        };
    });
}

/**
 * COMPARTILHAR POST
 */
async function sharePost(postId) {
    const post = posts.find(p => p.id === postId);
    if (post) {
        const shareData = {
            title: 'Vizu',
            text: post.legenda || 'Veja esta publicação no Vizu!',
            url: window.location.href + '?post=' + postId
        };
        
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                showToast('Compartilhado!', 'success');
            } catch (err) {
                console.log('Compartilhamento cancelado');
            }
        } else {
            await navigator.clipboard.writeText(window.location.href + '?post=' + postId);
            showToast('Link copiado!', 'success');
        }
    }
}

/**
 * CONFIGURAR UPLOAD DE IMAGEM
 */
function setupImageUpload() {
    const imageInput = document.getElementById('imageUpload');
    const uploadBtn = document.getElementById('uploadPhoto');
    const cameraBtn = document.getElementById('takePhoto');
    
    if (uploadBtn) {
        uploadBtn.onclick = () => {
            imageInput.click();
        };
    }
    
    if (cameraBtn) {
        cameraBtn.onclick = () => {
            imageInput.setAttribute('capture', 'environment');
            imageInput.click();
            setTimeout(() => imageInput.removeAttribute('capture'), 100);
        };
    }
    
    if (imageInput) {
        imageInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const caption = document.getElementById('postCaption').value;
                await createPost(file, caption);
            }
        };
    }
}

/**
 * CONFIGURAR NAVEGAÇÃO
 */
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.classList.remove('active');
            });
            item.classList.add('active');
            
            if (page === 'profile') {
                window.location.href = 'perfil.html';
            } else if (page === 'search') {
                window.location.href = 'explorar.html';
            } else if (page === 'reels') {
                window.location.href = 'reels.html';
            } else if (page === 'feed') {
                window.scrollTo(0, 0);
                loadFeed();
            }
        });
    });
    
    const messagesBtn = document.getElementById('openMessages');
    if (messagesBtn) {
        messagesBtn.onclick = () => {
            window.location.href = 'mensagens.html';
        };
    }
    
    const notifBtn = document.getElementById('openNotifications');
    if (notifBtn) {
        notifBtn.onclick = () => {
            window.location.href = 'notificacoes.html';
        };
    }
}

/**
 * FUNÇÕES GLOBAIS
 */
window.goToProfile = (username) => {
    window.location.href = `perfil.html?user=${username}`;
};

window.openPostDetail = (postId) => {
    window.location.href = `post.html?id=${postId}`;
};

window.openComments = async (postId) => {
    await loadCommentsAndDisplay(postId);
};

window.showLikes = async (postId) => {
    const { data, error } = await window.supabaseClient
        .from('curtidas')
        .select('usuario_id, perfis:usuario_id (username, avatar_url)')
        .eq('post_id', postId);
    
    if (data && data.length > 0) {
        const likesList = data.map(like => `
            <div class="follower-item" onclick="goToProfile('${like.perfis.username}')">
                <img src="${like.perfis.avatar_url || 'https://ui-avatars.com/api/?name=' + like.perfis.username}" class="follower-avatar">
                <div class="follower-info">
                    <div class="follower-username">${like.perfis.username}</div>
                </div>
            </div>
        `).join('');
        
        const modal = document.getElementById('likesModal');
        const list = document.getElementById('likesList');
        if (modal && list) {
            list.innerHTML = likesList;
            modal.style.display = 'block';
            
            const closeBtn = document.querySelector('.close-likes');
            if (closeBtn) {
                closeBtn.onclick = () => modal.style.display = 'none';
            }
        }
    } else {
        showToast('Nenhuma curtida ainda', 'info');
    }
};

/**
 * INICIALIZAR APP
 */
async function init() {
    console.log('🚀 Iniciando Vizu Feed...');
    
    const user = await checkAuth();
    if (!user) return;
    
    await loadUserProfile(user.id);
    await loadFeed();
    setupImageUpload();
    setupNavigation();
    
    const openCameraBtn = document.getElementById('openCamera');
    if (openCameraBtn) {
        openCameraBtn.addEventListener('click', () => {
            document.getElementById('postModal').style.display = 'block';
        });
    }
    
    const closePost = document.querySelector('.close-post');
    if (closePost) {
        closePost.onclick = () => closeModal('postModal');
    }
    
    const closeComments = document.querySelector('.close-comments');
    if (closeComments) {
        closeComments.onclick = () => closeModal('commentsModal');
    }
    
    const submitComment = document.getElementById('submitComment');
    if (submitComment) {
        submitComment.onclick = async () => {
            const text = document.getElementById('newComment').value;
            if (currentPostId) {
                await addComment(currentPostId, text);
            }
        };
    }
    
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.onclick = () => {
            window.location.href = 'feed.html';
        };
    }
    
    console.log('✅ Vizu Feed inicializado com sucesso!');
}

document.addEventListener('DOMContentLoaded', init);