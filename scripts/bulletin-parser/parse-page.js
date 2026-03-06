// parse-page.js — Send a bulletin page image to Claude Vision API
// Returns parsed JSON with extracted items

var Anthropic = require('@anthropic-ai/sdk');
var config = require('./config');
var prompt = require('./prompt');

var client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

/**
 * Parse a single bulletin page image with Claude Vision.
 * @param {Buffer} imageBuffer - PNG or JPEG image buffer
 * @param {number} pageNumber - 1-indexed
 * @param {number} totalPages
 * @param {string} churchName
 * @param {string} churchTown
 * @param {object} [profile] - parish profile for context
 * @returns {Promise<object>} { items: [...], page_type, notes, usage, cost }
 */
function parsePage(imageBuffer, pageNumber, totalPages, churchName, churchTown, profile) {
  var base64 = imageBuffer.toString('base64');

  // Detect media type from buffer header
  var mediaType = 'image/png';
  if (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) {
    mediaType = 'image/jpeg';
  }

  var promptText = prompt.buildPrompt(churchName, churchTown, pageNumber, totalPages, profile);

  return client.messages.create({
    model: config.PARSE_MODEL,
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64,
          },
        },
        {
          type: 'text',
          text: promptText,
        },
      ],
    }],
  }).then(function(response) {
    var text = response.content[0].text;

    // Calculate cost (Claude Sonnet pricing: $3/M input, $15/M output)
    var inputTokens = response.usage.input_tokens || 0;
    var outputTokens = response.usage.output_tokens || 0;
    var cost = (inputTokens * 3 / 1000000) + (outputTokens * 15 / 1000000);

    // Try to parse JSON from response
    var parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // Try extracting JSON from markdown code block
      var jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[1]);
        } catch (e2) {
          // Return raw text as error
          return {
            items: [],
            page_type: 'error',
            notes: 'Failed to parse JSON. Raw response: ' + text.substring(0, 500),
            usage: { input_tokens: inputTokens, output_tokens: outputTokens },
            cost: cost,
          };
        }
      } else {
        return {
          items: [],
          page_type: 'error',
          notes: 'No JSON in response. Raw: ' + text.substring(0, 500),
          usage: { input_tokens: inputTokens, output_tokens: outputTokens },
          cost: cost,
        };
      }
    }

    // Validate and normalize items
    var items = Array.isArray(parsed.items) ? parsed.items : [];
    items = items.map(function(item) {
      return {
        category: item.category || 'general',
        title: item.title || 'Untitled',
        description: item.description || null,
        event_date: item.event_date || null,
        event_time: item.event_time || null,
        end_time: item.end_time || null,
        end_date: item.end_date || null,
        location: item.location || null,
        contact_name: item.contact_name || null,
        contact_phone: item.contact_phone || null,
        contact_email: item.contact_email || null,
        registration_url: item.registration_url || null,
        recurring: item.recurring || null,
        tags: Array.isArray(item.tags) ? item.tags : [],
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
      };
    });

    return {
      items: items,
      page_type: parsed.page_type || 'mixed',
      notes: parsed.notes || null,
      usage: { input_tokens: inputTokens, output_tokens: outputTokens },
      cost: cost,
    };
  });
}

/**
 * Parse all pages of a bulletin sequentially.
 * @param {Array<{page: number, buffer: Buffer}>} pages
 * @param {string} churchName
 * @param {string} churchTown
 * @param {object} [profile]
 * @returns {Promise<object>} { allItems: [...], pageResults: [...], totalCost }
 */
function parseAllPages(pages, churchName, churchTown, profile) {
  var allItems = [];
  var pageResults = [];
  var totalCost = 0;
  var i = 0;

  function next() {
    if (i >= pages.length) {
      return Promise.resolve({
        allItems: allItems,
        pageResults: pageResults,
        totalCost: totalCost,
      });
    }

    var page = pages[i];
    i++;
    console.log('    Parsing page ' + page.page + '/' + pages.length + '...');

    return parsePage(
      page.buffer, page.page, pages.length,
      churchName, churchTown, profile
    ).then(function(result) {
      console.log('      → ' + result.items.length + ' items, $' + result.cost.toFixed(4) +
        ' (' + result.usage.input_tokens + ' in / ' + result.usage.output_tokens + ' out)');

      pageResults.push(result);
      totalCost += result.cost;

      // Add source_page to each item
      result.items.forEach(function(item) {
        item.source_page = page.page;
        allItems.push(item);
      });

      return next();
    });
  }

  return next();
}

module.exports = {
  parsePage: parsePage,
  parseAllPages: parseAllPages,
};
