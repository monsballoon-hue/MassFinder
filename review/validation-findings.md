# Validation Findings Log

Accumulated during parish-by-parish bulletin review. Used to inform admin panel improvements, schema changes, and data convention updates.

---

## Discrepancies Found

### parish_013 — St. Stanislaus Bishop & Martyr Basilica (2026-03-04)

| # | Issue | Was | Fixed To |
|---|-------|-----|----------|
| 1 | Saturday 7 AM Mass incorrectly typed as Sunday obligation | `sunday_mass` / `saturday` / 07:00 | `daily_mass` / `saturday` / 07:00 |
| 2 | Divine Mercy used generic `devotion` type + `sunday` with recurrence | `devotion` / `sunday` / recurrence week 1 | `divine_mercy` / `first_sunday` (no recurrence needed) |
| 3 | Missing: Stations of the Cross Wed 7PM Polish (Lent) | not in data | Added `stations_of_cross` / `wednesday` / 19:00 / pl / lent |

**Added end_times where missing:** Already had them — data was correct.

**Bulletin items NOT entered (events, not services):**
- Lenten Retreat March 21-24 (Fr. Dennis Mason) → `events.json`
- Padre Pio Prayer Group (1st Sat?) → needs clarification on recurrence before adding

### parish_016 — St. Agnes Parish, Dalton (2026-03-04)

| # | Issue | Was | Fixed To |
|---|-------|-----|----------|
| 1 | Duplicate holy day services (two entries each with different types, one with no location) | `sunday_mass`/`holyday` + `daily_mass`/`holyday` | Removed duplicates (kept `daily_mass` versions with location) |
| 2 | Confession missing end_time | `confession`/`saturday`/15:15 no end | Added end_time 15:45 |
| 3 | Missing: Confession at St. Patrick's Sat 5:15 PM | not in data | Added `confession`/`saturday`/17:15 at St. Patrick's |
| 4 | Good Friday service had no time | `good_friday_service` / time: null | Set time to 19:00 |
| 5 | Missing: Good Friday 3 PM Stations | not in data | Added `stations_of_cross`/`good_friday`/15:00 |
| 6 | Missing: Holy Thursday Adoration | not in data | Added `adoration`/`holy_thursday`/19:30-21:00 |
| 7 | Rosary Sunday had no location | location_id: null | Set to st-agnes-church-dalton (Adoration Chapel) |
| 8 | Stations notes missing Benediction | just "NO Stations at St. Patrick's" | Added "Stations of the Cross & Benediction" |
| 9 | Missing: Palm Sunday & Easter Sunday specific Masses | not in data | Added 5 Palm Sunday + 3 Easter Sunday services with locations |

**Clergy check:** Bulletin lists only Rev. Brian McGrath (Pastor) and Deacon George Morrell. Data has two additional: Deacon Richard Radzick and Deacon Sean Mulholland (retired). May need removal — flagged for confirmation.

**Bulletin items for events.json:**
- Lenten Soup Suppers: every Friday 5-6 PM at St. Agnes Academy cafeteria (Lent)
- Dalton Sunday Lunch: next date March 15. Contact Justin Brown (413) 362-5064. Setup 10am-12pm, service 12:30-2:30pm. **User requests richer event descriptions with contact info for end users.**

### parish_026 — Our Lady of the Hills Parish, Haydenville (2026-03-04)

| # | Issue | Was | Fixed To |
|---|-------|-----|----------|
| 1 | All services missing location_id | `null` on all 8 services | Set to `our-lady-of-the-hills-church-haydenville` |
| 2 | Missing clergy | empty array | Added Fr. John Gawienowski (pastor) + Deacon Mark Kolasinski |
| 3 | Missing: Adoration Monday 1-2 PM with Benediction | not in data | Added `adoration`/`monday`/13:00-14:00 |

**Mon-Thu daily Mass (no Friday):** 4 individual entries (mon/tue/wed/thu) is correct. Cannot use `weekday` since that means Mon-Fri. No change needed.

**Adoration recurrence uncertainty:** Bulletin listed "Monday March 09" specifically. Added as weekly Monday but could be monthly (2nd Monday). Needs confirmation from future bulletins.

**Bulletin items NOT entered:**
- Lenten Senior Retreat March 19 at Jericho Celebration Center, Holyoke — NOT hosted by this parish. See convention question below.

**Clergy convention applied:** Lead priest + primary deacon only.

### parish_028 — Our Lady of the Cross Parish, Holyoke (2026-03-04)

| # | Issue | Was | Fixed To |
|---|-------|-----|----------|
| 1 | Church address was parish office address | "15 Maple Street" | "Holy Cross Ave" (church); 15 Maple is the office |
| 2 | All services missing location_id | `null` on all 12 | Set to church |
| 3 | Confession only covered Monday, not Mon-Sat | `confession`/`monday`/08:00 | Changed to `weekday` + added separate `saturday`/08:00 |
| 4 | Rosary at 8:05 AM only existed in divine_mercy notes | not a separate service | Added `rosary`/`weekday`/08:05 + `rosary`/`saturday`/08:05 |
| 5 | Missing: First Friday Adoration 9AM-6PM | not in data | Added `adoration`/`first_friday`/09:00-18:00 (bulletin listed "March 6" but that's 1st Friday) |
| 6 | Clergy empty | `[]` | Added Fr. Albert Scherer, OFM Conv. (pastor) |
| 7 | Contact had stale deacon email + wrong office hours | "thedeaconrjt@gmail.com", "8:30-12:30" | Removed deacon email, corrected to 9:00 AM-12:00 PM |

**Bulletin items NOT entered (events):**
- Lenten Penance Service: Sun March 8, 2:00 PM — one-time event for this parish
- Artie Boyle healing talk: March 4 at 6:30 PM — CROSS-PARISH, at Our Lady of the Blessed Sacrament, Westfield
- Communion Breakfast: March 15 at St. Jerome's Church, Holyoke — CROSS-PARISH
- Mater Dolorosa School Spaghetti Supper: March 4, 4-6:30 PM, Pope St. John Paul II Social Center — likely this parish's hall, monthly event

**Clergy note:** Parish is staffed by OFM Conventual Franciscans. 4 friars listed (pastor, parochial vicar, 2 in residence). Per convention, kept pastor only. No deacon.

### parish_029 — St. Jerome Parish, Holyoke (2026-03-04)

| # | Issue | Was | Fixed To |
|---|-------|-----|----------|
| 1 | Missing location: Immaculate Conception Chapel | only St. Jerome Church in data | Added IC Chapel, 54 N. Summer St |
| 2 | 4 services at IC Chapel had null location_id | `null` | Set to `immaculate-conception-chapel-holyoke` |
| 3 | Clergy empty | `[]` | Added Fr. Francis Reilly (pastor) + Deacon Jose E. Correa Pacheco |
| 4 | Office hours wrong | "10:00am - 2:00pm" | Corrected to "9:00 AM - 3:00 PM" |

**Services verified correct (no changes needed):**
- All Mass times, daily Mass schedule, confession times, First Friday adoration, holiday Mass — all match bulletin
- Spanish Masses correctly tagged `language: "es"`

**St. Patrick's Chapel:** Mentioned for holiday Mass and First Friday adoration. Appears to be a chapel *within* St. Jerome Church complex (not a separate address). Kept as notes on those services rather than a separate location.

**Bulletin items NOT entered (events):**
- St. Patrick Novena: March 9-17, daily Masses in St. Patrick's Chapel with 9 different celebrants — multi-date event

**Bilingual parish note:** 3 locations (church, chapel, community center), services in English + Spanish. Good test case for multi-location + multi-language admin entry.

### parish_031 — Immaculate Conception Parish, Indian Orchard (2026-03-04)

| # | Issue | Was | Fixed To |
|---|-------|-----|----------|
| 1 | Office hours wrong | "3:00-6:00 PM" | Corrected to "3:00 PM - 5:30 PM" |
| 2 | Clergy empty | `[]` | Added Fr. Piotr (pastor) — full last name not in bulletin, flagged |
| 3 | Holy Thursday Mass had no time | `null` | Set to 19:00, added Polish-English language note |
| 4 | Good Friday service had no time | `null` | Set to 19:00 (Liturgy of the Passion) |
| 5 | Easter Vigil had no time | `null` | Set to 19:30 |
| 6 | Missing: Good Friday Stations 5:45 PM | not in data | Added `stations_of_cross`/`good_friday`/17:45 |
| 7 | Missing: Holy Thursday Adoration after Mass | not in data | Added `adoration`/`holy_thursday`/20:00-21:30 |
| 8 | Missing: Holy Saturday tomb visit + food blessing | not in data | Added `adoration`/`holy_saturday`/10:00-13:00 with Swieconka notes |
| 9 | Missing: Easter Sunday Masses | not in data | Added 7:00 AM Resurrection + 10:15 AM (no 8:30 AM on Easter) |

**Regular services verified correct:** All weekday Masses (Mon/Tue 8AM, Thu/Fri 6PM), weekend Masses, rosary, confession, Wednesday adoration — all match bulletin. No changes needed.

**Daily Mass schedule (Mon/Tue + Thu/Fri):** Cannot consolidate — different times (8AM vs 6PM) and non-consecutive days. 4 individual entries is correct.

**Bilingual Masses:** Mon/Tue and Thu/Fri daily Masses are "English/Polish" — tagged `language: "en"` with "English/Polish" in notes. Holy Week services heavily bilingual (Polish-English).

**Clergy incomplete:** Only "Fr. Piotr" referenced (in anointing section). Full name needed — check diocese directory.

**Polish cultural services:** Holy Saturday traditional food blessing (Swieconka) at 10am, 11am, 12pm, 1pm. Unique to Polish parishes.

### parish_032 — St. Mary, Mother of the Church Parish, Lee (2026-03-04)

| # | Issue | Was | Fixed To |
|---|-------|-----|----------|
| 1 | St. Joseph's Stockbridge missing street address | "Stockbridge, MA 01262" | "11 Elm Street, Stockbridge, MA 01262" |
| 2 | Missing location: St. Mary of the Lakes, Otis | not in data | Added (Rts. 8 & 23, Otis) — no current services there |
| 3 | Adoration was wrong location, wrong times, Monday only | `adoration`/`monday`/06:30-20:00 at Stockbridge | Replaced with 3 entries at Lee Oratory: weekday 8AM-11PM, sat 9AM-11PM, sun 9AM-11PM |
| 4 | Clergy empty | `[]` | Added Fr. Matthew Guidi (pastor) + Deacon Jim McElroy (deacon emeritus) |

**Daily Mass (Mon/Tue/Thu/Fri — no Wed):** 4 individual entries correct. Friday has school-year location note. Cannot consolidate.

**Adoration note:** The Oratory is essentially near-perpetual (15-16 hrs/day, 7 days). Could consider `perpetual_adoration` type but it's not truly 24/7.

**St. Mary of the Lakes, Otis:** Listed as a worship site but no services in current bulletin. May be seasonal or inactive — added location for completeness.

### parish_033 — Triparish Community, Lenox (2026-03-04)

| # | Issue | Was | Fixed To |
|---|-------|-----|----------|
| 1 | Missing: Lenten weekday Mass Mon-Fri 5:30 PM at St. Vincent | not in data | Added `daily_mass`/`weekday`/17:30 at St. Vincent (seasonal: lent) |
| 2 | Missing: Confession at St. Vincent, Sat after Vigil Mass | not in data | Added `confession`/`saturday`/18:15 at St. Vincent, notes "After 5:30 PM Vigil Mass" |
| 3 | Missing: Confession at St. Patrick, 4th Sunday | not in data | Added `confession`/`sunday` with `recurrence: {type: "nth", week: 4}` at St. Patrick |
| 4 | Missing: Holy Thursday Mass 7 PM at St. Ann | not in data | Added `holy_thursday_mass`/`holy_thursday`/19:00 |
| 5 | Missing: Good Friday Stations 3 PM at St. Ann | not in data | Added `stations_of_cross`/`good_friday`/15:00 |
| 6 | Missing: Good Friday Passion Service 7 PM at St. Ann | not in data | Added `good_friday_service`/`good_friday`/19:00 |
| 7 | Clergy empty | `[]` | Added Rev. Msgr. John J. Bonzagni (pastor) + Deacon John Zick |

**Weekend Masses verified correct (no changes):** St. Ann Sat 4 PM vigil, Sun 9:45 & 11:15; St. Vincent Sat 5:30 vigil; St. Patrick Sun 8:30.

**Regular daily schedule verified correct (no changes):** Mon-Thu 7 AM at St. Ann Family Center + Fri 7 AM Communion Service.

**4th Sunday Confession at St. Patrick:** No specific time in bulletin — entered with `time: null`. Uses recurrence field per DATA_STANDARDS.md convention.

**Confession "after Mass" at St. Vincent:** Estimated 6:15 PM (after 5:30 Vigil). Entered as 18:15 with explanatory note.

### parish_035 — St. Mary's Parish, Longmeadow (2026-03-04)

| # | Issue | Was | Fixed To |
|---|-------|-----|----------|
| 1 | Weekday mass used `weekday` (Mon-Fri) but Friday is communion service | `daily_mass`/`weekday`/07:00 | Split to 4 individual Mon-Thu entries |
| 2 | Communion service had wrong `recurrence: week 3` (backward) | Only applied 3rd Friday | Removed recurrence — happens every Friday. Added note "3rd Friday is Mass instead" |
| 3 | Missing: 3rd Friday Mass 7 AM | not in data | Added `daily_mass`/`friday`/07:00 with `recurrence: {week: 3}` |
| 4 | All services missing location_id | `null` on all 18 | Set to `st-mary-s-church-longmeadow` |
| 5 | Church address missing city/state | "519 Longmeadow Street, 01106" | "519 Longmeadow Street, Longmeadow, MA 01106" |
| 6 | Clergy used `title` instead of `role`, had 3 entries | `[{title: "Pastor"...}, {title: "Priest in Residence"...}, {title: "Deacon"...}]` | Fixed to `role` field, kept pastor + deacon per convention |
| 7 | First Saturday Mass missing end_time | `null` | Set to 09:00 (bulletin says 8:00-9:00) |

**Services verified correct (no changes):** Sat 4PM & 5:30 vigils, Sun 8/9:30/11, Mon 6:30 PM Novena Mass, 3 holy day masses, Sat confession 2:30-3:30, Lenten Mon confession, Lenten Fri stations, Tue adoration 7:30-noon, Fri rosary+adoration 7:30-8:30, First Friday adoration 12-5.

**Modeling note — Friday 7 AM overlap:** Both communion_service (every Friday) and daily_mass (3rd Friday with recurrence) exist at same time. This is intentional: the 3rd Friday mass overrides the communion service. App should ideally suppress the communion service on 3rd Fridays, but no filtering logic exists yet — logged as admin panel item.

**Bulletin items NOT entered (events):**
- Sandwich Making for Springfield Rescue Mission: March 8 after 9:30 Mass, Parish Center — community/volunteering event
- Lenten Stations followed by Communion Service: already captured as service (stations entry with note)

### parish_036 — Christ the King Parish, Ludlow (2026-03-04)

| # | Issue | Was | Fixed To |
|---|-------|-----|----------|
| 1 | Saturday 7 AM Mass typed as Sunday obligation | `sunday_mass`/`saturday`/07:00 | `daily_mass`/`saturday`/07:00 |
| 2 | Rosary was single Monday entry representing Mon-Sat | `rosary`/`monday`/06:25 with note "Mon-Sat" | Split to `weekday` + `saturday` entries at 06:25 |
| 3 | Divine Mercy Chaplet only in rosary notes | not a service | Added `divine_mercy`/`weekday`/07:30 + `saturday`/07:30 (after Mass) |
| 4 | Missing: Prayer for Priests Wed 10-11 AM | not in data | Added `prayer_group`/`wednesday`/10:00-11:00 |
| 5 | Missing: Gorzkie Żale Sunday 2 PM (Lent) | not in data (only in rosary notes) | Added `gorzkie_zale`/`sunday`/14:00 (pl, lent) |
| 6 | Missing: Lenten Friday Mass 5:30 PM | not in data (implied by stations notes) | Added `daily_mass`/`friday`/17:30 (lent) |
| 7 | All services missing location_id | `null` on all 18 | Set to `christ-the-king-church-ludlow` |
| 8 | Church address missing city/state | "41 Warsaw Avenue, 01056" | "41 Warsaw Avenue, Ludlow, MA 01056" |
| 9 | Clergy empty | `[]` | Added Fr. Raymond A. Sołtys (pastor) |

**Services verified correct (no changes):** Sat 5PM & 6:30 vigils, Sun 7:30/8:45pl/10/11:15/5:30, weekday 7AM Mass, Miraculous Medal Tue 7AM, 3 confession entries, Lenten Stations Fri 1PM & after Mass, Lenten Rosary Sun 1:30 PM (Polish), perpetual adoration.

**Polish parish notes:** Active Polish liturgical life — Gorzkie Żale, bilingual Stations (Droga Krzyżowa), Polish Sunday Mass. No deacon listed in bulletin — pastor only for clergy.

**Modeling note — Rosary/Divine Mercy as separate entries:** The daily devotion cycle is Rosary 6:25 → Mass 7:00 → Divine Mercy Chaplet ~7:30. These are now 3 distinct service entries (rosary, daily_mass, divine_mercy) for discoverability, even though they're experienced as one continuous block.

### parish_037 — Our Lady of Fatima Parish, Ludlow (2026-03-04)

| # | Issue | Was | Fixed To |
|---|-------|-----|----------|
| 1 | Missing location: Chapel of The Little Shepherds | not in data | Added as chapel with same address as church |
| 2 | All services missing location_id | `null` on all 12 | Set to church or chapel based on bulletin context |
| 3 | Missing: First Friday Mass 8:30 AM Portuguese | not in data | Added `daily_mass`/`first_friday`/08:30 (pt) at chapel |
| 4 | Missing: First Saturday Mass 8:30 AM Portuguese | not in data | Added `daily_mass`/`first_saturday`/08:30 (pt) at chapel |
| 5 | Missing: First Saturday Eucharistic Vigil 9AM-3PM | not in data | Added `adoration`/`first_saturday`/09:00-15:00 at chapel |
| 6 | Missing: Holy Day Masses | not in data | Added 8:30 AM (pt) + 5:30 PM (en) at church |
| 7 | Missing: Holiday Mass | not in data | Added `daily_mass`/`civil_holiday`/08:30 at church |
| 8 | Missing: Holy Thursday 7PM Bilingual | not in data | Added `holy_thursday_mass`/`holy_thursday`/19:00 |
| 9 | Missing: Good Friday Stations 3PM Bilingual | not in data | Added `stations_of_cross`/`good_friday`/15:00 (Via Sacra) |
| 10 | Missing: Good Friday Passion 7PM Bilingual | not in data | Added `good_friday_service`/`good_friday`/19:00 |
| 11 | Church address missing city/state | "438 Winsor Street, 01056" | "438 Winsor Street, Ludlow, MA 01056" |
| 12 | Clergy used `title` not `role`, had parochial vicar | `[{title: "Pastor"...}, {title: "Parochial Vicar"...}]` | Fixed to `role`, kept pastor only per convention |

**Services verified correct (no changes):** Sat 4PM vigil (en), Sun 9AM (pt) + 11AM (en), 5 weekday masses at chapel (Mon/Wed/Thu 8:30 pt, Tue/Fri 5:30 pt), Thu adoration 9-8, Sat confession 3-4, Lenten Fri 5:30 bilingual Mass + Stations.

**Portuguese parish notes:** Primary liturgical language is Portuguese. Weekday masses all in Portuguese at chapel. Only Sat vigil and Sun 11AM are English. Bilingual services during Lent/Holy Week. OFM Conventual Franciscan staffing.

**Chapel of The Little Shepherds:** On same property as main church (same address). Used for weekday masses, First Friday/Saturday, and First Saturday vigil. Coordinates set to null — shares church lat/lng in practice.

**Lenten Friday overlap:** Regular Friday 5:30 PM Mass is Portuguese. Lenten Friday 5:30 PM is bilingual. During Lent, the bilingual version effectively replaces the Portuguese-only one. Both entries remain — the Lenten entry has `seasonal.season: "lent"`.

**Bulletin items NOT entered (events):**
- Lenten Confession March 6, 7-8 PM — single-date event, not a recurring service

### parish_038 — St. Elizabeth Parish, Ludlow (2026-03-04)

| # | Issue | Was | Fixed To |
|---|-------|-----|----------|
| 1 | All services missing location_id | `null` on all 10 | Set to `st-elizabeth-church-ludlow` |
| 2 | Church address had rectory mixed in, missing city/state | "191 Hubbard Street, 01056 Rectory: 181 Hubbard Street, 01056" | "191 Hubbard Street, Ludlow, MA 01056" |
| 3 | Clergy empty | `[]` | Added Rev. Msgr. Homer P. Gosselin (pastor) |

**All services verified correct (no changes):** Sat 4PM vigil, Sun 7:30/9:15/11/5PM, weekday 7:30 AM, holy day vigil 5:30 + feast 8:30 & 7PM, Sat confession 2:30-3:30.

**No deacon in bulletin** — pastor only for clergy.

**Bulletin items NOT entered (events):**
- Bible Study: Wed 6:30-8 PM, Parish Center — recurring educational event (facilitated by Keith Messier). Skipping March 18 & 25 for Parish Mission and Penance Service.
- Time Talent Treasure church cleaning: 2nd Sat 10-11 AM — monthly volunteering event (contact Deb Gendreau 413-505-9760)

---

## Admin Panel Improvements Needed

### Blocking Validations (prevent bad entry)

| # | Rule | Trigger | Behavior |
|---|------|---------|----------|
| 1 | **Non-vigil Saturday Mass must be `daily_mass`** | `type: sunday_mass` + `day: saturday` + time before 14:00 | Warning: "Saturday morning Masses are typically Daily Mass, not Sunday obligation. Only the vigil (typically 4 PM+) should be `sunday_mass`." Block save unless overridden. |

### Smart Suggestions (guide correct entry)

| # | Scenario | Suggestion |
|---|----------|------------|
| 2 | User selects `devotion` type | Show hint: "Consider using a specific type if available: `divine_mercy`, `rosary`, `holy_hour`, `miraculous_medal`, `novena`, `benediction`, `vespers`" |
| 3 | User selects `sunday` day + adds recurrence for week 1 | Show hint: "Consider using `first_sunday` instead of `sunday` + recurrence" |
| 4 | User selects a `first_*` day value | Auto-hide recurrence fields (recurrence is redundant when day already encodes the pattern) |

### Missing Admin Capabilities

| # | Gap | Description |
|---|-----|-------------|
| 5 | No way to enter `language` other than default `en` | Admin service modal needs a language dropdown (en, pl, es, la, etc.) — St. Stanislaus has Polish services |
| 6 | No seasonal toggle in service modal | Need a way to mark services as Lent-only, Advent-only, etc. |
| 7 | No multi-location awareness in service modal | Parishes with 2+ locations need a location picker. St. Agnes has church + chapel with different schedules. |
| 8 | No Holy Week service entry workflow | Adding Palm Sunday, Triduum, Easter services is tedious — need a "Holy Week wizard" or template that pre-fills the standard services. |
| 9 | No duplicate detection across type variants | Holy day services were duplicated as both `daily_mass` and `sunday_mass` — admin panel should catch same day+time entries regardless of type. |
| 10 | Events need richer description support | User wants contact info, volunteer instructions, full descriptions surfaced to end users (e.g., "Call Justin Brown at 413-362-5064"). Current `notes` field is too limited. |

---

## Schema / Convention Questions

| # | Question | Context |
|---|----------|---------|
| 1 | Should we add `second_sunday`, `third_sunday` etc. as day values? | Currently only `first_sunday` exists. St. Stanislaus has a 2nd Sunday devotion — we used `sunday` + `recurrence: {week: 2}` which works but is inconsistent with `first_sunday` pattern |
| 2 | Should `first_sunday` day value make `recurrence` redundant? | Currently nothing prevents setting both. Admin panel should auto-clear recurrence when a `first_*` day is selected. |
| 3 | Saturday Mass type heuristic — where's the vigil cutoff? | Proposed: before 2 PM = `daily_mass`, 2 PM+ = likely `sunday_mass` vigil. Needs convention in DATA_STANDARDS.md. |
| 4 | Holy day obligation Masses — `sunday_mass` or `daily_mass`? | Both were used for St. Agnes holy days. Convention unclear. Proposal: use `daily_mass` with `holyday`/`holyday_eve` day (obligation is implied by the day value). |
| 5 | Should events.json support a `description` field (longer text) + `contact` object? | Current `notes` is a short string. User wants to surface volunteer signup, phone numbers, meal details. Propose: `description` (markdown string) + `contact: {name, phone, email}`. |
| 6 | Holy Week services: one-time dates vs recurring day values? | Currently using day values (`palm_sunday`, `easter_sunday`, etc.) which repeat annually. Alternative: use actual dates in events.json. Day values feel right since these are permanent schedule items. |
| 7 | **Bulletin date-listing vs. recurring service** — how to parse? | Bulletins often list "Adoration on Monday March 09" for what's actually a recurring service. Convention needed: cross-reference past bulletins; if same service appears weekly/monthly, enter as recurring. If truly one-off, use events.json with a `date`. |
| 8 | **Cross-parish events in bulletins** — where do they go? | Bulletins advertise events at other locations (e.g., Lenten Retreat at Jericho Center in Holyoke). Options: (a) Skip entirely, (b) Add as event with no `parish_id` (regional event), (c) Add to the hosting parish if in our data, (d) Add to the bulletin parish with `external: true` flag. Recommendation: if the host is in our data, add there. If not, add as a regional event with `parish_id: null` and a `location` object (see below). |
| 8b | **External event `location` object schema** | When `parish_id` is null (no linked parish), events need a standalone location for calendar invites (.ics LOCATION field) and map links (Apple Maps / Google Maps). Proposed schema: `location: { name: "Jericho Celebration Center", address: "537 Northampton St", city: "Holyoke", state: "MA", zip: "01040" }`. The app can build a map URL from address+city+state+zip and a full address string for .ics exports. When `parish_id` IS set, the existing `location_id` reference handles this. |
| 9 | **Mon-Thu Mass schedule — need a day value?** | `weekday` = Mon-Fri. No way to express Mon-Thu cleanly. Currently using 4 individual entries which is correct but verbose. Consider adding `mon_thu` or just accept individual entries as the convention for non-standard weekday patterns. |
| 10 | **Mon-Sat devotions/confession — `daily` vs `weekday`+`saturday`?** | `daily` = all 7 days. `weekday` = Mon-Fri. For Mon-Sat patterns (common for pre-Mass devotions/confession), we need `weekday` + separate `saturday` entry. Could add `mon_sat` day value, or accept 2 entries as convention. |
| 11 | **Church address vs. office address in location data** | Some parishes have the church on a different street than the office. Location should always be the CHURCH address (where services happen), not the mailing/office address. Office address belongs in `contact`. Propose adding `contact.office_address` field. |
| 12 | **Confession on a single weekday covering Mon-Sat range** | parish_028 had confession listed as just `monday` when it meant Mon-Sat. Admin panel should warn if a confession entry uses a single weekday — prompt: "Did you mean weekday (Mon-Fri) or daily?" |
| 13 | **Bilingual Mass language tagging** | Masses celebrated in two languages (e.g., "English/Polish") — currently tagged as primary language with notes. Should we support `languages: ["en", "pl"]` array? Or is `language` + notes sufficient? Affects search/filter if users filter by language. |
| 14 | **Holy Saturday as a day value** | Need `holy_saturday` for tomb visits, food blessings, Easter Vigil prep. Currently not in DATA_STANDARDS.md day values list. Easter Vigil uses `easter_vigil` but pre-vigil events need a separate day. |
| 15 | **Cultural/ethnic traditions as service types** | Polish Swieconka (food blessing), Resurrection Procession — these are cultural liturgical traditions. Currently using `adoration` or `easter_sunday_mass` with notes. Consider adding `blessing` service type for food blessings, or keep as notes. |

---

### parish_039 — St. Patrick Parish, Monson (2026-03-04)

Multi-site parish: St. Patrick (Monson) + St. Christopher (Brimfield). Data was severely incomplete — missing entire second location and half the services.

| # | Issue | Was | Fixed To |
|---|-------|-----|----------|
| 1 | Missing St. Christopher location entirely | 1 location | Added: 16 Sturbridge Rd, Brimfield, MA 01010 |
| 2 | All 10 services had null location_ids | null | Assigned to st-patrick or st-christopher |
| 3 | Missing Sat 6PM vigil Mass at St. Christopher's | — | Added sunday_mass sat 18:00 |
| 4 | Missing Sun 10:30 AM Mass at St. Christopher's | — | Added sunday_mass sun 10:30 |
| 5 | Missing Mon 9AM daily Mass at St. Christopher's | — | Added daily_mass mon 09:00 |
| 6 | Missing Wed 9AM daily Mass at St. Christopher's | — | Added daily_mass wed 09:00 |
| 7 | Missing confession at St. Christopher's (after 6PM Mass) | — | Added confession sat 18:45 (inferred time) |
| 8 | Missing Miraculous Medal Wed 9AM at St. Christopher's | — | Added miraculous_medal wed 09:00 |
| 9 | Duplicate Miraculous Medal Tue 8AM (2 entries) | devot-tue-0800 + mirac-tue-0800 | Removed devot-tue-0800 |
| 10 | Generic `devotion` for St. Peregrine Novena | type: devotion | Removed (novena entry covers it) |
| 11 | Excess clergy (emeritus deacon beyond pastor+1) | 3 clergy | Dropped Deacon Pellissier (emeritus) |
| 12 | Address missing full format | "22 Green St., Monson, MA" | "22 Green Street, Monson, MA 01057" |
| 13 | Secondary phone not captured | — | Added 413-245-7274 for St. Christopher's office |

**Services: 10 → 14** (removed 2 duplicates, added 6 new)

**Events logged (6):**
- Martha/Mary Bake Sale (Mar 7-8) → social
- Monthly Church Cleaning (2nd Saturday) → volunteering (recurring with recurrence)
- Spiritual Life Book Club (May 5) → educational
- Lenten Mission: Walk in Faith (Mar 16-19) → devotional (multi-date series)
- Women of the Bible Study (Thu 10-11 AM, ongoing) → educational (recurring)
- Eucharistic Adoration (Mar 8, one-time) → devotional

**New issue pattern discovered:**
- Multi-site parish with completely missing second worship site — all services lacked location assignment

---

### parish_041 — St. Elizabeth of Hungary, North Adams (2026-03-04)

| # | Issue | Was | Fixed To |
|---|-------|-----|----------|
| 1 | Clergy array empty | `[]` | Added pastor (Fr. Wudarski) + deacon (Galli) |
| 2 | Weekday confession but no Wed confession | `day: "weekday"` | Split to 4 entries (Mon/Tue/Thu/Fri) |
| 3 | Missing adoration chapel service | — | Added adoration daily 07:00–22:00 |
| 4 | Missing Lenten rosary (Fri 6PM) | — | Added rosary fri 18:00 seasonal/lent |
| 5 | Daily Mass missing morning prayer context | no note | Added "Morning Prayer at 7:50 AM" to daily_mass notes |

**Services: 14 → 19** (removed 1 incorrect weekday confession, added 4 individual + adoration + Lenten rosary)

**Verified correct:**
- Weekend Masses (4): Sat vigil 4PM, Sun 8:30/10:45/5:30 ✓
- Weekday Masses (4 individual Mon/Tue/Thu/Fri): correct split since Wed is communion service ✓
- Wednesday communion service ✓
- First Saturday sequence (confession 7AM / rosary 7:30 / Mass 8AM) ✓
- Saturday confession 2-3 PM with end_time ✓
- All location_ids assigned ✓

**Events logged (2):**
- Irish Night (Mar 14, Parish Center) → social
- Lenten Family Gathering (Mar 29, Palm Sunday) → educational

**New issue pattern:**
- `weekday` confession covering only 4 of 5 days (Wed excluded) — must split to individual entries

---

### parish_042 — St. Elizabeth Ann Seton, Northampton (2026-03-04)

Multi-location parish (church + chapel). Already well-structured — minor fixes only.

| # | Issue | Was | Fixed To |
|---|-------|-----|----------|
| 1 | Adoration incorrectly marked seasonal/lent | seasonal: lent | year_round; added end_time 19:00 |
| 2 | Missing anointing of sick on First Fridays | — | Added anointing_of_sick first_friday 18:00 |
| 3 | Clergy empty | `[]` | No pastoral staff names in provided bulletin — flagged |

**Services: 15 → 16** (added anointing, fixed adoration)

**Flagged:** New weekend Mass schedule announced for Divine Mercy Sunday (~Apr 12 2026). Current schedule remains valid until then. Changes: Sun 8AM→10AM (Church), Sun 9:30→8:30 (Chapel), Sun 11AM dropped, Sun 12:30→12:00 (Chapel).

**Verified correct:**
- Weekend Masses (5): Sat 4PM vigil, Sun 8/9:30/11/12:30 ✓
- Weekday Masses: Mon/Tue/Wed 7:30 + Fri 12:30 ✓
- Thu Communion Service 7:30 ✓
- Holy Day: Vigil 5:30 Chapel + 7:30 Church ✓
- Confession: Fri 1:10 + Sat 3:15 ✓
- Stations: Fri 5PM Lent ✓
- Spanish Mass tagged es at Chapel ✓
- All location_ids correctly assigned ✓

**Events logged (1 new):**
- Coffee Hour (1st Sunday monthly, Youth Center) → social

**New issue pattern:**
- Upcoming schedule change announced in bulletin — flagged with details for future revisit

---

### parish_106 — Our Lady of Mount Carmel, Springfield (2026-03-04)

**COMPLETE REBUILD** — entire parish data was for the wrong location. Data had Easthampton/55 Payson Ave; bulletin is Springfield/123 William St. Placeholder phone, wrong website, wrong services, `pf4-*` IDs.

| # | Issue | Was | Fixed To |
|---|-------|-----|----------|
| 1 | Wrong town | Easthampton | Springfield |
| 2 | Wrong address | 55 Payson Ave, Easthampton 01027 | 123 William St, Springfield 01105 |
| 3 | Placeholder phone | 413-555-0404 | 413-734-5433 |
| 4 | Wrong website | mtcarmelparish.org | olmcspringfield.org |
| 5 | Wrong email | olmc@mtcarmelparish.org | mountcarmelrectoryoffice@gmail.com |
| 6 | Wrong county | Hampshire | Hampden |
| 7 | Ghost Spanish Sunday Mass | es Sun 12PM | Removed (not in bulletin) |
| 8 | Wrong weekday Mass | weekday 7:30AM | M/Tu/W/F 12:10PM (4 individual) |
| 9 | Wrong devotions | miraculous_medal Wed, Fri adoration, Thu holy_hour/confession | St. Anthony Novena Tue 6:30, Holy Hour Thu 3:30 |
| 10 | Wrong confession | Sat 2:30-3:30 + Thu 7-8 | Sat 3:15-3:45 only |
| 11 | Clergy empty | `[]` | Fr. White CSS + Deacon Farrell |
| 12 | Non-standard IDs | `pf4-*` | `parish_106-*` |

**Services: 10 → 13** (complete replacement)

**New issue pattern:**
- Entire parish data from wrong source/location — required full rebuild

---

### parish_107 — Sacred Heart of Jesus, Milford (2026-03-04)

**COMPLETE REBUILD** — same problem as parish_106. Data had Granville/218 Main Road; bulletin is Milford/5 East Main St. Placeholder phone (413-555-0505), made-up email, wrong services, `pf5-*` IDs.

| # | Issue | Was | Fixed To |
|---|-------|-----|----------|
| 1 | Wrong town | Granville | Milford |
| 2 | Wrong address | 218 Main Road, Granville 01034 | 5 East Main Street, Milford 01757 |
| 3 | Placeholder phone | 413-555-0505 | 508-634-5435 |
| 4 | Made-up email | sacredheart@granvillecatholic.org | Removed (none in bulletin) |
| 5 | No website | null | sacredheartmilford.org |
| 6 | Wrong county | Hampden | Worcester |
| 7 | Wrong services (3 total) | Sun 9AM, Thu Mass, Thu confession | Complete rebuild |
| 8 | Non-standard IDs | `pf5-*` | `parish_107-*` |
| 9 | No clergy | `[]` | Fr. Scioli CSS + Deacon Mussulli |

**Services: 3 → 16** (complete replacement): 3 weekend, 4 weekday (M/Tu/W/F), 1 confession, 4 rosary (after Mass), 2 Lenten (stations + benediction), 2 Holy Week (Holy Thursday + Good Friday)

**Events logged (2):**
- Bible Study (Wed 3-4:15 PM, Bell Tower Room) → educational
- Catechism of Catholic Beliefs (Wed 6:30-8 PM, Bell Tower Room) → educational

**Note:** Milford MA is in Worcester County (Diocese of Worcester), not Diocese of Springfield. Parish may be outside primary coverage area.

---

### parish_104 — Immaculate Heart of Mary, Granby (2026-03-04)

**COMPLETE REBUILD** — third `pf*-` prefix parish. Data had Westfield/256 Orange St; bulletin is Granby/256 State St. Placeholder phone, made-up email/website, wrong services.

| # | Issue | Was | Fixed To |
|---|-------|-----|----------|
| 1 | Wrong town | Westfield | Granby |
| 2 | Wrong address | 256 Orange St, Westfield 01085 | 256 State St, Granby 01033 |
| 3 | Placeholder phone | 413-555-0202 | 413-467-9821 |
| 4 | Wrong website | ihmwestfield.org | ihmparishgranby.org |
| 5 | Wrong email | parish@ihmwestfield.org | Removed (none in bulletin) |
| 6 | Wrong weekend Masses | Sat 5PM, Sun 8:30/11 | Sat 4PM, Sun 8/10:45 |
| 7 | Wrong daily Mass | weekday 8AM + Thu 5:30PM | Mon-Thu 8:30AM (4 individual) |
| 8 | Wrong confession | Sat 3:30-4:45 + Thu 4:30-5:15 | Sat 3:00-3:45 + before every Mass |
| 9 | Ghost services | Wed adoration, rosary, divine mercy | Removed (not in bulletin) |
| 10 | No clergy | `[]` | Fr. Goodreau + Deacon Mazzariello |
| 11 | Non-standard IDs | `pf2-*` | `parish_104-*` |

**Services: 10 → 9** (complete replacement): 3 weekend, 4 weekday (Mon-Thu), 1 confession, 1 Lenten stations

**Events logged (4):**
- AA meetings (Tue 7:30 PM, recurring) → community
- Deanery Penance Service (Mar 8, hosted at parish_028) → devotional (cross-parish)
- Holy Hour (Mar 18, one-time) → devotional
- Lenten Confessions (Mar 18/25, Apr 1, multi-date) → devotional

**Pattern confirmed:** Three consecutive `pf*-` prefix parishes (pf2, pf4, pf5 → parish_104, _106, _107) all have same injection failure: wrong town, placeholder phones, fabricated contact info, wrong services. Likely batch-imported from an incorrect source.
