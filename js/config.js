/**
 * VIZU - CONFIGURAÇÃO DO SUPABASE
 * 🔒 Use apenas a ANON KEY (pública) no frontend
 */

const SUPABASE_URL = 'https://roxxzvsqdigilfjygved.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_vHOFMn7VUPl37vNFDIRxnw_G4p2Z8SW';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabase;

console.log('✅ Supabase configurado com Anon Key');
