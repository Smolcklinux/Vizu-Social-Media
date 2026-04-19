/**
 * ============================================
 * VIZU - CONFIGURAÇÃO DO CLOUDINARY
 * Responsável por fazer upload de imagens para a nuvem
 * ============================================
 */

// ========== CREDENCIAIS DO CLOUDINARY ==========
// Nome da cloud (identificador único)
const CLOUDINARY_CLOUD_NAME = 'dz6aer3tp';

// Chave API (para autenticação)
const CLOUDINARY_API_KEY = '985775319428861';

// Segredo API (mantenha seguro!)
const CLOUDINARY_API_SECRET = 'pRk4e4MHBCirCMJ0CsSnZi1Jfi4';

// Nome do preset de upload (configurado no dashboard)
const CLOUDINARY_UPLOAD_PRESET = 'vizu_uploads';

// ========== CONFIGURAÇÕES DO WIDGET ==========
const cloudinaryConfig = {
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET,
    maxFiles: 1,
    maxFileSize: 10485760, // 10MB
    sources: ['local', 'camera', 'url', 'google_drive'],
    cropping: true,
    croppingAspectRatio: 1,
    croppingDefaultSelectionRatio: 0.8,
    multiple: false,
    clientAllowedFormats: ['jpg', 'png', 'jpeg', 'gif', 'webp', 'mp4', 'mov'],
    maxImageWidth: 2000,
    maxImageHeight: 2000,
    styles: {
        palette: {
            window: "#FFFFFF",
            sourceBg: "#F4F4F4",
            windowBorder: "#E8E8E8",
            tabIcon: "#4ECDC4",
            inactiveTabIcon: "#8E8E8E",
            menuIcons: "#4ECDC4",
            link: "#4ECDC4",
            action: "#9B59B6",
            inProgress: "#FF6B6B",
            complete: "#4ECDC4",
            error: "#ED4956",
            textDark: "#262626",
            textLight: "#FFFFFF"
        }
    }
};

/**
 * FUNÇÃO PRINCIPAL DE UPLOAD
 * @param {File} file - Arquivo de imagem
 * @returns {Promise} - Retorna URL da imagem ou erro
 */
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('api_key', CLOUDINARY_API_KEY);
    
    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
                method: 'POST',
                body: formData
            }
        );
        
        const data = await response.json();
        
        if (data.secure_url) {
            console.log('✅ Upload realizado:', data.secure_url);
            return {
                success: true,
                url: data.secure_url,
                public_id: data.public_id,
                width: data.width,
                height: data.height,
                format: data.format,
                bytes: data.bytes
            };
        } else {
            console.error('❌ Erro no upload:', data);
            return {
                success: false,
                error: data.error?.message || 'Upload falhou'
            };
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * UPLOAD OTIMIZADO PARA POSTS
 * Redimensiona para tamanho ideal do Instagram (1080x1080)
 */
async function uploadPostImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('api_key', CLOUDINARY_API_KEY);
    
    // Transformações para otimizar a imagem
    const transformations = 'w_1080,h_1080,c_limit,q_auto,f_auto';
    formData.append('transformation', transformations);
    
    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            { method: 'POST', body: formData }
        );
        
        const data = await response.json();
        
        if (data.secure_url) {
            return {
                success: true,
                url: data.secure_url,
                public_id: data.public_id
            };
        }
        return { success: false, error: 'Upload falhou' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * UPLOAD DE AVATAR (FOTO DE PERFIL)
 * Otimizado para 400x400px
 */
async function uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('api_key', CLOUDINARY_API_KEY);
    
    // Transformações específicas para avatar
    const transformations = 'w_400,h_400,c_thumb,g_face,q_auto,f_auto';
    formData.append('transformation', transformations);
    
    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            { method: 'POST', body: formData }
        );
        
        const data = await response.json();
        
        if (data.secure_url) {
            return {
                success: true,
                url: data.secure_url,
                public_id: data.public_id
            };
        }
        return { success: false, error: 'Upload falhou' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * UPLOAD DE VÍDEO PARA REELS
 */
async function uploadVideo(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('resource_type', 'video');
    
    const transformations = 'w_1080,h_1920,c_limit,q_auto,f_auto';
    formData.append('transformation', transformations);
    
    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
            { method: 'POST', body: formData }
        );
        
        const data = await response.json();
        
        if (data.secure_url) {
            return {
                success: true,
                url: data.secure_url,
                public_id: data.public_id,
                duration: data.duration
            };
        }
        return { success: false, error: 'Upload falhou' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * GERAR URL OTIMIZADA
 * Pega um public_id e gera URL com transformações
 */
function getOptimizedImageUrl(publicId, width = 600, height = 600) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_${width},h_${height},c_limit,q_auto,f_auto/${publicId}`;
}

/**
 * GERAR URL PARA VIDEO
 */
function getOptimizedVideoUrl(publicId) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/q_auto,f_auto/${publicId}`;
}

// ========== EXPORTAR FUNÇÕES ==========
window.cloudinary = {
    uploadToCloudinary,
    uploadPostImage,
    uploadAvatar,
    uploadVideo,
    getOptimizedImageUrl,
    getOptimizedVideoUrl,
    config: cloudinaryConfig,
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY
};

console.log('☁️ Cloudinary configurado:', CLOUDINARY_CLOUD_NAME);