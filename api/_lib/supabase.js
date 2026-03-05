// api/_lib/supabase.js
// Shared Supabase client for Vercel serverless functions.
// Uses service_role key for server-side reads (bypasses RLS).

var { createClient } = require('@supabase/supabase-js');

var _client = null;

function getSupabase() {
  if (!_client) {
    var url = process.env.SUPABASE_URL;
    var key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    _client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
  return _client;
}

module.exports = { getSupabase };
