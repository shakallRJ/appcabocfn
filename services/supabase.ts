
import { createClient } from '@supabase/supabase-js';

/**
 * CONFIGURAÇÃO GLOBAL DO SUPABASE
 * Utilizando a URL do projeto e a chave anon pública para permitir que todos os
 * combatentes compartilhem o mesmo Quadro de Honra.
 */

const supabaseUrl = process.env.SUPABASE_URL || 'https://ocoobqyxxhcpbuqoreay.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_C-U5yz_vricL-YqAfvv23g__rXAOInD';

export const supabase = createClient(supabaseUrl, supabaseKey);
