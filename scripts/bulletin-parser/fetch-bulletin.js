// fetch-bulletin.js — Download bulletin PDFs from various platforms
// Returns: { pdfBuffer, sourceUrl, sourceDomain, method }
// Methods: 'church-bulletin' (auto), 'wordpress-images' (auto), 'manual' (local file)

var https = require('https');
var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');

// Manual bulletin drop folder
var MANUAL_DIR = path.resolve(__dirname, '../../bulletins-manual');

/**
 * Fetch a bulletin for a church.
 * Tries automated methods first, falls back to manual folder.
 *
 * @param {object} church - { id, name, city, bulletin_url }
 * @param {string} [manualPath] - optional direct path to a PDF file
 * @returns {Promise<object|null>} { pdfBuffer, sourceUrl, sourceDomain, method, images? }
 */
function fetchBulletin(church, manualPath) {
  // 1. Manual override — direct PDF path
  if (manualPath) {
    return fetchManual(manualPath, church);
  }

  // 2. Check manual drop folder
  var manualFile = findManualFile(church.id);
  if (manualFile) {
    return fetchManual(manualFile, church);
  }

  if (!church.bulletin_url) {
    console.log('  [SKIP] No bulletin_url for ' + church.name);
    return Promise.resolve(null);
  }

  var parsed = url.parse(church.bulletin_url);
  var domain = parsed.hostname || '';

  // 3. church-bulletin.org — predictable PDF pattern
  if (domain === 'church-bulletin.org') {
    return fetchChurchBulletinOrg(church);
  }

  // 4. parishesonline.com (LPi) — API-based PDF lookup
  if (domain === 'parishesonline.com') {
    return fetchLpi(church);
  }

  // 5. WordPress — scrape post images
  if (domain.indexOf('wordpress.com') !== -1) {
    return fetchWordPressBulletin(church);
  }

  // 6. All other sites — check manual folder, otherwise skip
  console.log('  [MANUAL] ' + church.name + ' (' + domain + ') — drop PDF in bulletins-manual/' + church.id + '.pdf');
  return Promise.resolve(null);
}

/**
 * church-bulletin.org: {id}/{YYYY-MM-DD}.pdf
 * The ID is in the query string: ?id=907
 */
function fetchChurchBulletinOrg(church) {
  var parsed = url.parse(church.bulletin_url, true);
  var cbId = parsed.query.id;
  if (!cbId) {
    console.log('  [ERROR] No id param in church-bulletin.org URL: ' + church.bulletin_url);
    return Promise.resolve(null);
  }

  // Try this Sunday and last Sunday
  var dates = getRecentSundays(2);
  return tryDates(dates, 0);

  function tryDates(dates, i) {
    if (i >= dates.length) {
      console.log('  [ERROR] No bulletin found at church-bulletin.org for ' + church.name);
      return Promise.resolve(null);
    }
    var dateStr = dates[i];
    var pdfUrl = 'https://church-bulletin.org/' + cbId + '/' + dateStr + '.pdf';
    console.log('  [TRY] ' + pdfUrl);

    return httpGet(pdfUrl).then(function(result) {
      if (result.statusCode === 200 && result.buffer.length > 1000) {
        console.log('  [OK] Downloaded ' + (result.buffer.length / 1024).toFixed(0) + ' KB');
        return {
          pdfBuffer: result.buffer,
          sourceUrl: pdfUrl,
          sourceDomain: 'church-bulletin.org',
          method: 'church-bulletin',
          bulletinDate: dateStr,
        };
      }
      return tryDates(dates, i + 1);
    }).catch(function() {
      return tryDates(dates, i + 1);
    });
  }
}

/**
 * parishesonline.com (LPi): two-step API lookup.
 * 1. GET /organizations/slug/{slug} → salesforce_id
 * 2. GET /organizations/{sfid}/publications?limit=1&type=Church → fileUrl
 * 3. Download PDF from fileUrl
 */
var LPI_API_BASE = 'https://f2141mdwk2.execute-api.us-east-1.amazonaws.com/prod';

function fetchLpi(church) {
  // Extract slug from URL: /organization/<slug> or /find/<slug>
  var parsed = url.parse(church.bulletin_url);
  var pathParts = (parsed.pathname || '').split('/').filter(Boolean);
  // Expect ["organization", slug] or ["find", slug]
  var slug = pathParts.length >= 2 ? pathParts[pathParts.length - 1] : null;
  if (!slug) {
    console.log('  [ERROR] Could not parse LPi slug from: ' + church.bulletin_url);
    return Promise.resolve(null);
  }

  // Strip fragment/hash (e.g. #download-latest)
  slug = slug.replace(/#.*$/, '');

  console.log('  [LPi] Looking up slug: ' + slug);

  // Step 1: Get salesforce_id
  return httpGet(LPI_API_BASE + '/organizations/slug/' + slug).then(function(orgResult) {
    if (orgResult.statusCode !== 200) {
      console.log('  [ERROR] LPi org lookup returned ' + orgResult.statusCode);
      return null;
    }

    var orgData;
    try {
      orgData = JSON.parse(orgResult.buffer.toString('utf8'));
    } catch (e) {
      console.log('  [ERROR] Could not parse LPi org response');
      return null;
    }

    var sfid = orgData.data && orgData.data.salesforce_id;
    if (!sfid) {
      console.log('  [ERROR] No salesforce_id in LPi org response');
      return null;
    }

    // Step 2: Get latest bulletin
    var pubUrl = LPI_API_BASE + '/organizations/' + sfid + '/publications?limit=1&type=Church';
    return httpGet(pubUrl).then(function(pubResult) {
      if (pubResult.statusCode !== 200) {
        console.log('  [ERROR] LPi publications API returned ' + pubResult.statusCode);
        return null;
      }

      var pubData;
      try {
        pubData = JSON.parse(pubResult.buffer.toString('utf8'));
      } catch (e) {
        console.log('  [ERROR] Could not parse LPi publications response');
        return null;
      }

      var pubs = pubData.data || [];
      if (pubs.length === 0) {
        console.log('  [ERROR] No bulletins found for ' + church.name);
        return null;
      }

      var latest = pubs[0];
      var fileUrl = latest.fileUrl;
      if (!fileUrl) {
        console.log('  [ERROR] No fileUrl in LPi publication');
        return null;
      }

      // Extract bulletin date from publishDate (YYYY-MM-DD)
      var bulletinDate = null;
      if (latest.publishDate) {
        bulletinDate = latest.publishDate.substring(0, 10);
      }

      console.log('  [LPi] Downloading: ' + latest.name + ' (' + bulletinDate + ')');

      // Step 3: Download PDF
      return httpGet(fileUrl).then(function(pdfResult) {
        if (pdfResult.statusCode !== 200 || pdfResult.buffer.length < 1000) {
          console.log('  [ERROR] LPi PDF download failed (status ' + pdfResult.statusCode + ')');
          return null;
        }

        console.log('  [OK] Downloaded ' + (pdfResult.buffer.length / 1024).toFixed(0) + ' KB');
        return {
          pdfBuffer: pdfResult.buffer,
          sourceUrl: fileUrl,
          sourceDomain: 'parishesonline.com',
          method: 'lpi',
          bulletinDate: bulletinDate,
        };
      });
    });
  }).catch(function(err) {
    console.log('  [ERROR] LPi fetch failed: ' + err.message);
    return null;
  });
}

/**
 * WordPress bulletin: scrape the latest post for embedded images.
 * Returns images array instead of pdfBuffer.
 */
function fetchWordPressBulletin(church) {
  var categoryUrl = church.bulletin_url;
  console.log('  [WP] Fetching category page: ' + categoryUrl);

  return httpGet(categoryUrl).then(function(result) {
    if (result.statusCode !== 200) {
      console.log('  [ERROR] WordPress category page returned ' + result.statusCode);
      return null;
    }

    var html = result.buffer.toString('utf8');

    // Find the latest bulletin post link
    var postPattern = /href="(https:\/\/[^"]*\/\d{4}\/\d{2}\/\d{2}\/bulletin[^"]*)"/i;
    var match = html.match(postPattern);
    if (!match) {
      console.log('  [ERROR] No bulletin post link found on WordPress category page');
      return null;
    }

    var postUrl = match[1];
    console.log('  [WP] Latest post: ' + postUrl);

    return httpGet(postUrl).then(function(postResult) {
      if (postResult.statusCode !== 200) return null;

      var postHtml = postResult.buffer.toString('utf8');

      // Extract all content images (not logos/icons)
      var imgPattern = /data-orig-file="(https:\/\/[^"]*\/wp-content\/uploads\/[^"]*\.(png|jpe?g))[^"]*"/gi;
      var images = [];
      var imgMatch;
      while ((imgMatch = imgPattern.exec(postHtml)) !== null) {
        var imgUrl = imgMatch[1];
        // Skip small images (logos, icons)
        var sizeMatch = postHtml.substring(imgMatch.index - 200, imgMatch.index + imgMatch[0].length + 200);
        var origSize = sizeMatch.match(/data-orig-size="(\d+),(\d+)"/);
        if (origSize) {
          var w = parseInt(origSize[1]);
          var h = parseInt(origSize[2]);
          if (w < 300 && h < 300) continue; // skip small images
        }
        images.push(imgUrl);
      }

      if (images.length === 0) {
        // Fallback: look for regular img src in post content
        var simpleImgPattern = /src="(https:\/\/[^"]*\/wp-content\/uploads\/\d{4}\/\d{2}\/[^"]*\.(png|jpe?g))[^"]*"/gi;
        while ((imgMatch = simpleImgPattern.exec(postHtml)) !== null) {
          images.push(imgMatch[1].replace(/\?w=\d+/, ''));
        }
      }

      // Deduplicate
      var seen = {};
      images = images.filter(function(u) {
        if (seen[u]) return false;
        seen[u] = true;
        return true;
      });

      if (images.length === 0) {
        console.log('  [ERROR] No bulletin images found in WordPress post');
        return null;
      }

      // Extract bulletin date from post URL
      var dateMatch = postUrl.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
      var bulletinDate = dateMatch ? dateMatch[1] + '-' + dateMatch[2] + '-' + dateMatch[3] : null;

      console.log('  [OK] Found ' + images.length + ' bulletin images');
      return {
        pdfBuffer: null,
        images: images,  // URLs to download later
        sourceUrl: postUrl,
        sourceDomain: 'wordpress.com',
        method: 'wordpress-images',
        bulletinDate: bulletinDate,
      };
    });
  });
}

/**
 * Read a PDF from the manual drop folder.
 */
function fetchManual(filePath, church) {
  try {
    var buffer = fs.readFileSync(filePath);
    console.log('  [MANUAL] Loaded ' + (buffer.length / 1024).toFixed(0) + ' KB from ' + path.basename(filePath));
    return Promise.resolve({
      pdfBuffer: buffer,
      sourceUrl: 'file://' + filePath,
      sourceDomain: 'manual',
      method: 'manual',
      bulletinDate: null,
    });
  } catch (e) {
    console.log('  [ERROR] Could not read manual file: ' + filePath);
    return Promise.resolve(null);
  }
}

/**
 * Check if there's a manual PDF for this church ID.
 * Looks for: bulletins-manual/{church-id}.pdf
 */
function findManualFile(churchId) {
  if (!fs.existsSync(MANUAL_DIR)) return null;
  var expected = path.join(MANUAL_DIR, churchId + '.pdf');
  if (fs.existsSync(expected)) return expected;
  return null;
}

/**
 * Get recent Sunday dates as YYYY-MM-DD strings.
 */
function getRecentSundays(count) {
  var sundays = [];
  var d = new Date();
  // Find next Sunday (or today if Sunday)
  var dayOfWeek = d.getDay();
  var daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  d.setDate(d.getDate() + daysUntilSunday);

  for (var i = 0; i < count; i++) {
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    sundays.push(yyyy + '-' + mm + '-' + dd);
    d.setDate(d.getDate() - 7);
  }
  return sundays;
}

/**
 * Simple HTTPS/HTTP GET that returns { statusCode, buffer }.
 * Follows redirects (up to 5).
 */
function httpGet(reqUrl, redirects) {
  if (redirects === undefined) redirects = 0;
  if (redirects > 5) return Promise.reject(new Error('Too many redirects'));

  return new Promise(function(resolve, reject) {
    var parsed = url.parse(reqUrl);
    var mod = parsed.protocol === 'https:' ? https : http;

    var req = mod.get({
      hostname: parsed.hostname,
      path: parsed.path,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/pdf,*/*',
      },
    }, function(res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        var redirect = url.resolve(reqUrl, res.headers.location);
        resolve(httpGet(redirect, redirects + 1));
        return;
      }

      var chunks = [];
      res.on('data', function(chunk) { chunks.push(chunk); });
      res.on('end', function() {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          buffer: Buffer.concat(chunks),
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, function() { req.abort(); reject(new Error('Timeout')); });
  });
}

module.exports = {
  fetchBulletin: fetchBulletin,
  httpGet: httpGet,
  getRecentSundays: getRecentSundays,
  MANUAL_DIR: MANUAL_DIR,
};
