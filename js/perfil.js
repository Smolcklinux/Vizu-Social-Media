/**
 * ============================================
 * VIZU - LÓGICA DO PERFIL DO USUÁRIO
 * Gerencia perfil, edição, seguidores e posts
 * ============================================
 */

let currentUser = null;
let profileUser = null;
let isOwnProfile = false;

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
 * CARREGAR PERFIL DO USUÁRIO
 */
async function loadProfile(username) {
  const { data, error } = await window.supabaseClient
    .from('perfis')
    .select('*')
    .eq('username', username)
    .single();
  
  if (error) {
    console.error('❌ Erro ao carregar perfil:', error);
    return null;
  }
  
  profileUser = data;
  isOwnProfile = currentUser.id === data.id;
  
  renderProfile(data);
  loadUserPosts(data.id);
  checkFollowStatus(data.id);
  
  return data;
}

/**
 * RENDERIZAR PERFIL
 */
function renderProfile(profile) {
  document.getElementById('profileUsername').textContent = profile.username;
  document.getElementById('profileAvatar').src = profile.avatar_url || getDefaultAvatar(profile.username);
  document.getElementById('profileFullName').textContent = profile.nome_completo;
  document.getElementById('profileBio').textContent = profile.bio || 'Bem-vindo ao Vizu! 👋';
  document.getElementById('postsCount').textContent = formatNumber(profile.posts_count || 0);
  document.getElementById('followersCount').textContent = formatNumber(profile.seguidores || 0);
  document.getElementById('followingCount').textContent = formatNumber(profile.seguindo || 0);
  
  if (profile.localizacao) {
    document.getElementById('profileLocation').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${profile.localizacao}`;
  }
  
  if (profile.website) {
    document.getElementById('profileWebsite').innerHTML = `<i class="fas fa-link"></i> <a href="${profile.website}" target="_blank">${profile.website}</a>`;
  }
  
  const actionsDiv = document.querySelector('.profile-actions');
  if (actionsDiv) {
    if (isOwnProfile) {
      actionsDiv.innerHTML = `
                <button class="btn-edit" id="editProfileButton">Editar perfil</button>
                <button class="btn-message" id="shareProfileButton">Compartilhar</button>
            `;
      document.getElementById('editProfileButton')?.addEventListener('click', openEditModal);
      document.getElementById('shareProfileButton')?.addEventListener('click', shareProfile);
    } else {
      const followBtn = document.createElement('button');
      followBtn.className = 'btn-follow';
      followBtn.id = 'followButton';
      followBtn.textContent = isFollowing ? 'Seguindo' : 'Seguir';
      followBtn.onclick = toggleFollow;
      
      const messageBtn = document.createElement('button');
      messageBtn.className = 'btn-message';
      messageBtn.textContent = 'Mensagem';
      messageBtn.onclick = () => {
        window.location.href = `mensagens.html?user=${profile.username}`;
      };
      
      actionsDiv.innerHTML = '';
      actionsDiv.appendChild(followBtn);
      actionsDiv.appendChild(messageBtn);
    }
  }
}

/**
 * CARREGAR POSTS DO USUÁRIO
 */
async function loadUserPosts(userId) {
  const { data, error } = await window.supabaseClient
    .from('posts')
    .select('*')
    .eq('usuario_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Erro ao carregar posts:', error);
    return;
  }
  
  renderPostsGrid(data);
}

/**
 * RENDERIZAR GRID DE POSTS
 */
function renderPostsGrid(posts) {
  const grid = document.getElementById('postsGrid');
  if (!grid) return;
  
  if (!posts || posts.length === 0) {
    grid.innerHTML = `
            <div class="empty-grid">
                <i class="fas fa-camera"></i>
                <p>Nenhum post ainda</p>
            </div>
        `;
    return;
  }
  
  grid.innerHTML = posts.map(post => `
        <div class="grid-item" onclick="openPostDetail('${post.id}')">
            <img src="${post.imagem_url}" alt="Post" loading="lazy">
            <div class="grid-overlay">
                <span><i class="fas fa-heart"></i> ${post.curtidas || 0}</span>
                <span><i class="fas fa-comment"></i> ${post.comentarios_count || 0}</span>
            </div>
        </div>
    `).join('');
}

/**
 * VERIFICAR STATUS DE SEGUIMENTO
 */
let isFollowing = false;

async function checkFollowStatus(profileId) {
  const { data, error } = await window.supabaseClient
    .from('seguidores')
    .select('*')
    .eq('seguidor_id', currentUser.id)
    .eq('seguindo_id', profileId)
    .single();
  
  isFollowing = !!data;
  
  const followBtn = document.getElementById('followButton');
  if (followBtn) {
    followBtn.textContent = isFollowing ? 'Seguindo' : 'Seguir';
    followBtn.classList.toggle('following', isFollowing);
  }
}

/**
 * ALTERNAR SEGUIR/DESSEGUIR
 */
async function toggleFollow() {
    const followBtn = document.getElementById('followButton');
    
    if (isFollowing) {
        const { error } = await window.supabaseClient
            .from('seguidores')
            .delete()
            .eq('seguidor_id', currentUser.id)
            .eq('seguindo_id', profileUser.id);
        
        if (!error) {
            isFollowing = false;
            followBtn.textContent = 'Seguir';
            followBtn.classList.remove('following');
            
            // Atualizar contador
            const followersCount = document.getElementById('followersCount');
            const currentCount = parseInt(followersCount.textContent) || 0;
            followersCount.textContent = formatNumber(Math.max(0, currentCount - 1));
            
            showToast('Deixou de seguir', 'info');
        }
    } else {
        const { error } = await window.supabaseClient
            .from('seguidores')
            .insert([{
                seguidor_id: currentUser.id,
                seguindo_id: profileUser.id,
                created_at: new Date().toISOString()
            }]);
        
        if (!error) {
            isFollowing = true;
            followBtn.textContent = 'Seguindo';
            followBtn.classList.add('following');
            
            // Atualizar contador
            const followersCount = document.getElementById('followersCount');
            const currentCount = parseInt(followersCount.textContent) || 0;
            followersCount.textContent = formatNumber(currentCount + 1);
            
            showToast('Agora você segue ' + profileUser.username, 'success');
        }
    }
}

/**
 * ABRIR MODAL DE EDIÇÃO
 */
function openEditModal() {
    const modal = document.getElementById('editProfileModal');
    if (!modal) return;
    
    document.getElementById('editFullName').value = profileUser.nome_completo || '';
    document.getElementById('editBio').value = profileUser.bio || '';
    document.getElementById('editLocation').value = profileUser.localizacao || '';
    document.getElementById('editWebsite').value = profileUser.website || '';
    
    modal.style.display = 'block';
    
    const closeBtn = document.querySelector('.close-edit');
    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = 'none';
    }
}

/**
 * SALVAR EDIÇÃO DO PERFIL
 */
async function saveProfileEdit(e) {
    e.preventDefault();
    
    const updates = {
        nome_completo: document.getElementById('editFullName').value,
        bio: document.getElementById('editBio').value,
        localizacao: document.getElementById('editLocation').value,
        website: document.getElementById('editWebsite').value,
        updated_at: new Date().toISOString()
    };
    
    showLoading('Salvando...');
    
    const { error } = await window.supabaseClient
        .from('perfis')
        .update(updates)
        .eq('id', currentUser.id);
    
    hideLoading();
    
    if (!error) {
        showToast('Perfil atualizado!', 'success');
        document.getElementById('editProfileModal').style.display = 'none';
        
        // Recarregar perfil
        await loadProfile(profileUser.username);
    } else {
        showToast('Erro ao atualizar: ' + error.message, 'error');
    }
}

/**
 * UPLOAD DE AVATAR
 */
async function uploadAvatar(file) {
    if (!file) return;
    
    showLoading('Atualizando foto...');
    
    const result = await window.cloudinary.uploadAvatar(file);
    
    if (result.success) {
        const { error } = await window.supabaseClient
            .from('perfis')
            .update({ avatar_url: result.url })
            .eq('id', currentUser.id);
        
        if (!error) {
            document.getElementById('profileAvatar').src = result.url;
            showToast('Foto de perfil atualizada!', 'success');
        }
    } else {
        showToast('Erro ao atualizar foto', 'error');
    }
    
    hideLoading();
}

/**
 * CARREGAR SEGUIDORES
 */
async function loadFollowers() {
    const { data, error } = await window.supabaseClient
        .from('seguidores')
        .select(`
            seguidor_id,
            perfis:seguidor_id (username, nome_completo, avatar_url)
        `)
        .eq('seguindo_id', profileUser.id);
    
    if (error) {
        console.error('Erro ao carregar seguidores:', error);
        return [];
    }
    
    return data || [];
}

/**
 * CARREGAR SEGUINDO
 */
async function loadFollowing() {
    const { data, error } = await window.supabaseClient
        .from('seguidores')
        .select(`
            seguindo_id,
            perfis:seguindo_id (username, nome_completo, avatar_url)
        `)
        .eq('seguidor_id', profileUser.id);
    
    if (error) {
        console.error('Erro ao carregar seguindo:', error);
        return [];
    }
    
    return data || [];
}

/**
 * MOSTRAR SEGUIDORES
 */
async function showFollowers() {
    const followers = await loadFollowers();
    const modal = document.getElementById('followersModal');
    const list = document.getElementById('followersList');
    const title = document.getElementById('followersModalTitle');
    
    if (modal && list) {
        title.textContent = 'Seguidores';
        
        if (followers.length === 0) {
            list.innerHTML = '<div class="empty-list">Nenhum seguidor ainda</div>';
        } else {
            list.innerHTML = followers.map(f => `
                <div class="follower-item" onclick="goToProfile('${f.perfis.username}')">
                    <img src="${f.perfis.avatar_url || getDefaultAvatar(f.perfis.username)}" class="follower-avatar">
                    <div class="follower-info">
                        <div class="follower-username">${f.perfis.username}</div>
                        <div class="follower-name">${f.perfis.nome_completo || ''}</div>
                    </div>
                    ${!isOwnProfile && f.seguidor_id !== currentUser.id ? '<button class="btn-follow-small">Seguir</button>' : ''}
                </div>
            `).join('');
        }
        
        modal.style.display = 'block';
        
        const closeBtn = document.querySelector('.close-followers');
        if (closeBtn) {
            closeBtn.onclick = () => modal.style.display = 'none';
        }
    }
}

/**
 * MOSTRAR SEGUINDO
 */
async function showFollowing() {
    const following = await loadFollowing();
    const modal = document.getElementById('followersModal');
    const list = document.getElementById('followersList');
    const title = document.getElementById('followersModalTitle');
    
    if (modal && list) {
        title.textContent = 'Seguindo';
        
        if (following.length === 0) {
            list.innerHTML = '<div class="empty-list">Nenhum seguindo ainda</div>';
        } else {
            list.innerHTML = following.map(f => `
                <div class="follower-item" onclick="goToProfile('${f.perfis.username}')">
                    <img src="${f.perfis.avatar_url || getDefaultAvatar(f.perfis.username)}" class="follower-avatar">
                    <div class="follower-info">
                        <div class="follower-username">${f.perfis.username}</div>
                        <div class="follower-name">${f.perfis.nome_completo || ''}</div>
                    </div>
                </div>
            `).join('');
        }
        
        modal.style.display = 'block';
        
        const closeBtn = document.querySelector('.close-followers');
        if (closeBtn) {
            closeBtn.onclick = () => modal.style.display = 'none';
        }
    }
}

/**
 * COMPARTILHAR PERFIL
 */
async function shareProfile() {
    const shareData = {
        title: `${profileUser.username} no Vizu`,
        text: `Conheça o perfil de ${profileUser.nome_completo} no Vizu!`,
        url: window.location.href
    };
    
    if (navigator.share) {
        try {
            await navigator.share(shareData);
            showToast('Compartilhado!', 'success');
        } catch (err) {
            console.log('Compartilhamento cancelado');
        }
    } else {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Link copiado!', 'success');
    }
}

/**
 * CONFIGURAR TABS
 */
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            if (tabName === 'posts') {
                loadUserPosts(profileUser.id);
            } else if (tabName === 'reels') {
                loadUserReels(profileUser.id);
            } else if (tabName === 'tagged') {
                loadTaggedPosts(profileUser.id);
            }
        });
    });
}

/**
 * CARREGAR REELS DO USUÁRIO
 */
async function loadUserReels(userId) {
    const { data, error } = await window.supabaseClient
        .from('reels')
        .select('*')
        .eq('usuario_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Erro ao carregar reels:', error);
        return;
    }
    
    renderReelsGrid(data);
}

/**
 * RENDERIZAR GRID DE REELS
 */
function renderReelsGrid(reels) {
    const grid = document.getElementById('postsGrid');
    if (!grid) return;
    
    if (!reels || reels.length === 0) {
        grid.innerHTML = `
            <div class="empty-grid">
                <i class="fas fa-play-circle"></i>
                <p>Nenhum reel ainda</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = reels.map(reel => `
        <div class="grid-item" onclick="openReelDetail('${reel.id}')">
            <video src="${reel.video_url}" style="width:100%;height:100%;object-fit:cover;"></video>
            <div class="grid-overlay">
                <span><i class="fas fa-heart"></i> ${reel.curtidas || 0}</span>
                <span><i class="fas fa-comment"></i> ${reel.comentarios_count || 0}</span>
            </div>
        </div>
    `).join('');
}

/**
 * CARREGAR POSTS MARCADOS
 */
async function loadTaggedPosts(userId) {
    const { data, error } = await window.supabaseClient
        .from('marcacoes')
        .select('post_id, posts:post_id(*)')
        .eq('usuario_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Erro ao carregar posts marcados:', error);
        return;
    }
    
    const posts = data.map(d => d.posts);
    renderPostsGrid(posts);
}

/**
 * FUNÇÕES UTILITÁRIAS
 */
function getDefaultAvatar(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4ECDC4&color=fff`;
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
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
        animation: fadeInUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
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
 * INICIALIZAR PERFIL
 */
async function init() {
    console.log('🚀 Iniciando Vizu Perfil...');
    
    const user = await checkAuth();
    if (!user) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('user');
    
    if (username) {
        await loadProfile(username);
    } else {
        // Carregar próprio perfil
        const { data: profile } = await window.supabaseClient
            .from('perfis')
            .select('username')
            .eq('id', user.id)
            .single();
        
        if (profile) {
            await loadProfile(profile.username);
        }
    }
    
    setupTabs();
    
    // Eventos
    const editAvatarBtn = document.getElementById('editAvatarBtn');
    if (editAvatarBtn) {
        editAvatarBtn.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => uploadAvatar(e.target.files[0]);
            input.click();
        };
    }
    
    const editForm = document.getElementById('editProfileForm');
    if (editForm) {
        editForm.addEventListener('submit', saveProfileEdit);
    }
    
    const followersStat = document.getElementById('followersStat');
    if (followersStat) {
        followersStat.onclick = showFollowers;
    }
    
    const followingStat = document.getElementById('followingStat');
    if (followingStat) {
        followingStat.onclick = showFollowing;
    }
    
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.onclick = () => {
            window.location.href = 'feed.html';
        };
    }
    
    console.log('✅ Vizu Perfil inicializado com sucesso!');
}

// Funções globais
window.goToProfile = (username) => {
    window.location.href = `perfil.html?user=${username}`;
};

window.openPostDetail = (postId) => {
    window.location.href = `post.html?id=${postId}`;
};

window.openReelDetail = (reelId) => {
    window.location.href = `reels.html?id=${reelId}`;
};

document.addEventListener('DOMContentLoaded', init);