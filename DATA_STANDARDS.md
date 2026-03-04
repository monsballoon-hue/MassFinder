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
| `daily_mass` | Weekday Masses, First Friday/Saturday Masses |
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
| `first_friday` | First Friday of month | Monthly First Friday devotions/masses |
| `first_saturday` | First Saturday of month | Monthly First Saturday devotions/masses |
| `first_sunday` | First Sunday of month | Monthly First Sunday events |
| `first_thursday` | First Thursday of month | Monthly First Thursday events |
| `fourth_friday` | Fourth Friday of month | Monthly fourth Friday events |
| `holyday` | Holy Day of Obligation | Holy Day Mass schedules |
| `holyday_eve` | Vigil of Holy Day | Evening before a Holy Day |
| `lent` | During Lent | Lenten-only services |
| `good_friday` | Good Friday | Good Friday services |
| `holy_thursday` | Holy Thursday | Holy Thursday services |
| `easter_vigil` | Holy Saturday night | Easter Vigil |
| `palm_sunday` | Palm Sunday | Palm Sunday |
| `easter_sunday` | Easter Sunday | Easter Sunday |
| `civil_holiday` | Civil holidays | Holiday schedule Mass |

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
- `parish_id` — links to parish in parish_data.json
- At least one of: `date`, `dates`, or `day`

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
