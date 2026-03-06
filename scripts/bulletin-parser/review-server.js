#!/usr/bin/env node
// review-server.js — Local web server for visual bulletin review
// Usage: node scripts/bulletin-parser/review-server.js

var http = require('http');
var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');
var config = require('./config');
var sb = require('@supabase/supabase-js');

var supabase = sb.createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

var PORT = 3456;
var MANUAL_DIR = path.resolve(__dirname, '../../bulletins-manual');
var IMG_CACHE_DIR = path.resolve(__dirname, '../../.tmp-review-images');

if (!fs.existsSync(IMG_CACHE_DIR)) fs.mkdirSync(IMG_CACHE_DIR, { recursive: true });

var server = http.createServer(function(req, res) {
  var parts = req.url.split('?');
  var urlPath = parts[0];

  // Serve the UI
  if (urlPath === '/' || urlPath === '/index.html') {
    var htmlPath = path.join(__dirname, 'review-ui.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(htmlPath, 'utf8'));
    return;
  }

  // API: list bulletins with items + church info
  if (urlPath === '/api/bulletins') {
    getBulletins().then(function(data) {
      jsonResp(res, 200, data);
    }).catch(function(err) {
      jsonResp(res, 500, { error: err.message });
    });
    return;
  }

  // API: update single item
  if (urlPath === '/api/update-item' && req.method === 'POST') {
    readBody(req, function(data) {
      supabase.from('bulletin_items').update({ status: data.status })
        .eq('id', data.id).then(function(r) {
          if (r.error) return jsonResp(res, 500, { error: r.error.message });
          jsonResp(res, 200, { ok: true });
        });
    });
    return;
  }

  // API: bulk update items
  if (urlPath === '/api/bulk-update' && req.method === 'POST') {
    readBody(req, function(data) {
      supabase.from('bulletin_items').update({ status: data.status })
        .in('id', data.ids).then(function(r) {
          if (r.error) return jsonResp(res, 500, { error: r.error.message });
          jsonResp(res, 200, { ok: true, count: data.ids.length });
        });
    });
    return;
  }

  // Serve page images: /images/{church-id}/page_1.png
  if (urlPath.indexOf('/images/') === 0) {
    var imgParts = urlPath.replace('/images/', '').split('/');
    var churchId = imgParts[0];
    var filename = imgParts[1];
    var imgPath = path.join(IMG_CACHE_DIR, churchId, filename);

    if (fs.existsSync(imgPath)) {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=86400' });
      res.end(fs.readFileSync(imgPath));
    } else {
      generateImages(churchId).then(function() {
        if (fs.existsSync(imgPath)) {
          res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=86400' });
          res.end(fs.readFileSync(imgPath));
        } else {
          res.writeHead(404); res.end('Not found');
        }
      }).catch(function() { res.writeHead(404); res.end('Not found'); });
    }
    return;
  }

  res.writeHead(404); res.end('Not found');
});

function jsonResp(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req, cb) {
  var body = '';
  req.on('data', function(c) { body += c; });
  req.on('end', function() { cb(JSON.parse(body)); });
}

function getBulletins() {
  return supabase.from('bulletins')
    .select('id, church_id, bulletin_date, page_count, status, parse_cost_usd')
    .order('church_id')
    .then(function(bRes) {
      if (bRes.error) throw new Error(bRes.error.message);
      var bulletins = bRes.data || [];
      return supabase.from('bulletin_items')
        .select('*')
        .order('source_page')
        .then(function(iRes) {
          if (iRes.error) throw new Error(iRes.error.message);
          var items = iRes.data || [];
          var churchIds = bulletins.map(function(b) { return b.church_id; });
          return supabase.from('churches').select('id, name, city')
            .in('id', churchIds).then(function(cRes) {
              var churches = {};
              (cRes.data || []).forEach(function(c) { churches[c.id] = c; });
              var itemsByBulletin = {};
              items.forEach(function(item) {
                if (!itemsByBulletin[item.bulletin_id]) itemsByBulletin[item.bulletin_id] = [];
                itemsByBulletin[item.bulletin_id].push(item);
              });
              return bulletins.map(function(b) {
                var church = churches[b.church_id] || {};
                return {
                  id: b.id, churchId: b.church_id,
                  churchName: church.name || b.church_id,
                  churchCity: church.city || '',
                  bulletinDate: b.bulletin_date,
                  pageCount: b.page_count,
                  cost: b.parse_cost_usd,
                  items: itemsByBulletin[b.id] || [],
                };
              });
            });
        });
    });
}

function generateImages(churchId) {
  var outDir = path.join(IMG_CACHE_DIR, churchId);
  if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) return Promise.resolve();
  var pdfPath = path.join(MANUAL_DIR, churchId + '.pdf');
  if (!fs.existsSync(pdfPath)) return Promise.reject(new Error('No PDF'));
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  var outPattern = path.join(outDir, 'page_%d.png');
  var args = ['-dNOPAUSE', '-dBATCH', '-dSAFER', '-sDEVICE=png16m', '-r150',
    '-dFirstPage=1', '-dLastPage=12', '-sOutputFile=' + outPattern, pdfPath];
  return new Promise(function(resolve, reject) {
    var proc = childProcess.spawn('gs', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    proc.on('close', function(code) { code === 0 ? resolve() : reject(new Error('gs failed')); });
    proc.on('error', reject);
  });
}

// Pre-generate all images on startup
function pregenerate() {
  var pdfs = [];
  try { pdfs = fs.readdirSync(MANUAL_DIR).filter(function(f) { return f.endsWith('.pdf'); }); } catch(e) {}
  if (pdfs.length === 0) return;
  console.log('Pre-generating page images for ' + pdfs.length + ' bulletins...');
  var i = 0;
  function next() {
    if (i >= pdfs.length) { console.log('All images ready.\n'); return; }
    var cid = pdfs[i].replace('.pdf', '');
    i++;
    process.stdout.write('  ' + cid + '...');
    generateImages(cid).then(function() { console.log(' done'); next(); })
      .catch(function(e) { console.log(' skip (' + e.message + ')'); next(); });
  }
  next();
}

server.listen(PORT, function() {
  console.log('\n  Bulletin Review UI');
  console.log('  http://localhost:' + PORT + '\n');
  pregenerate();
});
