# MassFinder Terminology & Domain Knowledge

> This file exists because liturgical correctness matters to the maintainer and the user base.
> Catholic terminology is precise. Getting it wrong erodes trust with the audience.
> When in doubt, default to USCCB (United States Conference of Catholic Bishops) usage.

---

## Display Names for Service Types

These are the EXACT strings rendered in the UI. Use the `SVC` map in index.html as the source of truth.

| Internal type | Display name | Notes |
|--------------|-------------|-------|
| `sunday_mass` | Sunday Mass | Includes Saturday vigils |
| `daily_mass` | Daily Mass | Weekday, First Friday/Saturday, Holy Day masses |
| `confession` | Confession | NOT "Reconciliation" in the UI (though both are correct theologically) |
| `adoration` | Adoration | Eucharistic Adoration |
| `perpetual_adoration` | Perpetual Adoration | 24/7 chapel |
| `holy_hour` | Holy Hour | Structured hour of prayer before the Blessed Sacrament |
| `communion_service` | Communion Service (no priest) | MUST include "(no priest)" — Canon Law distinction |
| `rosary` | Rosary | The Rosary, not "a rosary" |
| `stations_of_cross` | Stations of the Cross | Always capitalized, always plural |
| `divine_mercy` | Divine Mercy Chaplet | Full name, not just "Divine Mercy" |
| `miraculous_medal` | Miraculous Medal | The Miraculous Medal Novena |
| `novena` | Novena | Generic; use specific type when possible |
| `devotion` | Devotion | Fallback for unclassified devotional services |
| `vespers` | Vespers | Evening Prayer from the Liturgy of the Hours |
| `anointing_of_sick` | Anointing of the Sick | NOT "Last Rites" (common misconception) |
| `holy_thursday_mass` | Mass of the Lord's Supper | Official Roman Missal name for Holy Thursday |
| `good_friday_service` | Celebration of the Passion | NOT "Good Friday Mass" — there is NO Mass on Good Friday |
| `easter_vigil_mass` | Easter Vigil | The Easter Vigil (greatest liturgy of the year) |
| `palm_sunday_mass` | Palm Sunday Mass | |
| `easter_sunday_mass` | Easter Sunday Mass | |
| `gorzkie_zale` | Gorzkie Żale | Polish Lenten devotion. Keep the diacritical ż |
| `prayer_group` | Prayer Group | |
| `benediction` | Benediction | Benediction of the Blessed Sacrament |
| `blessing` | (context-dependent) | e.g., "Easter Food Blessing" / "Święconka" |

---

## Critical Theological Distinctions

### Mass vs. Not-Mass
- A **Mass** requires an ordained priest. If no priest is available, it's a **Communion Service**, not a Mass.
- Good Friday has NO Mass. The service is the "Celebration of the Passion of the Lord."
- The app marks Communion Services with a "Not a Mass" indicator per USCCB guidelines.

### Vigil Mass
- A Saturday evening Mass (2:00 PM or later) fulfills the Sunday obligation → `type: "sunday_mass"`, `day: "saturday"`.
- A Saturday morning Mass (before 2:00 PM) does NOT fulfill Sunday obligation → `type: "daily_mass"`, `day: "saturday"`.
- The display note is "Vigil Mass". Never say "Saturday evening Mass" or "Anticipated Mass."

### First Friday / First Saturday
- **First Friday:** Devotion to the Sacred Heart of Jesus. Monthly, on the first Friday.
- **First Saturday:** Devotion to the Immaculate Heart of Mary. Monthly, on the first Saturday.
- These are devotional occasions, not standalone service types. The `day` field marks the occasion; the `type` field marks what happens (daily_mass, adoration, confession, rosary, etc.).
- First Friday/Saturday masses are NOT Sunday obligation masses. Always `type: "daily_mass"`.
- In the UI, these route to "Prayer & Devotion" accordion section with special devotional headers.

### Holy Days of Obligation
- Six in the US: Immaculate Conception (Dec 8), Christmas (Dec 25), Mary Mother of God (Jan 1), Ascension, Assumption (Aug 15), All Saints (Nov 1).
- Some transfer to Sunday depending on the year. MassFinder does not compute this — it shows the parish's published schedule.
- Holy Day masses use `type: "daily_mass"` with `day: "holyday"` or `day: "holyday_eve"`. Never `sunday_mass`.

### Sacraments Referenced
- **Eucharist** (Holy Communion): received at Mass or Communion Service
- **Reconciliation** (Confession/Penance): the sacrament. UI calls it "Confession" for user familiarity
- **Anointing of the Sick**: NOT "Last Rites" or "Extreme Unction" (pre-Vatican II term)

---

## Parish vs. Church Display Logic

A **parish** is a community of the faithful; a **church** is a building. One parish may have multiple churches (worship sites).

| Scenario | Display as |
|----------|-----------|
| Single-location parish | "[Name] Church" (drop "Parish" suffix for clarity) |
| Multi-location parish | "[Name] Parish" (retain, because it spans buildings) |

The `keepParishIds` set in index.html tracks which parishes retain "Parish" in display. The `displayName()` function handles stripping. When adding new parishes:
- Single worship site → strip "Parish" or "Church" suffix, render as just the name
- Multiple worship sites → keep "Parish" suffix

---

## Language Codes & Display

| Code | Display | Context |
|------|---------|---------|
| `en` | English | Default; not shown as a badge (implied) |
| `es` | Spanish | Badge: "Spanish" or "En Español" |
| `pl` | Polish | Badge: "Polish" or "Po Polsku" |
| `la` | Latin | Badge: "Latin" — may indicate TLM (see below) |
| `pt` | Portuguese | Badge: "Portuguese" |
| `fr` | French | Badge: "French" |
| `asl` | ASL | Badge: "ASL Interpreted" |
| `vi` | Vietnamese | Badge: "Vietnamese" |

**Bilingual services** use `languages: ["es", "en"]` array. Display: "Bilingual (Spanish/English)".

### Traditional Latin Mass (TLM)
- Sensitive topic within the Catholic community. Some bishops restrict it; some communities are devoted to it.
- MassFinder lists TLM where parishes offer it, tagged with `language: "la"`.
- Do NOT editorialize. No commentary on Traditionis Custodes or diocesan restrictions.
- Factual description only: "Latin (Extraordinary Form)" or simply "Latin."
- If notes mention "1962 Missal" or "Extraordinary Form" or "Tridentine," preserve them factually.

---

## Liturgical Seasons

| Season | Approximate Dates | Color | Notes |
|--------|------------------|-------|-------|
| Ordinary Time | Jan–Feb (post-Epiphany), Jun–Nov (post-Pentecost) | Green (not used in app) | Default/no seasonal indicators |
| Lent | Ash Wednesday → Holy Saturday | Purple `#7C3AED` | Lenten chip, seasonal filtering active |
| Easter | Easter Sunday → Pentecost (50 days) | White/Gold (not distinct in app) | |
| Advent | ~4 Sundays before Christmas | Purple/Rose (not yet implemented) | Planned future feature |
| Christmas | Dec 25 → Baptism of the Lord | White/Gold (not yet implemented) | |

**Lent detection** is computed from Easter date using the anonymous Gregorian algorithm (`getEaster()` in index.html). Ash Wednesday = Easter − 46 days. Lent ends Holy Saturday (day before Easter).

The app shows a Lenten chip filter and seasonal services (Stations of the Cross, Gorzkie Żale, etc.) only during Lent.

---

## Clergy Role Hierarchy

Display order when listing clergy:

1. `pastor` — The Pastor (canonical head of the parish)
2. `pastor_and_director` — Pastor & Director (merged role, common in collaborative parishes)
3. `provisional_priest` — Provisional Priest (temporary assignment)
4. `deacon` — Deacon (permanent deacons)
5. `deacon_emeritus` — Deacon Emeritus
6. `deacon_retired` — Deacon (Retired)

**Rules:**
- Store lead priest + one deacon only per parish. Drop parochial vicars, priests in residence, retired clergy.
- Use `clergy` array, never `staff` (legacy field).
- Never fabricate clergy names. If not confirmed from parish website/bulletin, omit.

---

## Geographic Terminology

| Term | Meaning in MassFinder |
|------|----------------------|
| Western New England | The service coverage area: western MA + CT + VT + NH |
| Diocese of Springfield | Roman Catholic Diocese covering western MA |
| Archdiocese of Hartford | Covers CT parishes |
| Diocese of Burlington | Covers VT parishes |
| Diocese of Manchester | Covers NH parishes |
| County | Used for secondary grouping (Berkshire, Hampshire, Hampden, Franklin, etc.) |

---

## Terms to Avoid

| Don't say | Say instead | Why |
|-----------|------------|-----|
| "Last Rites" | "Anointing of the Sick" | Pre-Vatican II term; inaccurate for modern usage |
| "Reconciliation" (in UI) | "Confession" | User familiarity; both are theologically correct but "Confession" is what parishioners search for |
| "Saturday evening Mass" | "Vigil Mass" | Proper liturgical term |
| "Good Friday Mass" | "Good Friday Service" or "Celebration of the Passion" | There is no Mass on Good Friday |
| "Extreme Unction" | "Anointing of the Sick" | Pre-Vatican II |
| "Sunday School" | (varies) | Catholic term is usually "Religious Education" or "Faith Formation" |
| "Minister" / "Reverend" | "Father" (priest), "Deacon" | Catholic honorifics differ from Protestant |
| "Church service" | "Mass" or specific service type | "Church service" is Protestant framing |

---

## Bulletin Parsing Terminology

When reading parish bulletins to extract schedule data:

| Bulletin might say | Map to |
|-------------------|--------|
| "Reconciliation" / "Penance" / "Confessions" | `confession` |
| "Exposition" / "Exposition of the Blessed Sacrament" | `adoration` |
| "Benediction" | `benediction` (separate from adoration) |
| "Novena" + specific name | Check if specific type exists (e.g., `miraculous_medal`), else `novena` |
| "Communion Service" / "Word & Communion" | `communion_service` |
| "Prayer Group" / "Charismatic Prayer" / "Cenacle" | `prayer_group` |
| "Vespers" / "Evening Prayer" | `vespers` |
| "Holy Hour" | `holy_hour` |
| "Stations" / "Way of the Cross" | `stations_of_cross` |
| "Divine Mercy" / "Chaplet" | `divine_mercy` |
