// extract-text.js — Text-first extraction from bulletin PDFs using Ghostscript
// Uses gs txtwrite device for digitally typeset PDFs (zero API cost)
// Falls back to Vision path for scanned/image PDFs

var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');
var config = require('./config');

var TMP_DIR = path.resolve(__dirname, '../../.tmp-bulletin-text');

/**
 * Extract text from a PDF buffer using Ghostscript txtwrite.
 * @param {Buffer} pdfBuffer
 * @param {number} [maxPages] - max pages to extract (default from config)
 * @returns {{ method: string, pages: Array<{page: number, text: string, charCount: number}>, quality: string }}
 */
function extractText(pdfBuffer, maxPages) {
  if (!maxPages) maxPages = config.MAX_PAGES;

  // Ensure temp dir exists
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }

  var tmpPdf = path.join(TMP_DIR, 'input.pdf');
  fs.writeFileSync(tmpPdf, pdfBuffer);

  var pages = [];

  for (var i = 1; i <= maxPages; i++) {
    var rawText = extractPage(tmpPdf, i);
    if (rawText === null) break; // Ghostscript error

    // Strip Ghostscript header lines (GPL notice, "Processing pages...", "Page N")
    var text = stripGsHeader(rawText);
    if (text === null) break; // Page doesn't exist (past end of PDF)

    // Collapse runs of 3+ spaces to single space (column layout cleanup)
    text = text.replace(/   +/g, ' ');

    // Count non-whitespace alpha characters
    var alphaCount = (text.match(/[a-zA-Z]/g) || []).length;

    pages.push({
      page: i,
      text: text,
      charCount: alphaCount
    });
  }

  cleanup();

  if (pages.length === 0) {
    return { method: 'vision_needed', pages: [], quality: 'empty' };
  }

  // Quality assessment
  var quality = assessQuality(pages);

  return {
    method: quality === 'empty' ? 'vision_needed' : 'text',
    pages: pages,
    quality: quality
  };
}

/**
 * Extract text from a single page using Ghostscript txtwrite.
 * @param {string} pdfPath
 * @param {number} pageNum
 * @returns {string|null} - null if page doesn't exist
 */
function extractPage(pdfPath, pageNum) {
  try {
    var result = childProcess.execSync(
      'gs -sDEVICE=txtwrite -o - ' +
      '-dFirstPage=' + pageNum + ' -dLastPage=' + pageNum + ' ' +
      '"' + pdfPath + '" 2>/dev/null',
      { encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 }
    );
    // If Ghostscript returns but no content beyond header, page doesn't exist
    var stripped = stripGsHeader(result);
    if (stripped.trim().length === 0 && pageNum > 1) {
      return null;
    }
    return result;
  } catch (e) {
    // Ghostscript error or timeout — page may not exist
    if (pageNum > 1) return null;
    return '';
  }
}

/**
 * Strip Ghostscript GPL header and processing lines from output.
 * Also detects "Requested FirstPage is greater than" which means page doesn't exist.
 * @returns {string|null} - null if page doesn't exist
 */
function stripGsHeader(text) {
  // Detect non-existent page
  if (text.indexOf('Requested FirstPage is greater than') !== -1) {
    return null;
  }

  var lines = text.split('\n');
  var startIdx = 0;
  for (var i = 0; i < Math.min(lines.length, 10); i++) {
    if (lines[i].indexOf('GPL Ghostscript') !== -1 ||
        lines[i].indexOf('Copyright') !== -1 ||
        lines[i].indexOf('This software is supplied') !== -1 ||
        lines[i].indexOf('see the file COPYING') !== -1 ||
        lines[i].indexOf('Processing pages') !== -1 ||
        lines[i].match(/^Page \d+$/)) {
      startIdx = i + 1;
    }
  }
  return lines.slice(startIdx).join('\n');
}

/**
 * Assess text extraction quality based on content analysis.
 * @param {Array<{page: number, text: string, charCount: number}>} pages
 * @returns {string} - 'good', 'low', or 'empty'
 */
function assessQuality(pages) {
  var page1 = pages[0];
  if (!page1) return 'empty';

  // Good: page 1 has 100+ alpha characters
  if (page1.charCount >= 100) return 'good';

  // Low: page 1 has 50-99 chars — check pages 2-3 before downgrading
  // (handles cover-page pattern like St. Joseph)
  if (page1.charCount >= 50) {
    for (var i = 1; i < Math.min(pages.length, 3); i++) {
      if (pages[i].charCount >= 200) return 'good';
    }
    return 'low';
  }

  // Check pages 2-3 even if page 1 is very sparse
  for (var j = 1; j < Math.min(pages.length, 3); j++) {
    if (pages[j].charCount >= 200) return 'low';
  }

  return 'empty';
}

/**
 * Clean up temp directory.
 */
function cleanup() {
  try {
    if (fs.existsSync(TMP_DIR)) {
      var files = fs.readdirSync(TMP_DIR);
      files.forEach(function(f) {
        fs.unlinkSync(path.join(TMP_DIR, f));
      });
    }
  } catch (e) { /* ignore cleanup errors */ }
}

module.exports = {
  extractText: extractText,
  assessQuality: assessQuality
};
