
import { createClient } from '@supabase/supabase-js';

// No Vercel, você configurará estas variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL || 'https://sua-url-aqui.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sua-chave-anon-aqui';

export const supabase = createClient(supabaseUrl, supabaseKey);
