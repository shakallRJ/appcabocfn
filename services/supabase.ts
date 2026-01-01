
import { createClient } from '@supabase/supabase-js';

// No Vercel, você configurará estas variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL ||'postgresql://postgres:123marinha123@db.ocoobqyxxhcpbuqoreay.supabase.co:5432/postgres';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sua-chave-anon-aqui';

export const supabase = createClient(supabaseUrl, supabaseKey);
