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

    // Fetch churches, services (paginated — Supabase caps at 1000 rows), and metadata
    var churchesPromise = supabase
      .from('churches')
      .select('*')
      .order('city', { ascending: true })
      .order('name', { ascending: true });

    // Supabase max rows per request is 1000 — paginate services
    var services1Promise = supabase
      .from('services')
      .select('*')
      .order('church_id', { ascending: true })
      .range(0, 999);

    var services2Promise = supabase
      .from('services')
      .select('*')
      .order('church_id', { ascending: true })
      .range(1000, 1999);

    var metaPromise = supabase
      .from('metadata')
      .select('*')
      .eq('key', 'parish_data_metadata')
      .single();

    var results = await Promise.all([churchesPromise, services1Promise, services2Promise, metaPromise]);

    var churchResult = results[0];
    var svc1Result = results[1];
    var svc2Result = results[2];
    var metaResult = results[3];

    if (churchResult.error) throw churchResult.error;
    if (svc1Result.error) throw svc1Result.error;
    if (svc2Result.error) throw svc2Result.error;
    if (metaResult.error) throw metaResult.error;

    var svc1Data = Array.isArray(svc1Result.data) ? svc1Result.data : [];
    var svc2Data = Array.isArray(svc2Result.data) ? svc2Result.data : [];
    if (svc2Data.length === 1000) {
      console.warn('GET /api/churches: second service batch hit 1000-row cap — data may be truncated. Add a third batch.');
    }
    var allServices = svc1Data.concat(svc2Data);

    // Group services by church_id
    var servicesByChurch = {};
    for (var i = 0; i < allServices.length; i++) {
      var s = allServices[i];
      if (!servicesByChurch[s.church_id]) {
        servicesByChurch[s.church_id] = [];
      }
      servicesByChurch[s.church_id].push(s);
    }

    // Nest services into each church
    var churchRows = Array.isArray(churchResult.data) ? churchResult.data : [];
    var churches = churchRows.map(function(c) {
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
