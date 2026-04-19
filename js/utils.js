/**
 * ============================================
 * VIZU - FUNÇÕES UTILITÁRIAS
 * Funções reutilizáveis em todo o app
 * ============================================
 */

/**
 * FORMATAR DATA PARA EXIBIÇÃO
 */
function formatDate(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    if (diff < 60000) return 'agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
    
    return d.toLocaleDateString('pt-BR');
}

/**
 * FORMATAR NÚMERO (1000 -> 1k)
 */
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}

/**
 * VALIDAR EMAIL
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * VALIDAR NOME DE USUÁRIO
 */
function isValidUsername(username) {
    const regex = /^[a-zA-Z0-9._]{3,30}$/;
    return regex.test(username);
}

/**
 * ESCAPAR HTML (prevenir XSS)
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * TRUNCAR TEXTO
 */
function truncateText(text, length = 100) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

/**
 * GERAR AVATAR PADRÃO
 */
function getDefaultAvatar(name = 'User') {
    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    
    return `https://ui-avatars.com/api/?name=${initials}&background=4ECDC4&color=fff&size=128`;
}

/**
 * MOSTRAR TOAST
 */
function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${getToastIcon(type)}"></i>
            <span>${escapeHtml(message)}</span>
        </div>
    `;
    
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: ${getToastColor(type)};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        animation: fadeInUp 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getToastIcon(type) {
    switch(type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        default: return 'fa-info-circle';
    }
}

function getToastColor(type) {
    switch(type) {
        case 'success': return '#4ECDC4';
        case 'error': return '#ED4956';
        default: return '#262626';
    }
}

/**
 * COPIAR TEXTO
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copiado!', 'success');
        return true;
    } catch (err) {
        console.error('Erro ao copiar:', err);
        showToast('Não foi possível copiar', 'error');
        return false;
    }
}

/**
 * DETECTAR DISPOSITIVO MÓVEL
 */
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * DEBOUNCE
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * SALVAR NO LOCALSTORAGE
 */
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Erro ao salvar:', error);
        return false;
    }
}

/**
 * CARREGAR DO LOCALSTORAGE
 */
function loadFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Erro ao carregar:', error);
        return null;
    }
}

/**
 * VALIDAR URL DE IMAGEM
 */
function isValidImageUrl(url) {
    if (!url) return false;
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
    return imageExtensions.test(url);
}

/**
 * GERAR ID ÚNICO
 */
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * DETECTAR TEMA DO SISTEMA
 */
function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * APLICAR TEMA
 */
function applyTheme(theme) {
    if (theme === 'system') {
        theme = getSystemTheme();
    }
    
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    
    saveToLocalStorage('vizu_theme', theme);
}

/**
 * CARREGAR TEMA SALVO
 */
function loadTheme() {
    const savedTheme = loadFromLocalStorage('vizu_theme') || 'light';
    applyTheme(savedTheme);
    return savedTheme;
}

// ========== EXPORTAR FUNÇÕES ==========
window.utils = {
    formatDate,
    formatNumber,
    isValidEmail,
    isValidUsername,
    escapeHtml,
    truncateText,
    getDefaultAvatar,
    showToast,
    copyToClipboard,
    isMobile,
    debounce,
    saveToLocalStorage,
    loadFromLocalStorage,
    isValidImageUrl,
    generateUniqueId,
    getSystemTheme,
    applyTheme,
    loadTheme
};

console.log('🛠️ Utilitários carregados');