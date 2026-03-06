// pdf-to-images.js — Convert PDF pages to PNG buffers using Ghostscript directly
// Bypasses pdf2pic/GraphicsMagick dependency issues

var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');
var config = require('./config');

var TMP_DIR = path.resolve(__dirname, '../../.tmp-bulletin-images');

/**
 * Convert a PDF buffer to an array of PNG image buffers using Ghostscript.
 * @param {Buffer} pdfBuffer
 * @param {number} [maxPages] - max pages to convert (default from config)
 * @returns {Promise<Array<{page: number, buffer: Buffer}>>}
 */
function pdfToImages(pdfBuffer, maxPages) {
  if (!maxPages) maxPages = config.MAX_PAGES;

  // Ensure temp dir exists
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }

  // Write PDF to temp file
  var tmpPdf = path.join(TMP_DIR, 'input.pdf');
  var outPattern = path.join(TMP_DIR, 'page_%d.png');
  fs.writeFileSync(tmpPdf, pdfBuffer);

  return new Promise(function(resolve, reject) {
    // Use Ghostscript to convert PDF pages to PNGs
    var args = [
      '-dNOPAUSE',
      '-dBATCH',
      '-dSAFER',
      '-sDEVICE=png16m',
      '-r' + config.IMAGE_DPI,
      '-dFirstPage=1',
      '-dLastPage=' + maxPages,
      '-sOutputFile=' + outPattern,
      tmpPdf,
    ];

    var proc = childProcess.spawn('gs', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    var stderr = '';

    proc.stderr.on('data', function(d) { stderr += d.toString(); });

    proc.on('close', function(code) {
      if (code !== 0) {
        cleanTmpDir();
        reject(new Error('Ghostscript exited with code ' + code + ': ' + stderr.slice(0, 200)));
        return;
      }

      // Read the generated PNGs
      var pages = [];
      for (var i = 1; i <= maxPages; i++) {
        var pagePath = path.join(TMP_DIR, 'page_' + i + '.png');
        if (fs.existsSync(pagePath)) {
          pages.push({
            page: i,
            buffer: fs.readFileSync(pagePath),
          });
        } else {
          break; // no more pages
        }
      }

      cleanTmpDir();
      resolve(pages);
    });

    proc.on('error', function(err) {
      cleanTmpDir();
      reject(err);
    });
  });
}

/**
 * Download WordPress images as buffers.
 * @param {string[]} imageUrls
 * @returns {Promise<Array<{page: number, buffer: Buffer}>>}
 */
function downloadImages(imageUrls) {
  var fetcher = require('./fetch-bulletin');
  var results = [];
  var i = 0;

  function next() {
    if (i >= imageUrls.length) return Promise.resolve(results);

    var imgUrl = imageUrls[i];
    var pageNum = i + 1;
    i++;

    return fetcher.httpGet(imgUrl).then(function(res) {
      if (res.statusCode === 200 && res.buffer.length > 1000) {
        results.push({ page: pageNum, buffer: res.buffer });
      }
      return next();
    }).catch(function() {
      return next();
    });
  }

  return next();
}

function cleanTmpDir() {
  try {
    if (!fs.existsSync(TMP_DIR)) return;
    var files = fs.readdirSync(TMP_DIR);
    files.forEach(function(f) {
      fs.unlinkSync(path.join(TMP_DIR, f));
    });
  } catch (e) {
    // ignore cleanup errors
  }
}

module.exports = {
  pdfToImages: pdfToImages,
  downloadImages: downloadImages,
};
