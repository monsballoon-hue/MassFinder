// data-standards-compact.js — Canonical enum arrays for prompt injection
// Single source of truth, extracted from DATA_STANDARDS.md and parish_data.schema.json

module.exports = {
  SERVICE_TYPES: [
    'daily_mass', 'sunday_mass', 'communion_service',
    'confession', 'anointing_of_sick',
    'adoration', 'perpetual_adoration',
    'holy_hour', 'rosary', 'divine_mercy', 'miraculous_medal',
    'stations_of_cross', 'novena', 'benediction', 'vespers',
    'gorzkie_zale', 'devotion', 'blessing', 'prayer_group',
    'holy_thursday_mass', 'good_friday_service',
    'easter_vigil_mass', 'palm_sunday_mass', 'easter_sunday_mass'
  ],
  DAYS: [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    'saturday', 'sunday',
    'first_friday', 'first_saturday',
    'holyday', 'holyday_eve',
    'holy_thursday', 'good_friday', 'holy_saturday',
    'easter_vigil', 'palm_sunday', 'easter_sunday',
    'civil_holiday'
  ],
  EVENT_CATEGORIES: [
    'fish_fry', 'pancake_breakfast', 'potluck', 'dinner_dance',
    'trivia_night', 'movie_night', 'game_night', 'picnic', 'festival',
    'bible_study', 'book_club', 'speaker_series',
    'retreat', 'mission', 'adult_education',
    'youth_group', 'choir', 'senior_group', 'fraternal',
    'performance', 'concert'
  ],
  SEASONAL: [
    'year_round', 'lent', 'advent', 'holy_week',
    'easter_season', 'academic_year', 'summer'
  ]
};
