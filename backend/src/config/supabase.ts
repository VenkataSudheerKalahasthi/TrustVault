import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const isStorageConfigured = Boolean(
  env.SUPABASE_URL &&
    env.SUPABASE_URL !== 'https://placeholder.supabase.co' &&
    !env.SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
    env.SUPABASE_SERVICE_ROLE_KEY &&
    !env.SUPABASE_SERVICE_ROLE_KEY.includes('REPLACE_WITH_')
);

export const supabaseAdmin = isStorageConfigured
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

