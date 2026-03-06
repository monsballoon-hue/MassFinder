# Parish Validation Checklist

Run every check against each parish during bulletin validation. When a new issue type is discovered, add it here. This checklist becomes the spec for admin panel validation rules.

---

## 1. Location Data

- [ ] **All services have a non-null `location_id`** — most common issue across all parishes
- [ ] **Church address includes city + state** — format: "123 Main St, Springfield, MA 01101" (not just street + zip)
- [ ] **No office/rectory address in location** — church address only; office goes in `contact.office_address`
- [ ] **Multi-location parishes**: every worship site has its own entry in `locations[]`; services point to the correct one
- [ ] **Chapel on same property**: add as separate location with same address if services are held there

## 2. Service Types

- [ ] **Saturday Mass before 2 PM** → `daily_mass` (not `sunday_mass`)
- [ ] **Saturday Mass at 2 PM or later** → `sunday_mass` (vigil)
- [ ] **First Friday/Saturday Mass** → `daily_mass` (never `sunday_mass`)
- [ ] **Holy Day Mass** → `daily_mass` with `holyday` or `holyday_eve` day (never `sunday_mass`)
- [ ] **Specific devotion types used** — not generic `devotion` when a specific type exists (divine_mercy, rosary, miraculous_medal, holy_hour, benediction, gorzkie_zale, blessing, novena, vespers)
- [ ] **Devotions buried in notes** — if a rosary, divine mercy, or other devotion is mentioned in another service's notes, extract it as its own service entry
- [ ] **Standalone benediction vs paired** — standalone = `benediction` type; paired with adoration = fold into `adoration` entry with note
- [ ] **Perpetual adoration threshold** — only use `perpetual_adoration` for truly 24/7 chapels; posted hours = `adoration`
- [ ] **Communion service vs Mass alternating** — communion is default (no recurrence), Mass is the exception (with recurrence)

## 3. Day Values

- [ ] **No deprecated values**: `first_sunday`, `first_thursday`, `fourth_friday` → convert to base day + recurrence
- [ ] **`weekday` only valid when Mon–Fri are identical** (same time, location, language, seasonal scope)
- [ ] **Friday different from Mon-Thu?** → use 4 individual entries + separate Friday entry (don't use `weekday`)
- [ ] **Mon-Thu (no Friday)** → 4 individual entries (monday, tuesday, wednesday, thursday) — no shorthand exists
- [ ] **Mon-Sat pattern** → `weekday` + separate `saturday` entry (2 records, not 6)
- [ ] **Nth-week patterns** → use base day + `recurrence: { type: "nth", week: N }` (except first_friday/first_saturday)

## 4. Completeness — What to Look For in Bulletin

- [ ] **Weekend Masses**: verify all vigils + Sunday masses match
- [ ] **Weekday Masses**: verify days, times, locations; check for split schedules (AM group vs PM group)
- [ ] **Confession**: times, end_times, all locations covered
- [ ] **Adoration**: scheduled hours, First Friday extended hours
- [ ] **First Friday/Saturday**: Mass, adoration, rosary if listed
- [ ] **Holy Day Masses**: vigil + feast day times
- [ ] **Holy Week**: minimum set = `holy_thursday_mass`, `good_friday_service` (Passion), `stations_of_cross` on `good_friday`, `easter_vigil_mass`, `palm_sunday_mass`, `easter_sunday_mass`
- [ ] **Lenten services**: Stations of the Cross, extra confessions, Lenten daily Mass if different from regular
- [ ] **Devotions**: rosary, divine mercy, miraculous medal, holy hour, benediction — each as own service
- [ ] **Prayer groups**: bible study (→ event), prayer for priests (→ service if recurring)
- [ ] **Cultural/ethnic**: Gorzkie Żale (Polish Lent), Via Sacra (Portuguese stations), Swieconka (Polish food blessing)

## 5. Clergy

- [ ] **Uses `role` field** (not `title`)
- [ ] **Lead priest + one deacon only** — drop parochial vicars, priests in residence, retired clergy
- [ ] **Valid roles**: `pastor`, `pastor_and_director`, `administrator`, `co_pastor`, `rector`, `provisional_priest`, `pastoral_minister`, `deacon`, `deacon_emeritus`, `deacon_retired` (see DATA_STANDARDS.md for full list)
- [ ] **Not empty** — every active parish should have at least the pastor

## 6. Language

- [ ] **Non-English services tagged correctly** — `language: "es"`, `"pl"`, `"pt"`, `"la"`
- [ ] **Bilingual services** → `languages: ["es", "en"]` array (schema supports this; takes precedence over `language` for filtering)
- [ ] **Language not just defaulting to `en`** for non-English parishes

## 7. Seasonal Services

- [ ] **Lenten services flagged** — `seasonal: { is_seasonal: true, season: "lent" }`
- [ ] **Lenten overlap with regular schedule**: if a Lenten service replaces a regular one at the same time, both entries exist (seasonal one overrides during Lent)
- [ ] **Holy Week services** — `seasonal.season: "holy_week"`
- [ ] **Valid seasonal values only** — `year_round` (default), `lent`, `advent`, `holy_week`, `easter_season`, `academic_year`, `summer`. NOT `christmas` or `easter` (deprecated)

## 8. Format & Metadata

- [ ] **Source updated** to current bulletin: `source: "bulletin_YYYY-MM"`
- [ ] **Validation set**: `status: "verified"`, `last_checked: "YYYY-MM-DD"`, `bulletin_date: "YYYY-MM"`
- [ ] **Confession end_times present** — if bulletin gives a range, capture both start and end
- [ ] **Time format**: 24-hour `"HH:MM"` — no AM/PM strings
- [ ] **Recurrence on communion service**: verify the recurrence is on the EXCEPTION (mass on 3rd Friday), not the regular service

## 9. Events (for events.json)

- [ ] **One-time dates** → events.json (retreats, penance services, specific-date activities)
- [ ] **Recurring community activities** → events.json with `day` field (bible study, soup suppers)
- [ ] **Cross-parish events** → host parish if in data; regional (`parish_id: null`) if not
- [ ] **Venue info captured** — `venue_name` + `venue_address` for map/calendar integration
- [ ] **Contact info captured** — name, phone, email when available

## 10. Common Gotchas (Discovered During Validation)

- [ ] **"After Mass" confession** — estimate time based on Mass start + ~45 min, add explanatory note
- [ ] **Communion service vs Mass on alternating weeks** — communion is the default, mass is the recurrence exception (not the other way around)
- [ ] **Devotion cycle as separate entries** — Rosary 6:25 → Mass 7:00 → Divine Mercy 7:30 = three service entries, not one with notes
- [ ] **Polish parishes**: check for Gorzkie Żale (Lent Sundays), Droga Krzyżowa (bilingual stations), Swieconka (Holy Saturday)
- [ ] **Portuguese parishes**: check for Via Sacra, bilingual Lenten services, chapel worship sites
- [ ] **Near-perpetual adoration** — if 15-16 hrs/day but not truly 24/7, use `adoration` type (not `perpetual_adoration`)
- [ ] **School-year vs year-round services** — some daily Masses move locations seasonally; use notes, not separate entries
- [ ] **Single-date Lenten confession** — if only one date listed, it's an event, not a recurring service

---

## Issue Registry

New issue types discovered during validation get logged here with the parish where first encountered:

| # | Issue Pattern | First Seen | Rule |
|---|--------------|------------|------|
| 1 | Null location_ids on all services | parish_013+ | All services must have location_id |
| 2 | Saturday AM mass as sunday_mass | parish_013 | Before 2PM = daily_mass |
| 3 | Generic `devotion` instead of specific type | parish_013 | Use divine_mercy, rosary, etc. |
| 4 | Duplicate holy day services (two types) | parish_016 | Use daily_mass only |
| 5 | Rosary/devotion in another service's notes | parish_036 | Extract as separate service |
| 6 | weekday covering Mon-Fri when Fri differs | parish_035 | Split to individual entries |
| 7 | Backward recurrence on communion service | parish_035 | Recurrence goes on the exception |
| 8 | Clergy using `title` instead of `role` | parish_035 | Use `role` field |
| 9 | Church address missing city/state | parish_033+ | Always include city + state |
| 10 | Office address in location field | parish_028 | Church address only; office in contact |
| 11 | Missing chapel/secondary location | parish_029 | Add all worship sites as locations |
| 12 | Single Monday entry representing Mon-Sat | parish_036 | Split to weekday + saturday |
| 13 | Deprecated day values (first_sunday etc.) | parish_005 | Convert to day + recurrence |
| 14 | Lenten service overlap with regular schedule | parish_037 | Keep both; seasonal overrides |
| 15 | "After Mass" confession with no time | parish_033 | Estimate time, add note |
| 16 | Duplicate service entries (same type+day+time) | parish_039 | Remove duplicates; keep the more specific one |
| 17 | Multi-site parish missing entire second location | parish_039 | Add all worship sites; assign every service to a location |
| 18 | Excess clergy beyond pastor + one deacon | parish_039 | Drop emeritus/retired/additional clergy |
| 19 | `weekday` confession but not all 5 days | parish_041 | Split to individual entries for actual days only |
| 20 | Missing adoration chapel hours as service | parish_041 | Add adoration with daily hours if chapel is open |
| 21 | Lenten-only adoration that's actually year-round | parish_042 | Check priest notes/general schedule; don't assume Lent-only |
| 22 | Announced future schedule change in bulletin | parish_042 | Flag parish with details; revisit after effective date |
| 23 | Entire parish data from wrong source/location | parish_106 | Full rebuild needed; verify identity against bulletin before fixing details |
| 24 | Non-standard service ID prefixes | parish_106 | Always use `parish_XXX-` prefix |
