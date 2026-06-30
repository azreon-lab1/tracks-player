// Frontend feature flags / site-wide settings. This is a static site with no
// build step, so there's no real .env to inject values at build time — this
// plain JS file IS the practical equivalent: one place to flip a feature on
// or off, instead of scattering the decision through component code. Loaded
// by every page, before shared.js.

// Controls whether the "Export CSV" button appears in the Compliance Logs
// (reports.html) and Listening Logs (manage-user.html) cards.
const LOG_EXPORT_CONTENT_ENABLED = true;

// player.html — direct ?track=T1 links hide the track list/mode toggle for a
// clean single-track widget view.
const SINGLE_TRACK_HIDES_LIST = true;

// player.html — true = My Reports card shown inline in player.html;
// false = a "Reports" button instead, linking out to reports.html.
const REPORTS_IN_PLAYER = true;

// player.html — fade volume on play/pause to avoid an audible click/pop.
const FADE_AUDIO_ACTIONS = true;

// player.html — default for the "Autoplay" toggle (live in the player UI,
// below Auto-Lock; user choice persists in localStorage ap_autoplay and wins
// over this once set — this is only the first-ever default). true = tapping
// a track plays it as soon as it's ready (current/original behaviour).
// false = tapping a track only loads it (gets ready, Media Session/lock-screen
// controls populated) without starting playback — lets the participant lock
// the phone right after tapping and press play from the lock screen.
const AUTOPLAY_ON_TRACK_TAP = true;

// reports.html — iframe sandbox for the report viewer. true = allow-scripts
// allow-same-origin (needed for in-page anchor nav, sticky nav, CDN scripts
// inside reports; trade-off: a report's JS can reach the parent frame, so
// only safe when uploaded reports are trusted admin-controlled files).
// false = allow-scripts only (stricter, breaks same-origin-dependent reports).
const REPORT_SAME_ORIGIN = true;
