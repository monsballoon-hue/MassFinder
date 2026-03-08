# CCC Bottom Sheet — UX Redesign Spec

## THE PROBLEM

The current implementation repeats what the user just read. When a user taps "CCC 1166-1167" in the Sunday Obligation guide, the bottom sheet shows a nicely styled version of the same sentence they're looking at directly above the sheet. It's a mirror, not a window.

**Screenshot diagnosis:**
- The guide text says: *"Sunday is the pre-eminent day for the celebration of the Eucharist because it is the day of the Resurrection."*
- The bottom sheet shows: *"Sunday is the pre-eminent day for the celebration of the Eucharist because it is the day of the Resurrection."*
- These are the same words. The user gained nothing by tapping.

**The root cause:** The implementation is pulling only the sentence already quoted in the guide. But that sentence is a 109-character fragment of a 975-character paragraph. The guide is quoting ~11% of CCC 1166. The other 89% — the apostolic tradition context, the "eighth day" theology, the Church Father quotation — is the part the user hasn't seen. That's what the bottom sheet should show.

---

## WHAT THE DATA ACTUALLY SUPPORTS

I pulled the full CCC JSON (2,865 paragraphs) and mapped the cross-reference graph. Here's what exists:

**Forward references (embedded in paragraph text as parenthetical numbers):**
```
CCC 1166 → references CCC 1343
CCC 2180 → references CCC 2042, CCC 1389
CCC 1165 → references CCC 2659, 2836, 1085
```

**Reverse references (other paragraphs that cite THIS paragraph):**
```
CCC 1166 ← cited by CCC 1343, CCC 2175, CCC 2837
CCC 1167 ← cited by CCC 2177
CCC 2180 ← cited by CCC 2042
```

**What this means:** Every CCC paragraph sits inside a teaching cluster. Tapping CCC 1166 can surface the full paragraph plus 3-4 related paragraphs that explore the same topic from different angles. The CCC was designed to be read this way — as a web, not a list.

**Size comparison — what the guide shows vs what exists:**

| Reference | Guide shows | Full paragraph | Ratio |
|-----------|-------------|----------------|-------|
| CCC 1166 | 109 chars | 975 chars | 9x more |
| CCC 2180 | 95 chars | 374 chars | 4x more |
| CCC 2181 | 80 chars | 320 chars | 4x more |
| CCC 1166-1167 combined | 109 chars | 1,615 chars combined | 15x more |

The user has seen 7-11% of the teaching. The bottom sheet should show the rest.

---

## REDESIGN: WHAT THE BOTTOM SHEET SHOULD DO

### Principle: The sheet answers "teach me more" not "show me the citation"

When a user taps a CCC reference, they're not asking for a legal citation. They're asking "what does the Church actually teach about this, in full?" The bottom sheet should feel like opening a study Bible's footnote — a richer, deeper exploration of the topic they're reading about.

### The new information architecture (top to bottom in the sheet):

```
┌─────────────────────────────────────────────┐
│  ─── (drag handle)                          │
│                                             │
│  CATECHISM OF THE CATHOLIC CHURCH           │  ← small caps header
│                                             │
│  § 1166                                     │  ← paragraph number, display font
│                                             │
│  "By a tradition handed down from the       │
│  apostles which took its origin from the    │  ← FULL paragraph text,
│  very day of Christ's Resurrection, the     │     not the fragment the guide
│  Church celebrates the Paschal mystery      │     already quoted
│  every seventh day..."                      │
│                                             │
│  [blockquoted Church Father text if any]    │  ← these exist in many paragraphs
│                                             │
│  § 1167                                     │  ← second paragraph if range
│                                             │
│  "Sunday is the pre-eminent day for the     │
│  liturgical assembly, when the faithful     │
│  gather 'to listen to the word of God      │
│  and take part in the Eucharist...'"       │
│                                             │
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │  ← subtle divider
│                                             │
│  RELATED TEACHINGS                          │  ← section header
│                                             │
│  § 1343  It was above all on "the first     │
│  day of the week," Sunday, the day of       │  ← tappable, opens THIS
│  Jesus' resurrection, that the Christians   │     paragraph in the same sheet
│  met "to break bread."                      │
│                                             │
│  § 2175  Sunday is expressly distinguished  │
│  from the sabbath which it follows          │
│  chronologically every week...              │
│                                             │
│  § 2177  The Sunday celebration of the      │
│  Lord's Day and his Eucharist is at the     │
│  heart of the Church's life.                │
│                                             │
│  [Read on Vatican.va ↗]                     │  ← external link, bottom of sheet
│                                             │
└─────────────────────────────────────────────┘
```

### What changed:

1. **Full paragraph text, not the fragment.** CCC 1166 is 975 characters of rich theological teaching. The guide only quoted 109 of them. The bottom sheet shows all 975. The user reads something genuinely new.

2. **Related Teachings section.** By following the cross-reference graph (both forward refs embedded in the text AND reverse refs from other paragraphs), we surface 2-4 related paragraphs. These are shown as truncated previews (first 2 sentences + "..."). Tapping one replaces the sheet content with that paragraph's full text + its own related teachings. It's a rabbit hole — in the best sense.

3. **Church Father blockquotes.** Many CCC paragraphs contain blockquoted texts from saints and Church Fathers (marked with `>` in the JSON). These should render as visually distinct inset quotations — italic, indented, with attribution. They're the most beautiful content in the CCC and they're completely absent from the current implementation.

4. **Paragraph ranges handled properly.** "CCC 1166-1167" should show both paragraphs sequentially, each with their own § number header, not merged into one blob.

---

## VISUAL DESIGN FIXES

### Current problems (from screenshot):

**1. The "CATECHISM OF THE CATHOLIC CHURCH" header is competing with the content.**
It's set in bright blue uppercase — the highest visual priority element on the sheet. But it's a label, not content. The user doesn't need to be shouted at about what document this is.

**Fix:** Reduce to `font-size: var(--text-xs); color: var(--color-text-tertiary); letter-spacing: 0.08em; text-transform: uppercase;` — whisper it, don't shout it.

**2. The § number is set in a heavy serif that looks disconnected from MassFinder's design language.**
MassFinder uses `var(--font-display)` for prominent headings. The § number should use the same.

**Fix:** `font-family: var(--font-display); font-size: var(--text-lg); font-weight: 700; color: var(--color-text-primary);`

**3. The body text is in italic, which reads as "quotation" but makes long paragraphs hard to scan.**
Italic is appropriate for a short pull-quote. For the full paragraph (which might be 4-6 sentences), italic becomes an accessibility problem — harder to read for older eyes.

**Fix:** Roman (upright) for the main paragraph text. Italic only for blockquoted Church Father passages. This creates a clear visual hierarchy: the CCC's own words in roman, the sources it cites in italic.

**4. No visual breathing room.**
The text runs edge-to-edge. The paragraph number and text are too close together.

**Fix:**
```css
.ccc-sheet { padding: var(--space-5) var(--space-5) var(--space-6); }
.ccc-para-num { margin-bottom: var(--space-2); margin-top: var(--space-5); }
.ccc-para-num:first-of-type { margin-top: 0; }
.ccc-text { line-height: 1.75; color: var(--color-text-primary); }
.ccc-blockquote { margin: var(--space-4) 0; padding-left: var(--space-4);
  border-left: 2px solid var(--color-border-light);
  font-style: italic; color: var(--color-text-secondary); }
```

**5. The sheet has no liturgical color awareness.**
When the rest of the app shifts to purple during Lent (per the Ambient UI feature), the bottom sheet should pick up that accent on its drag handle and § numbers.

**Fix:** Use `var(--color-accent)` for the § symbol color and the "RELATED TEACHINGS" section header. These automatically inherit the seasonal color.

---

## INTERACTION DESIGN

### Opening animation
Current: appears to slide up. This is correct. Don't change it.

### Scrolling within the sheet
The full CCC paragraph + related teachings will be longer than the viewport on mobile. The sheet needs internal scrolling. Use `-webkit-overflow-scrolling: touch;` on the content area (not the whole sheet — the drag handle should stay pinned).

### Navigating between related teachings
When a user taps a related teaching preview (e.g., § 1343), the sheet content should crossfade — not open a new sheet. The pattern:
1. Current content fades out (opacity 0, 150ms)
2. New content replaces innerHTML
3. New content fades in (opacity 1, 150ms)
4. Sheet scrolls to top

A thin "← Back" affordance appears at the top when you've navigated away from the original paragraph. Like iOS Settings drill-down.

### Dismissing
- Tap the overlay (current — keep)
- Swipe down on the drag handle (if implemented)
- Press Escape on desktop (add a keydown listener)

### Mobile considerations
The sheet should snap to ~70% viewport height max. On smaller phones (iPhone SE), this means the "Related Teachings" section might be below the fold — that's fine. The scroll indicator and content peek signals that there's more below.

---

## TECHNICAL: BUILDING THE CROSS-REFERENCE GRAPH

The CCC JSON uses parenthetical numbers at the end of paragraphs for cross-references. Parse them like this:

```javascript
function extractCrossRefs(text) {
  var refs = [];
  // Match parenthetical numbers: (1343) or (2042, 1389)
  var matches = text.match(/\((\d[\d,\s\-]+)\)/g);
  if (!matches) return refs;
  for (var i = 0; i < matches.length; i++) {
    var nums = matches[i].match(/\d+/g);
    if (nums) {
      for (var j = 0; j < nums.length; j++) {
        refs.push(parseInt(nums[j], 10));
      }
    }
  }
  return refs;
}
```

Build a reverse-reference index at load time (once, when CCC JSON is first fetched):

```javascript
function buildReverseIndex(cccData) {
  var reverseIndex = {}; // { targetId: [sourceId, sourceId, ...] }
  for (var i = 0; i < cccData.length; i++) {
    var refs = extractCrossRefs(cccData[i].text);
    for (var j = 0; j < refs.length; j++) {
      if (!reverseIndex[refs[j]]) reverseIndex[refs[j]] = [];
      reverseIndex[refs[j]].push(cccData[i].id);
    }
  }
  return reverseIndex;
}
```

To get all related paragraphs for a given CCC reference:

```javascript
function getRelated(paragraphId, cccLookup, reverseIndex) {
  var text = cccLookup[paragraphId] || '';
  var forward = extractCrossRefs(text);            // paragraphs THIS one cites
  var backward = reverseIndex[paragraphId] || [];   // paragraphs that cite THIS one
  // Merge, deduplicate, exclude self
  var all = {};
  forward.forEach(function(id) { if (id !== paragraphId) all[id] = true; });
  backward.forEach(function(id) { if (id !== paragraphId) all[id] = true; });
  return Object.keys(all).map(Number).sort(function(a,b) { return a - b; });
}
```

For CCC 1166, this returns: [1343, 2175, 2837] — three related paragraphs the user hasn't seen, each adding a different dimension to the teaching on Sunday.

---

## CONTENT RENDERING: STRIP CROSS-REF NOISE FROM DISPLAY TEXT

The raw CCC JSON text includes the cross-reference numbers inline, like:

> *"...the Church celebrates the Paschal mystery every seventh day..." (1343)*

When rendering in the bottom sheet, strip these parenthetical references from the display text — they're metadata, not content. Show them as the tappable "Related Teachings" cards instead.

```javascript
function cleanCCCText(text) {
  // Remove parenthetical cross-reference numbers
  return text.replace(/\s*\(\d[\d,\s\-]*\)\s*/g, ' ').trim();
}
```

Also detect and render blockquotes (lines starting with `>`):

```javascript
function renderCCCParagraph(text) {
  var clean = cleanCCCText(text);
  var lines = clean.split('\n');
  var html = '';
  var inBlockquote = false;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    if (line.charAt(0) === '>') {
      if (!inBlockquote) { html += '<blockquote class="ccc-blockquote">'; inBlockquote = true; }
      html += '<p>' + esc(line.slice(1).trim()) + '</p>';
    } else {
      if (inBlockquote) { html += '</blockquote>'; inBlockquote = false; }
      html += '<p class="ccc-text">' + esc(line) + '</p>';
    }
  }
  if (inBlockquote) html += '</blockquote>';
  return html;
}
```

---

## SUMMARY: WHAT THE USER GAINS

| | Current | Redesigned |
|--|---------|------------|
| **Primary text** | 109-char fragment (already visible in guide) | 975-char full paragraph (new content) |
| **Church Father quotes** | Hidden | Rendered as styled blockquotes |
| **Related teachings** | None | 2-4 connected paragraphs, tappable |
| **Navigation depth** | Dead end | Tap related → see its full text → its related |
| **Visual hierarchy** | Shouting header, italic body | Whispered header, readable roman body, italic quotes |
| **Liturgical awareness** | None | Accent color matches current season |
| **Value proposition** | "I already read this" | "I didn't know the Church taught that" |

The bottom sheet stops being a tooltip and becomes a teaching tool. The user taps CCC 1166 expecting to see the citation and instead discovers that the early Christians met on Sunday specifically because of the Resurrection (§ 1343), that Sunday replaced the Jewish Sabbath theologically (§ 2175), and that this is why it's the foremost holy day of obligation (§ 2177). They learn something. That's worth tapping.
