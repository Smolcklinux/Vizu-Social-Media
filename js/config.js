/**
 * ============================================
 * VIZU - CONFIGURAÇÃO DO SUPABASE
 * Arquivo responsável por conectar ao banco de dados
 * ============================================
 */

// ========== CREDENCIAIS DO SUPABASE ==========
// URL do seu projeto Supabase
const SUPABASE_URL = 'https://roxxzvsqdigilfjygved.supabase.co';

// Chave pública (pode ficar no frontend, é segura)
const SUPABASE_ANON_KEY = 'sb_publishable_vHOFMn7VUPl37vNFDIRxnw_G4p2Z8SW';

// ========== INICIALIZAR CLIENTE SUPABASE ==========
// Cria uma instância do cliente Supabase para fazer requisições
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== FUNÇÃO PARA TESTAR CONEXÃO ==========
// Verifica se o Supabase está conectado corretamente
async function testSupabaseConnection() {
  try {
    // Tenta buscar a contagem de perfis (consulta leve)
    const { data, error } = await supabase.from('perfis').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Erro na conexão Supabase:', error);
      return false;
    }
    
    console.log('✅ Supabase conectado com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar Supabase:', error);
    return false;
  }
}

// ========== FUNÇÃO PARA VERIFICAR AUTENTICAÇÃO ==========
async function checkAuthStatus() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Erro ao verificar sessão:', error);
    return null;
  }
  
  return session;
}

// ========== EXPORTAR PARA USO GLOBAL ==========
// Torna as variáveis acessíveis em outros arquivos
window.supabaseClient = supabase;
window.testSupabaseConnection = testSupabaseConnection;
window.checkAuthStatus = checkAuthStatus;

// ========== LOG DE INICIALIZAÇÃO ==========
console.log('📦 Configuração do Supabase carregada');
console.log('📍 URL:', SUPABASE_URL);
console.log('🔑 API Key configurada');