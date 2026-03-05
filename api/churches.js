// api/churches.js
// GET /api/churches — returns all churches with nested services.

var { getSupabase } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    var supabase = getSupabase();

    // Fetch churches and services in parallel
    var churchesPromise = supabase
      .from('churches')
      .select('*')
      .order('city', { ascending: true })
      .order('name', { ascending: true });

    var servicesPromise = supabase
      .from('services')
      .select('*')
      .order('church_id', { ascending: true });

    var metaPromise = supabase
      .from('metadata')
      .select('*')
      .eq('key', 'parish_data_metadata')
      .single();

    var results = await Promise.all([churchesPromise, servicesPromise, metaPromise]);

    var churchResult = results[0];
    var serviceResult = results[1];
    var metaResult = results[2];

    if (churchResult.error) throw churchResult.error;
    if (serviceResult.error) throw serviceResult.error;

    // Group services by church_id
    var servicesByChurch = {};
    for (var i = 0; i < serviceResult.data.length; i++) {
      var s = serviceResult.data[i];
      if (!servicesByChurch[s.church_id]) {
        servicesByChurch[s.church_id] = [];
      }
      servicesByChurch[s.church_id].push(s);
    }

    // Nest services into each church
    var churches = churchResult.data.map(function(c) {
      c.services = servicesByChurch[c.id] || [];
      return c;
    });

    var metadata = metaResult.data ? metaResult.data.data : {};

    res.status(200).json({
      metadata: metadata,
      churches: churches
    });
  } catch (err) {
    console.error('GET /api/churches error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
