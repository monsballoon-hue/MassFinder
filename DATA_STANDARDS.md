# MassFinder Data Standards

This document defines the authoritative conventions for structuring services and events in MassFinder. All data entry (manual or via admin panel) should follow these rules.

---

## Services vs Events

| | Services (`parish_data.json`) | Events (`events.json`) |
|---|---|---|
| **Nature** | Regularly recurring, indefinite schedule items | Time-bounded happenings |
| **Examples** | Mass, Confession, Adoration, Rosary | Fish fry, retreat, Lenten series, social gathering |
| **Duration** | Ongoing until manually changed | Expires after date(s) pass |
| **Tied to** | A parish's permanent schedule | A parish's calendar/bulletin |

**Rule of thumb:** If it appears on a parish's weekly schedule year after year, it's a **service**. If it has a start/end or specific dates, it's an **event**.

---

## Services (parish_data.json)

### Service Types

| Type | Use For |
|------|---------|
| `sunday_mass` | All Sunday obligation Masses, including Saturday vigils |
| `daily_mass` | Weekday Masses, First Friday/Saturday Masses, **Holy Day Masses** |
| `communion_service` | Eucharistic service without a priest (not a Mass) |
| `confession` | Reconciliation / Confession |
| `adoration` | Eucharistic Adoration (scheduled hours) |
| `perpetual_adoration` | 24/7 adoration chapel |
| `holy_hour` | Structured holy hour |
| `rosary` | Rosary |
| `divine_mercy` | Divine Mercy Chaplet |
| `stations_of_cross` | Stations of the Cross |
| `miraculous_medal` | Miraculous Medal Novena |
| `novena` | Other novenas |
| `benediction` | Benediction of the Blessed Sacrament |
| `vespers` | Evening Prayer / Vespers |
| `gorzkie_zale` | Polish Bitter Lamentations (Lenten) |
| `devotion` | Generic devotion (use specific type when possible) |
| `blessing` | Blessings (food blessing / Swieconka, etc.) |
| `anointing_of_sick` | Communal Anointing of the Sick |
| `prayer_group` | Prayer group meetings |
| `holy_thursday_mass` | Holy Thursday Mass of the Lord's Supper |
| `good_friday_service` | Good Friday service |
| `easter_vigil_mass` | Easter Vigil |
| `palm_sunday_mass` | Palm Sunday Mass |
| `easter_sunday_mass` | Easter Sunday Mass |

### Day Values

| Value | Meaning | When to Use |
|-------|---------|-------------|
| `monday`–`sunday` | Specific day of week | Default for most services |
| `weekday` | Mon–Fri | When **all 5 days** have identical time, location, language |
| `daily` | All 7 days | When every day is the same |
| `first_friday` | First Friday of month | First Friday devotions/masses (devotional significance) |
| `first_saturday` | First Saturday of month | First Saturday devotions/masses (devotional significance) |
| `holyday` | Holy Day of Obligation | Holy Day Mass schedules |
| `holyday_eve` | Vigil of Holy Day | Evening before a Holy Day |
| `lent` | During Lent | Lenten-only services |
| `good_friday` | Good Friday | Good Friday services |
| `holy_thursday` | Holy Thursday | Holy Thursday services |
| `holy_saturday` | Holy Saturday (daytime) | Food blessings, tomb visits, pre-vigil events |
| `easter_vigil` | Holy Saturday night | Easter Vigil |
| `palm_sunday` | Palm Sunday | Palm Sunday |
| `easter_sunday` | Easter Sunday | Easter Sunday |
| `civil_holiday` | Civil holidays | Holiday schedule Mass |

**Only `first_friday` and `first_saturday` have special day values** because they carry devotional significance (Sacred Heart / Immaculate Heart). All other nth-week patterns (1st Sunday, 2nd Tuesday, 4th Friday, etc.) use the base day + `recurrence` field. See [Recurrence](#recurrence-nth-week-patterns) below.

**Deprecated day values** (do not use): `first_sunday`, `first_thursday`, `fourth_friday`. Convert to base day + recurrence.

### Weekday Consolidation Rule

**Prefer one `weekday` record over five individual day records** when all conditions match:
- Same time
- Same location
- Same language
- Same seasonal scope

| Scenario | Correct Approach |
|----------|-----------------|
| Daily Mass Mon–Fri at 8:00 AM, same church | One record: `day: "weekday", time: "08:00"` |
| Daily Mass Mon/Wed at 8:00, Tue/Thu at 9:00 | Four individual records |
| Daily Mass Mon–Fri at 8:00, but Mon at a different church | Five individual records |
| Daily Mass Mon–Thu at 8:00, Fri at 8:00 (Lent only) | Four individual + one with `seasonal.season: "lent"` |

The renderer auto-collapses 3+ identical weekday entries into "Mon – Fri", but clean data is always preferred.

### Mon–Thu, Mon–Sat, and Other Partial-Week Patterns

There are no special day values for partial-week patterns. Use individual entries or combine `weekday` + `saturday`:

| Pattern | Approach |
|---------|----------|
| Mon–Thu (no Friday) | 4 individual entries (`monday`, `tuesday`, `wednesday`, `thursday`) |
| Mon–Sat | `weekday` (Mon–Fri) + separate `saturday` entry |
| Mon–Sat identical | Same as above — two entries, not six |
| Tue & Fri only | 2 individual entries |

### First Friday / First Saturday Rules

The `day` field classifies **when** (monthly occurrence). The `type` field classifies **what** (the actual service).

| Service | Correct Entry |
|---------|---------------|
| First Friday Mass | `type: "daily_mass", day: "first_friday"` |
| First Friday Adoration | `type: "adoration", day: "first_friday"` |
| First Friday Confession | `type: "confession", day: "first_friday"` |
| First Saturday Mass | `type: "daily_mass", day: "first_saturday"` |
| First Saturday Rosary | `type: "rosary", day: "first_saturday"` |

**Never use `sunday_mass` for a First Saturday Mass.** Use `daily_mass`. The First Saturday Mass is not a Sunday obligation Mass.

The app automatically routes First Friday/Saturday masses into the "Prayer & Devotion" accordion section (not "Mass Schedule") with special header labels ("Devotion to the Sacred Heart of Jesus" / "Devotion to the Immaculate Heart of Mary").

### Saturday Vigil Mass

Model as: `type: "sunday_mass"`, `day: "saturday"`, `notes: "Vigil Mass"`

There is no separate `vigil` type. The combination of sunday_mass + saturday signals it's a vigil.

**Saturday Mass cutoff rule:** A Saturday Mass at **2:00 PM or later** is a vigil (`sunday_mass`). Before 2:00 PM, it's a regular daily Mass (`daily_mass`). Example: Saturday 7:00 AM Mass → `daily_mass`. Saturday 4:00 PM Mass → `sunday_mass` (vigil).

### Holy Day of Obligation Masses

All Holy Day Masses use `type: "daily_mass"` with day values `holyday` or `holyday_eve`. Do **not** use `sunday_mass` for holy day Masses — the obligation is implied by the day value, not the type.

### Recurrence (nth-week patterns)

For services that occur on specific weeks of the month (e.g., "2nd Tuesday"):

```json
{
  "type": "confession",
  "day": "tuesday",
  "time": "18:00",
  "recurrence": { "type": "nth", "week": 2 }
}
```

For multiple weeks (e.g., "1st & 3rd Tuesday"):
```json
{
  "recurrence": { "type": "nth", "weeks": [1, 3] }
}
```

### Language Tagging

| Scenario | Approach |
|----------|----------|
| Single-language service | `language: "en"` (or `"es"`, `"pl"`, `"pt"`, `"la"`) |
| Bilingual service | `languages: ["es", "en"]` — array of ISO 639-1 codes |
| Service with occasional bilingual notes | `language: "en"`, add note in `notes` field |

When `languages` array is present, it takes precedence over `language` for filtering. The UI should display "Bilingual (Spanish/English)" rather than raw codes.

### Seasonal Values

Every service has a `seasonal` object with `is_seasonal` (boolean) and `season` (string):

```json
// Year-round (default for most services):
{ "seasonal": { "is_seasonal": false, "season": "year_round" } }

// Seasonal:
{ "seasonal": { "is_seasonal": true, "season": "lent" } }
```

| Season Value | When | `is_seasonal` |
|-------------|------|---------------|
| `year_round` | Always active (default) | `false` |
| `lent` | Ash Wednesday through Holy Thursday | `true` |
| `advent` | 4 weeks before Christmas | `true` |
| `holy_week` | Palm Sunday through Easter | `true` |
| `easter_season` | Easter through Pentecost | `true` |
| `academic_year` | School year (Sept–June) — services that change location seasonally | `true` |
| `summer` | Summer schedule (June–Aug) | `true` |

The schema also allows `winter` and `ordinary_time` but these are not currently used.

**Do NOT use:** `christmas`, `easter` (deprecated — use `advent` and `easter_season` respectively).

### Location & Address Conventions

- **Location address** = the **church/chapel address** (where services happen), never the office/mailing address.
- **Office address** belongs in `contact.office_address` (if different from the church).
- Addresses should always include city and state: `"134 Main Street, Lenox, MA 01240"` — not just street + zip.
- Multi-location parishes: each location gets its own entry in `locations[]`. Every service must have a `location_id` pointing to one of them.

### Bulletin Interpretation

When a bulletin lists a service on a specific date (e.g., "Adoration on Monday March 09"):
- **Default assumption:** recurring service. Enter as `day: "monday"` in parish_data.json.
- **Only use events.json** if the service is clearly one-time (unique event, not on the weekly schedule).
- Cross-reference past bulletins when possible. If the same service appeared previously on the same weekday, it's recurring.

### Benediction Rule

- **Standalone Benediction** (scheduled on its own): use `type: "benediction"`
- **Benediction paired with Adoration** (e.g., "Adoration 3-4 PM with Benediction"): fold into the `adoration` entry with a note — do NOT create a separate `benediction` service

### Perpetual Adoration Threshold

- `perpetual_adoration`: only for truly **24/7** adoration chapels (open around the clock, every day)
- `adoration`: for all scheduled-hours adoration, even if 15-16 hours/day, 7 days/week — if there are posted open/close times, it's `adoration`, not `perpetual_adoration`

### Devotion Cycle Principle

When a parish has a sequence of devotions (e.g., Rosary 6:25 AM → Mass 7:00 AM → Divine Mercy 7:30 AM), create **separate service entries** for each devotion. Do not collapse them into one entry with notes. Each devotion should be independently discoverable via search and filtering.

### "After Mass" Confession Estimation

When a bulletin says "Confession after Mass" with no specific time, **estimate the start time** as Mass start + 45 minutes. Add an explanatory note (e.g., `notes: "After 5:30 PM Vigil Mass"`). This ensures the service appears in time-based searches and sorting.

### Communion Service / Mass Alternating Weeks

When a parish alternates between a communion service (most weeks) and a Mass (e.g., 3rd Friday), model as:
- **Communion service** as the default entry (no recurrence) — this is what happens most weeks
- **Mass** with `recurrence: { type: "nth", week: N }` — this is the exception
- The recurrence goes on the **exception** (the Mass), not on the default (communion service)

### Clergy Conventions

- Use the `clergy` array (not `staff`) for pastor/deacon names.
- Keep **lead priest + one deacon** only. Drop parochial vicars, priests in residence, retired deacons, etc.
- Use `role` field (not `title`).

**Valid roles (by priority):**

| Role | Use For |
|------|---------|
| `pastor` | Parish pastor (most common) |
| `pastor_and_director` | Pastor who is also director of a merged community |
| `administrator` | Parish administrator (when no pastor is assigned) |
| `co_pastor` | Co-pastor in a shared leadership arrangement |
| `rector` | Rector (typically at basilicas or shrines) |
| `vice_rector` | Vice rector |
| `provisional_priest` | Temporary/supply priest |
| `pastoral_minister` | Lay pastoral minister (when no priest is assigned) |
| `deacon` | Active deacon |
| `deacon_emeritus` | Emeritus deacon (still serving) |
| `deacon_retired` | Retired deacon |

**Roles that exist in data but should NOT be added for new entries** (per "lead priest + one deacon" rule):
- `parochial_vicar` — exists on 4 parishes, do not add new ones
- `retired_in_residence` — exists on 2 parishes, do not add new ones

---

## Events (events.json)

### Categories

| Category | Use For |
|----------|---------|
| `yc` | Young & Catholic events (requires `date`, `location_id`) |
| `community` | General community events |
| `social` | Social gatherings (coffee hour, potluck) |
| `fellowship` | Fellowship programs |
| `educational` | Bible study, classes, lecture series |
| `liturgical` | Liturgical events (Tenebrae, Blessing of Baskets) |
| `devotional` | Special devotional events |
| `volunteering` | Service/volunteer opportunities |

### Date Fields

Events support three mutually exclusive scheduling modes:

| Mode | Fields | Example |
|------|--------|---------|
| **One-time** | `date: "2026-03-15"` | Single date event |
| **Multi-date series** | `dates: ["2026-03-04", "2026-03-11", "2026-03-18"]` | Series of specific dates |
| **Recurring** | `day: "wednesday"` | Repeats weekly |

**Rules:**
- Use exactly one of `date`, `dates`, or `day` per event
- Never combine them (e.g., don't set both `date` and `day`)
- `end_date` can be used with any mode to set when the event stops appearing
- For multi-date series, `end_date` defaults to the last date in the array

### Expiration

| Scenario | Expires When |
|----------|-------------|
| Has `end_date` | After `end_date` |
| Has `date` (no `end_date`) | After `date` |
| Has `dates` array (no `end_date`) | After the last date in array |
| Has only `day` (recurring) | Never (evergreen) — remove manually or set `end_date` |

### Multi-Date Series Example

A Lenten confession schedule on specific Wednesdays:

```json
{
  "id": "parish_042-evt-lenten-confessions",
  "category": "devotional",
  "title": "Lenten Confessions",
  "parish_id": "parish_042",
  "dates": ["2026-03-04", "2026-03-11", "2026-03-18", "2026-03-25"],
  "time": "15:00",
  "end_time": "16:00",
  "end_date": "2026-03-25",
  "notes": "Extra confession times during Lent",
  "seasonal": { "is_seasonal": true, "season": "lent" }
}
```

### Required Fields

All events must have:
- `id` — unique identifier (format: `parish_XXX-evt-slug`)
- `title` — human-readable event name
- `parish_id` — links to parish in parish_data.json (or `null` for regional events)
- At least one of: `date`, `dates`, or `day`

### Optional Rich Fields

| Field | Type | Purpose |
|-------|------|---------|
| `description` | string | Longer description (supports markdown). Use for volunteer instructions, detailed info. |
| `contact_name` | string | Contact person name |
| `contact_email` | string | Contact email |
| `contact_phone` | string | Contact phone number |
| `image_url` | string | URL to event flyer/image (for embedding in event card popup) |
| `flyer_url` | string | URL to downloadable flyer PDF |
| `venue_name` | string | Venue name (especially for non-parish locations) |
| `venue_address` | string | Full address for calendar invites / map links |

### Cross-Parish & Regional Events

Events advertised in one parish's bulletin but hosted elsewhere:

| Scenario | Approach |
|----------|----------|
| Host parish is in our data | Add event to the **hosting parish** (`parish_id` = host) |
| Host is NOT in our data | Add as regional event: `parish_id: null`, set `venue_name` + `venue_address` |
| Event at external venue | Set `venue_name` and `venue_address` for map links / calendar invites |

When `parish_id` is `null`, the app uses `venue_address` for map links (Apple Maps / Google Maps) and `.ics` calendar exports instead of resolving via `location_id`.

---

## ID Conventions

### Service IDs
Format: `{parish_id}-{type_abbr}-{day_abbr}-{time}-{location_abbr}`

Examples:
- `parish_001-smass-sat-1600-notre` (Sunday Mass, Saturday, 4:00 PM, Notre Dame)
- `parish_001-dmass-wkday-0900` (Daily Mass, weekday, 9:00 AM)
- `parish_013-ador-1fri-0645` (Adoration, First Friday, 6:45 AM)

### Event IDs
Format: `{parish_id}-evt-{slug}`

Examples:
- `parish_001-evt-coffee` (Coffee Hour)
- `parish_042-evt-lenten-reflections` (Lenten Reflections series)
- `yc-2026-03-02-stj` (YC event format)
