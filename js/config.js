/**
 * VIZU - CONFIGURAÇÃO DO SUPABASE
 */

// ========== CREDENCIAIS DO SUPABASE ==========
const SUPABASE_URL = 'https://roxxzvsqdigilfjygved.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vHOFMn7VUPl37vNFDIRxnw_G4p2Z8SW';

// ========== INICIALIZAR CLIENTE SUPABASE ==========
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========== EXPORTAR PARA USO GLOBAL (LINHA IMPORTANTE!) ==========
window.supabaseClient = supabase;

// ========== FUNÇÃO PARA TESTAR CONEXÃO ==========
async function testSupabaseConnection() {
  try {
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

window.testSupabaseConnection = testSupabaseConnection;

// ========== LOG ==========
console.log('📦 Configuração do Supabase carregada');
console.log('📍 URL:', SUPABASE_URL);
console.log('🔑 API Key configurada');