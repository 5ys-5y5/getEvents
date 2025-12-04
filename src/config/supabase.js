import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Lazy initialization - allows encrypted env vars to be loaded first
let supabaseInstance = null;
let initializationAttempted = false;

/**
 * Get Supabase client with lazy initialization
 * This allows encrypted environment variables to be loaded before initialization
 */
function getSupabaseClient() {
  // Return cached instance if already initialized
  if (supabaseInstance !== null || initializationAttempted) {
    return supabaseInstance;
  }

  // Mark that we've attempted initialization
  initializationAttempted = true;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const useDatabase = process.env.USE_DATABASE !== 'false';

  if (!useDatabase) {
    console.log('[Supabase] USE_DATABASE=false, skipping initialization');
    console.log('[Supabase] Database features will be disabled');
    return null;
  }

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase credentials not found');
    console.warn('   Set SUPABASE_URL and SUPABASE_ANON_KEY in .env file or via Control Panel');
    console.warn('   Database features will be disabled until credentials are provided');
    console.warn('   You can still use Control Panel to set up environment variables');
    return null;
  }

  try {
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application-name': 'getEvents-api'
        }
      }
    });
    console.log('✅ Supabase connected');
    return supabaseInstance;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    console.warn('   Database features will be disabled');
    return null;
  }
}

// Export getter function instead of direct instance
// This enables lazy initialization after encrypted env vars are loaded
export const supabase = new Proxy({}, {
  get(target, prop) {
    const client = getSupabaseClient();
    if (client === null) {
      return null;
    }
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
