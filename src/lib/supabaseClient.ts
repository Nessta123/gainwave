import { createBrowserClient } from '@supabase/ssr';

// Ključi morajo biti v narekovajih, vendar NE po piki od process.env
const supabaseUrl = 'https://knfnxxldjpvlemffhdnu.supabase.co';
const supabaseAnonKey = 'sb_publishable_1_2h7UfRlvRxnDkyMFLJRg_Is3BHZBp';

export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
);