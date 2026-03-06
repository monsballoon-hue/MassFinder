// api/events.js
// GET /api/events — returns all events.

var { getSupabase } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    var supabase = getSupabase();

    var eventsPromise = supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true })
      .limit(2000);

    var metaPromise = supabase
      .from('metadata')
      .select('*')
      .eq('key', 'events_metadata')
      .single();

    var results = await Promise.all([eventsPromise, metaPromise]);

    var eventResult = results[0];
    var metaResult = results[1];

    if (eventResult.error) throw eventResult.error;
    if (metaResult.error) throw metaResult.error;

    var metadata = metaResult.data ? metaResult.data.data : {};

    res.status(200).json({
      metadata: metadata,
      events: Array.isArray(eventResult.data) ? eventResult.data : []
    });
  } catch (err) {
    console.error('GET /api/events error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
