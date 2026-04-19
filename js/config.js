/**
 * VIZU - CONFIGURAÇÃO DO SUPABASE
 */

const SUPABASE_URL = 'https://roxxzvsqdigilfjygved.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vHOFMn7VUPl37vNFDIRxnw_G4p2Z8SW';

// Criar o cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// EXPORTAR PARA USO GLOBAL
window.supabaseClient = supabase;

console.log('📦 Configuração do Supabase carregada');
console.log('📍 URL:', SUPABASE_URL);
