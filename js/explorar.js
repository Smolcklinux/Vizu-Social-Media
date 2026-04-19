/**
 * ============================================
 * VIZU - PÁGINA EXPLORAR
 * Descobrir novos conteúdos e usuários
 * ============================================
 */

let currentUser = null;
let currentCategory = 'all';
let searchTimeout = null;

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
 * CARREGAR CONTEÚDO EXPLORAR
 */
async function loadExploreContent(category = 'all', searchQuery = '') {
    showLoading('Carregando...');
    
    let query = window.supabaseClient
        .from('posts')
        .select(`
            *,
            perfis:usuario_id (username, avatar_url)
        `);
    
    // Filtrar por categoria
    if (category === 'trending') {
        query = query.order('curtidas', { ascending: false });
    } else if (category === 'recent') {
        query = query.order('created_at', { ascending: false });
    } else if (category === 'following') {
        const { data: following } = await window.supabaseClient
            .from('seguidores')
            .select('seguindo_id')
            .eq('seguidor_id', currentUser.id);
        
        const followingIds = following.map(f => f.seguindo_id);
        if (followingIds.length > 0) {
            query = query.in('usuario_id', followingIds);
        } else {
            query = query.limit(0);
        }
    } else {
        query = query.order('created_at', { ascending: false });
    }
    
    // Filtrar por pesquisa
    if (searchQuery) {
        query = query.ilike('legenda', `%${searchQuery}%`);
    }
    
    const { data, error } = await query.limit(30);
    
    hideLoading();
    
    if (error) {
        console.error('Erro ao carregar explorar:', error);
        return;
    }
    
    renderExploreGrid(data);
}

/**
 * RENDERIZAR GRID EXPLORAR
 */
function renderExploreGrid(posts) {
    const grid = document.getElementById('exploreGrid');
    if (!grid) return;
    
    if (!posts || posts.length === 0) {
        grid.innerHTML = `
            <div class="empty-explore">
                <i class="fas fa-compass"></i>
                <h3>Nada encontrado</h3>
                <p>Tente buscar por outro termo</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = posts.map(post => `
        <div class="explore-item" onclick="openQuickPost('${post.id}')">
            <img src="${post.imagem_url}" alt="Post" loading="lazy">
            <div class="explore-overlay">
                <div class="explore-stats">
                    <span><i class="fas fa-heart"></i> ${post.curtidas || 0}</span>
                    <span><i class="fas fa-comment"></i> ${post.comentarios_count || 0}</span>
                </div>
                <div class="explore-user">
                    <img src="${post.perfis.avatar_url || 'https://ui-avatars.com/api/?name=' + post.perfis.username}" class="explore-avatar">
                    <span>${post.perfis.username}</span>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * BUSCAR USUÁRIOS
 */
async function searchUsers(query) {
    if (!query || query.length < 2) {
        document.getElementById('searchResults')?.classList.add('hidden');
        return;
    }
    
    const { data, error } = await window.supabaseClient
        .from('perfis')
        .select('username, nome_completo, avatar_url')
        .or(`username.ilike.%${query}%,nome_completo.ilike.%${query}%`)
        .limit(10);
    
    if (error) {
        console.error('Erro ao buscar usuários:', error);
        return;
    }
    
    renderSearchResults(data);
}

/**
 * RENDERIZAR RESULTADOS DA BUSCA
 */
function renderSearchResults(users) {
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;
    
    if (users.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">Nenhum usuário encontrado</div>';
    } else {
        resultsContainer.innerHTML = users.map(user => `
            <div class="search-result-item" onclick="goToProfile('${user.username}')">
                <img src="${user.avatar_url || getDefaultAvatar(user.username)}" class="search-result-avatar">
                <div class="search-result-info">
                    <div class="search-result-username">${user.username}</div>
                    <div class="search-result-name">${user.nome_completo || ''}</div>
                </div>
            </div>
        `).join('');
    }
    
    resultsContainer.classList.remove('hidden');
}

/**
 * ABRIR POST RÁPIDO
 */
async function openQuickPost(postId) {
    const { data, error } = await window.supabaseClient
        .from('posts')
        .select(`
            *,
            perfis:usuario_id (username, avatar_url)
        `)
        .eq('id', postId)
        .single();
    
    if (error) {
        console.error('Erro ao carregar post:', error);
        return;
    }
    
    const modal = document.getElementById('quickPostModal');
    if (modal) {
        document.getElementById('quickPostImage').src = data.imagem_url;
        document.getElementById('quickPostAvatar').src = data.perfis.avatar_url || getDefaultAvatar(data.perfis.username);
        document.getElementById('quickPostUsername').textContent = data.perfis.username;
        document.getElementById('quickPostLikes').textContent = data.curtidas || 0;
        document.getElementById('quickPostComments').textContent = data.comentarios_count || 0;
        
        modal.style.display = 'block';
        
        const closeBtn = document.querySelector('.close-quick');
        if (closeBtn) {
            closeBtn.onclick = () => modal.style.display = 'none';
        }
    }
}

/**
 * CONFIGURAR CATEGORIAS
 */
function setupCategories() {
    const categories = document.querySelectorAll('.category');
    categories.forEach(cat => {
        cat.addEventListener('click', () => {
            categories.forEach(c => c.classList.remove('active'));
            cat.classList.add('active');
            
            currentCategory = cat.dataset.category;
            loadExploreContent(currentCategory);
        });
    });
}

/**
 * CONFIGURAR BUSCA
 */
function setupSearch() {
    const searchButton = document.getElementById('searchButton');
    const searchBar = document.getElementById('searchBar');
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    
    if (searchButton) {
        searchButton.onclick = () => {
            searchBar.style.display = searchBar.style.display === 'none' ? 'block' : 'none';
            if (searchBar.style.display === 'block') {
                searchInput.focus();
            }
        };
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            if (searchTimeout) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = e.target.value;
                if (query) {
                    loadExploreContent('all', query);
                } else {
                    loadExploreContent(currentCategory);
                }
            }, 500);
        });
    }
    
    if (clearSearch) {
        clearSearch.onclick = () => {
            searchInput.value = '';
            loadExploreContent(currentCategory);
        };
    }
}

/**
 * FUNÇÕES UTILITÁRIAS
 */
function getDefaultAvatar(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4ECDC4&color=fff`;
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
 * INICIALIZAR EXPLORAR
 */
async function init() {
    console.log('🚀 Iniciando Vizu Explorar...');
    
    const user = await checkAuth();
    if (!user) return;
    
    await loadExploreContent('all');
    setupCategories();
    setupSearch();
    
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.onclick = () => {
            window.location.href = 'feed.html';
        };
    }
    
    console.log('✅ Vizu Explorar inicializado com sucesso!');
}

// Funções globais
window.goToProfile = (username) => {
    window.location.href = `perfil.html?user=${username}`;
};

window.openQuickPost = openQuickPost;

document.addEventListener('DOMContentLoaded', init);