#!/usr/bin/env node
/**
 * audit-urls.js
 *
 * Checks contact.website and bulletin_url for all active parishes.
 * Reports: missing, dead (DNS/connection failure), bot-blocked (403/429),
 * and redirected-to-different-domain URLs.
 *
 * Usage:
 *   node scripts/audit-urls.js
 *   node scripts/audit-urls.js --concurrency 3   (default: 5)
 *
 * Output:
 *   review/url-audit.json  — full machine-readable results
 *   Console                — grouped human-readable summary
 */

const fs    = require('fs');
const path  = require('path');
const http  = require('http');
const https = require('https');

const ROOT      = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'parish_data.json');
const OUT_FILE  = path.join(ROOT, 'review', 'url-audit.json');

const args        = process.argv.slice(2);
const CONCURRENCY = parseInt(args[args.indexOf('--concurrency') + 1] || '5', 10);
const TIMEOUT_MS  = 12000;
const MAX_HOPS    = 6;

const data     = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const parishes = (data.parishes || []).filter(p => p.status === 'active');
const today    = new Date().toISOString().slice(0, 10);

// Strip www. for loose domain comparison (www.foo.org === foo.org)
function baseHost(hostname) {
  return hostname.replace(/^www\./, '').toLowerCase();
}

// ── Single URL check ──────────────────────────────────────────────────────────
function checkUrl(rawUrl) {
  return new Promise(resolve => {
    if (!rawUrl) return resolve({ status: 'MISSING', url: null });

    let parsed;
    try { parsed = new URL(rawUrl); } catch (e) {
      return resolve({ status: 'INVALID', url: rawUrl, error: 'Not a valid URL' });
    }

    const originalBase = baseHost(parsed.hostname);

    function attempt(targetUrl, hopsLeft) {
      if (hopsLeft === 0) {
        return resolve({
          status: 'REDIRECTED', url: rawUrl, final_url: targetUrl,
          note: 'Max redirects reached'
        });
      }

      let t;
      try { t = new URL(targetUrl); } catch (e) {
        return resolve({ status: 'DEAD', url: rawUrl, error: 'Bad redirect URL: ' + targetUrl });
      }

      const lib = t.protocol === 'https:' ? https : http;
      let settled = false;

      const req = lib.request(
        {
          hostname: t.hostname,
          path:     t.pathname + t.search,
          port:     t.port || (t.protocol === 'https:' ? 443 : 80),
          method:   'HEAD',
          headers: {
            'User-Agent': 'MassFinder-bot/1.0 (parish schedule audit; github.com/monsballoon-hue/MassFinder)',
            'Accept': 'text/html,application/xhtml+xml'
          },
          timeout: TIMEOUT_MS
        },
        res => {
          if (settled) return;
          settled = true;
          // Consume response so the socket is released
          res.resume();

          const code     = res.statusCode;
          const location = res.headers.location;

          // Follow redirects
          if ([301, 302, 303, 307, 308].includes(code) && location) {
            let next = location;
            if (next.startsWith('/')) next = t.origin + next;
            return attempt(next, hopsLeft - 1);
          }

          const finalBase     = baseHost(t.hostname);
          const domainChanged = finalBase !== originalBase;

          if (code === 403 || code === 429) {
            return resolve({
              status:         'BLOCKED',
              url:            rawUrl,
              http_code:      code,
              domain_changed: domainChanged,
              final_url:      domainChanged ? targetUrl : undefined,
              note:           'Bot-protection likely — site is probably live'
            });
          }

          if (code >= 200 && code < 400) {
            if (domainChanged) {
              return resolve({
                status:    'REDIRECTED',
                url:       rawUrl,
                http_code: code,
                final_url: targetUrl,
                note:      'Redirected to a different domain — verify it is the right parish'
              });
            }
            return resolve({ status: 'LIVE', url: rawUrl, http_code: code });
          }

          return resolve({ status: 'DEAD', url: rawUrl, http_code: code });
        }
      );

      req.on('timeout', () => {
        if (settled) return;
        settled = true;
        req.destroy();
        resolve({ status: 'DEAD', url: rawUrl, error: 'TIMEOUT' });
      });

      req.on('error', e => {
        if (settled) return;
        settled = true;
        const kind =
          e.code === 'ENOTFOUND'     ? 'DNS_FAILURE'         :
          e.code === 'ECONNREFUSED'  ? 'CONNECTION_REFUSED'  :
          e.code === 'ECONNRESET'    ? 'CONNECTION_RESET'    :
          e.code === 'CERT_HAS_EXPIRED' ? 'CERT_EXPIRED'     :
          'NETWORK_ERROR';
        resolve({ status: 'DEAD', url: rawUrl, error: kind + (e.code !== kind ? ' (' + e.code + ')' : '') });
      });

      req.end();
    }

    attempt(rawUrl, MAX_HOPS);
  });
}

// ── Concurrency pool ──────────────────────────────────────────────────────────
async function runPool(tasks, concurrency) {
  const results = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  MassFinder URL Audit — ' + today);
  console.log('  Active parishes: ' + parishes.length + '   Concurrency: ' + CONCURRENCY);
  console.log('══════════════════════════════════════════════════════════════\n');

  let completed = 0;

  const tasks = parishes.map(p => async () => {
    const [webResult, bulletinResult] = await Promise.all([
      checkUrl(p.contact && p.contact.website),
      checkUrl(p.bulletin_url)
    ]);
    completed++;
    process.stdout.write('\r  Checking... ' + completed + '/' + parishes.length);
    return { parish: p, website: webResult, bulletin: bulletinResult };
  });

  const results = await runPool(tasks, CONCURRENCY);
  console.log('\n');

  // ── Categorize ────────────────────────────────────────────────────────────
  const GOOD = s => s === 'LIVE' || s === 'BLOCKED';

  const missingBoth     = results.filter(r => r.website.status === 'MISSING' && r.bulletin.status === 'MISSING');
  const missingBulletin = results.filter(r => GOOD(r.website.status) && r.bulletin.status === 'MISSING');
  const missingWebsite  = results.filter(r => r.website.status === 'MISSING' && GOOD(r.bulletin.status));
  const deadUrls        = results.filter(r => r.website.status === 'DEAD' || r.bulletin.status === 'DEAD');
  const redirected      = results.filter(r => r.website.status === 'REDIRECTED' || r.bulletin.status === 'REDIRECTED');
  const blocked         = results.filter(r =>
    (r.website.status === 'BLOCKED' || r.bulletin.status === 'BLOCKED') &&
    r.website.status !== 'DEAD' && r.bulletin.status !== 'DEAD'
  );
  const allGood         = results.filter(r => GOOD(r.website.status) && GOOD(r.bulletin.status));

  // ── Console output ────────────────────────────────────────────────────────
  function section(title, items, detail) {
    if (!items.length) return;
    console.log('  ── ' + title + ' (' + items.length + ') ' + '─'.repeat(Math.max(0, 50 - title.length - String(items.length).length)));
    items.forEach(r => {
      console.log('  · ' + r.parish.name + ' — ' + r.parish.town + ', ' + r.parish.state + ' (' + r.parish.id + ')');
      if (detail) detail(r);
    });
    console.log();
  }

  section('MISSING BOTH URLS — needs full research', missingBoth);

  section('MISSING BULLETIN URL', missingBulletin, r => {
    console.log('    website: ' + r.website.url + ' [' + r.website.status + ']');
  });

  section('MISSING WEBSITE URL', missingWebsite, r => {
    console.log('    bulletin: ' + r.bulletin.url + ' [' + r.bulletin.status + ']');
  });

  section('DEAD URLS — DNS failure, timeout, or server error', deadUrls, r => {
    if (r.website.status === 'DEAD')
      console.log('    website:  ' + r.website.url + '\n              → ' + (r.website.error || 'HTTP ' + r.website.http_code));
    if (r.bulletin.status === 'DEAD')
      console.log('    bulletin: ' + r.bulletin.url + '\n              → ' + (r.bulletin.error || 'HTTP ' + r.bulletin.http_code));
  });

  section('REDIRECTED TO DIFFERENT DOMAIN — verify correct parish', redirected, r => {
    if (r.website.status === 'REDIRECTED')
      console.log('    website:\n      was:  ' + r.website.url + '\n      now:  ' + r.website.final_url);
    if (r.bulletin.status === 'REDIRECTED')
      console.log('    bulletin:\n      was:  ' + r.bulletin.url + '\n      now:  ' + r.bulletin.final_url);
  });

  section('BOT-BLOCKED — probably live, spot-check a few', blocked, r => {
    if (r.website.status === 'BLOCKED')  console.log('    website:  ' + r.website.url + ' [HTTP ' + r.website.http_code + ']');
    if (r.bulletin.status === 'BLOCKED') console.log('    bulletin: ' + r.bulletin.url + ' [HTTP ' + r.bulletin.http_code + ']');
  });

  console.log('  ── SUMMARY ' + '─'.repeat(52));
  console.log('  Total active parishes:          ' + parishes.length);
  console.log('  Both URLs present & reachable:  ' + allGood.length);
  console.log('  Missing bulletin URL:           ' + missingBulletin.length);
  console.log('  Missing website URL:            ' + missingWebsite.length);
  console.log('  Missing both:                   ' + missingBoth.length);
  console.log('  Dead URLs:                      ' + deadUrls.length);
  console.log('  Redirected (different domain):  ' + redirected.length);
  console.log('  Bot-blocked (likely live):      ' + blocked.length);
  console.log();

  // ── Write JSON ────────────────────────────────────────────────────────────
  const out = {
    generated: today,
    summary: {
      total_active:       parishes.length,
      both_reachable:     allGood.length,
      missing_bulletin:   missingBulletin.length,
      missing_website:    missingWebsite.length,
      missing_both:       missingBoth.length,
      dead:               deadUrls.length,
      redirected:         redirected.length,
      blocked:            blocked.length
    },
    needs_attention: [
      ...missingBoth,
      ...missingBulletin,
      ...missingWebsite,
      ...deadUrls,
      ...redirected
    ].map(r => ({ id: r.parish.id, name: r.parish.name, website: r.website, bulletin: r.bulletin })),
    all: results.map(r => ({
      id:      r.parish.id,
      name:    r.parish.name,
      town:    r.parish.town + ', ' + r.parish.state,
      website: r.website,
      bulletin: r.bulletin
    }))
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log('  Full results: review/url-audit.json\n');
}

main().catch(e => { console.error(e); process.exit(1); });
