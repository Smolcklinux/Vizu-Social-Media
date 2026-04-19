/**
 * ============================================
 * VIZU - SISTEMA DE AUTENTICAÇÃO
 * Gerencia login, cadastro, logout e recuperação de senha
 * ============================================
 */

// ========== VARIÁVEIS GLOBAIS ==========
let currentSession = null;
let currentUser = null;

/**
 * VERIFICAR AUTENTICAÇÃO
 * Checa se o usuário está logado
 */
async function checkAuth() {
    const { data: { session }, error } = await window.supabaseClient.auth.getSession();
    
    if (error) {
        console.error('❌ Erro ao verificar autenticação:', error);
        return null;
    }
    
    if (session) {
        currentSession = session;
        currentUser = session.user;
        console.log('✅ Usuário logado:', currentUser.email);
        return currentUser;
    }
    
    console.log('⚠️ Nenhum usuário logado');
    return null;
}

/**
 * FUNÇÃO DE LOGIN
 * @param {string} emailOrUsername - Email ou nome de usuário
 * @param {string} password - Senha
 */
async function login(emailOrUsername, password) {
    let email = emailOrUsername;
    
    // Se não tiver @, assume que é username
    if (!emailOrUsername.includes('@')) {
        const { data, error } = await window.supabaseClient
            .from('perfis')
            .select('id')
            .eq('username', emailOrUsername)
            .single();
            
        if (data && !error) {
            email = `${emailOrUsername}@vizu.com`;
        }
    }
    
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });
    
    if (error) {
        console.error('❌ Erro no login:', error);
        return { success: false, error: error.message };
    }
    
    if (data.user) {
        currentSession = data.session;
        currentUser = data.user;
        console.log('✅ Login realizado com sucesso!');
        return { success: true, user: data.user };
    }
    
    return { success: false, error: 'Erro desconhecido' };
}

/**
 * FUNÇÃO DE CADASTRO
 * @param {string} fullName - Nome completo
 * @param {string} username - Nome de usuário
 * @param {string} email - Email
 * @param {string} password - Senha
 */
async function signup(fullName, username, email, password) {
    const { data, error } = await window.supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: fullName,
                username: username
            }
        }
    });
    
    if (error) {
        console.error('❌ Erro no cadastro:', error);
        return { success: false, error: error.message };
    }
    
    if (data.user) {
        const { error: profileError } = await window.supabaseClient
            .from('perfis')
            .insert([{
                id: data.user.id,
                username: username,
                nome_completo: fullName,
                avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4ECDC4&color=fff`,
                seguidores: 0,
                seguindo: 0,
                bio: 'Bem-vindo ao Vizu! 👋'
            }]);
            
        if (profileError) {
            console.error('❌ Erro ao criar perfil:', profileError);
        } else {
            console.log('✅ Perfil criado com sucesso!');
        }
        
        return { success: true, user: data.user };
    }
    
    return { success: false, error: 'Erro ao criar conta' };
}

/**
 * FUNÇÃO DE LOGOUT
 */
async function logout() {
    const { error } = await window.supabaseClient.auth.signOut();
    
    if (!error) {
        currentSession = null;
        currentUser = null;
        console.log('✅ Logout realizado');
        window.location.href = 'index.html';
    } else {
        console.error('❌ Erro no logout:', error);
    }
}

/**
 * RECUPERAR SENHA
 */
async function resetPassword(email) {
    const { data, error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password.html`
    });
    
    if (error) {
        console.error('❌ Erro ao enviar email:', error);
        return { success: false, error: error.message };
    }
    
    console.log('✅ Email de recuperação enviado');
    return { success: true };
}

/**
 * ATUALIZAR SENHA
 */
async function updatePassword(newPassword) {
    const { data, error } = await window.supabaseClient.auth.updateUser({
        password: newPassword
    });
    
    if (error) {
        console.error('❌ Erro ao atualizar senha:', error);
        return { success: false, error: error.message };
    }
    
    console.log('✅ Senha atualizada com sucesso');
    return { success: true };
}

// ========== EVENTOS DA PÁGINA ==========
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const fbLogin = document.getElementById('fbLogin');
    const showSignup = document.getElementById('showSignup');
    const forgotPassword = document.getElementById('forgotPassword');
    const modal = document.getElementById('signupModal');
    const resetModal = document.getElementById('resetModal');
    const closeBtn = document.querySelector('.close');
    const closeReset = document.querySelector('.close-reset');
    const sendResetLink = document.getElementById('sendResetLink');
    
    // Evento de Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            const btn = loginForm.querySelector('.btn-login');
            const originalText = btn.textContent;
            btn.textContent = 'Entrando...';
            btn.disabled = true;
            
            const result = await login(username, password);
            
            if (result.success) {
                window.location.href = 'feed.html';
            } else {
                alert('❌ Erro: ' + result.error);
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    }
    
    // Evento de Cadastro
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullName = signupForm[0].value;
            const username = signupForm[1].value;
            const email = signupForm[2].value;
            const password = signupForm[3].value;
            
            if (password.length < 6) {
                alert('A senha deve ter no mínimo 6 caracteres');
                return;
            }
            
            const result = await signup(fullName, username, email, password);
            
            if (result.success) {
                alert('✅ Cadastro realizado! Faça login.');
                if (modal) modal.style.display = 'none';
                if (loginForm) loginForm.reset();
            } else {
                alert('❌ Erro: ' + result.error);
            }
        });
    }
    
    // Abrir modal de cadastro
    if (showSignup) {
        showSignup.onclick = () => {
            if (modal) modal.style.display = 'block';
        };
    }
    
    // Fechar modal de cadastro
    if (closeBtn) {
        closeBtn.onclick = () => {
            if (modal) modal.style.display = 'none';
        };
    }
    
    // Abrir modal de recuperar senha
    if (forgotPassword) {
        forgotPassword.onclick = (e) => {
            e.preventDefault();
            if (resetModal) resetModal.style.display = 'block';
        };
    }
    
    // Fechar modal de recuperar senha
    if (closeReset) {
        closeReset.onclick = () => {
            if (resetModal) resetModal.style.display = 'none';
        };
    }
    
    // Enviar link de recuperação
    if (sendResetLink) {
        sendResetLink.onclick = async () => {
            const email = document.getElementById('resetEmail').value;
            if (!email) {
                alert('Digite seu email');
                return;
            }
            
            const result = await resetPassword(email);
            if (result.success) {
                alert('✅ Email enviado! Verifique sua caixa de entrada.');
                if (resetModal) resetModal.style.display = 'none';
            } else {
                alert('❌ Erro: ' + result.error);
            }
        };
    }
    
    // Login com Facebook
    if (fbLogin) {
        fbLogin.onclick = () => {
            alert('🔜 Login com Facebook em breve!');
        };
    }
    
    // Fechar modal clicando fora
    window.onclick = (e) => {
        if (modal && e.target === modal) {
            modal.style.display = 'none';
        }
        if (resetModal && e.target === resetModal) {
            resetModal.style.display = 'none';
        }
    };
});

// ========== EXPORTAR FUNÇÕES ==========
window.auth = {
    checkAuth,
    login,
    signup,
    logout,
    resetPassword,
    updatePassword,
    getCurrentUser: () => currentUser,
    getCurrentSession: () => currentSession
};

console.log('🔐 Sistema de autenticação carregado');